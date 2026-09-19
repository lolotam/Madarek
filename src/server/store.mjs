import { DatabaseSync } from "node:sqlite";
import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { grade, modelReason } from "./questions.mjs";
import {
  decryptSecret,
  encryptSecret,
  encryptionStatus,
  secretLast4,
} from "./settings.mjs";

export function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
const safeUser = (u) =>
  u
    ? {
        id: u.id,
        name: u.name,
        role: u.role,
        username: u.username,
        parentId: u.parent_id,
        grade: u.grade ?? null,
        gender: u.gender ?? null,
      }
    : null;
const CHILD_INDEX = ["١", "٢", "٣", "٤", "٥", "٦"];
function childFail(index, message, status = 400) {
  fail(`الطالب ${CHILD_INDEX[index]}: ${message}`, status);
}
function parseGrade(value) {
  const n =
    typeof value === "number" && Number.isInteger(value)
      ? value
      : typeof value === "string" && /^(2|5|8)$/.test(value.trim())
        ? Number(value.trim())
        : NaN;
  if (n !== 2 && n !== 5 && n !== 8)
    fail("اختيار الصف مطلوب: الثاني أو الخامس أو الثامن.");
  return n;
}
function parseGender(value) {
  if (value !== "male" && value !== "female") fail("اختيار الجنس مطلوب.");
  return value;
}
function readChild(input, index) {
  const run = () => {
    if (!input || typeof input !== "object" || Array.isArray(input))
      fail("تحقّقي من الحقول المطلوبة وطولها.");
    const name = field(input.name, 60),
      username = field(input.username, 32).toLowerCase(),
      pin = field(input.pin, 12),
      grade = parseGrade(input.grade),
      gender = parseGender(input.gender);
    if (!/^[\p{L}\p{N}_-]{3,32}$/u.test(username))
      fail("اسم المستخدم 3–32 حرفًا دون مسافات.");
    if (!/^\d{6,12}$/.test(pin)) fail("رمز الدخول من 6 إلى 12 رقمًا.");
    return { name, grade, gender, username, pin };
  };
  if (index == null) return run();
  try {
    return run();
  } catch (e) {
    if (e.status) childFail(index, e.message, e.status);
    throw e;
  }
}
const digest = (s) => createHash("sha256").update(s).digest("hex");
function hash(secret) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(secret, salt, 64).toString("hex");
}
function verify(secret, stored) {
  const [salt, key] = stored.split(":");
  return timingSafeEqual(scryptSync(secret, salt, 64), Buffer.from(key, "hex"));
}
function field(value, max = 100) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    fail("تحقّقي من الحقول المطلوبة وطولها.");
  return value.trim();
}
export function createStore(filename) {
  if (filename !== ":memory:")
    mkdirSync(dirname(filename), { recursive: true });
  // Build workers and the dev server open this file concurrently; wait for
  // the write lock instead of failing immediately with SQLITE_BUSY.
  const db = new DatabaseSync(filename, { timeout: 5000 });
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('parent','student','admin')),email TEXT UNIQUE,username TEXT UNIQUE,secret TEXT NOT NULL,parent_id TEXT REFERENCES users(id),created_at INTEGER NOT NULL,grade INTEGER CHECK(grade IN (2,5,8)),gender TEXT CHECK(gender IN ('male','female')),disabled_at INTEGER);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS progress(user_id TEXT PRIMARY KEY REFERENCES users(id),sections TEXT NOT NULL DEFAULT '[]',updated_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS attempts(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),result TEXT NOT NULL,created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS practice(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),answer TEXT NOT NULL,feedback TEXT NOT NULL,created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS admin_audit(id TEXT PRIMARY KEY,admin_id TEXT NOT NULL,action TEXT NOT NULL,target_user_id TEXT,detail TEXT,created_at INTEGER NOT NULL);
    INSERT OR IGNORE INTO settings(key,value) VALUES('published','true');`);
  const userColumns = new Set(
    db
      .prepare("PRAGMA table_info(users)")
      .all()
      .map((c) => c.name),
  );
  if (!userColumns.has("grade"))
    db.exec(
      "ALTER TABLE users ADD COLUMN grade INTEGER CHECK(grade IN (2,5,8))",
    );
  if (!userColumns.has("gender"))
    db.exec(
      "ALTER TABLE users ADD COLUMN gender TEXT CHECK(gender IN ('male','female'))",
    );
  if (!userColumns.has("disabled_at"))
    db.exec("ALTER TABLE users ADD COLUMN disabled_at INTEGER");
  const raw = (id) => db.prepare("SELECT * FROM users WHERE id=?").get(id);
  function requireRole(id, roles) {
    const user = raw(id);
    if (!user || user.disabled_at || !roles.includes(user.role))
      fail("لا تملكين صلاحية لهذا الإجراء.", 403);
    return user;
  }
  function revokeUserSessions(userId) {
    db.prepare("DELETE FROM sessions WHERE user_id=?").run(userId);
  }
  function enabledAdminCount() {
    return db
      .prepare(
        "SELECT COUNT(*) AS n FROM users WHERE role='admin' AND disabled_at IS NULL",
      )
      .get().n;
  }
  function writeAudit(adminId, action, targetUserId, detail) {
    db.prepare(
      "INSERT INTO admin_audit(id,admin_id,action,target_user_id,detail,created_at) VALUES(?,?,?,?,?,?)",
    ).run(
      randomUUID(),
      adminId,
      action,
      targetUserId,
      detail == null
        ? null
        : typeof detail === "string"
          ? detail
          : JSON.stringify(detail),
      Date.now(),
    );
  }
  function adminUser(u) {
    if (!u) return null;
    const attempts = db
      .prepare("SELECT COUNT(*) AS n FROM attempts WHERE user_id=?")
      .get(u.id).n;
    return {
      id: u.id,
      name: u.name,
      role: u.role,
      email: u.email ?? null,
      username: u.username ?? null,
      parentId: u.parent_id,
      grade: u.grade ?? null,
      gender: u.gender ?? null,
      createdAt: u.created_at,
      disabledAt: u.disabled_at ?? null,
      attemptCount: attempts,
    };
  }
  function parseEmail(value) {
    const email = field(value, 200).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      fail("أدخلي بريدًا إلكترونيًا صحيحًا.");
    return email;
  }
  function parseUsername(value) {
    const username = field(value, 32).toLowerCase();
    if (!/^[\p{L}\p{N}_-]{3,32}$/u.test(username))
      fail("اسم المستخدم 3–32 حرفًا دون مسافات.");
    return username;
  }
  function putSetting(key, value) {
    db.prepare(
      "INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    ).run(key, value);
  }
  function deleteSetting(key) {
    db.prepare("DELETE FROM settings WHERE key=?").run(key);
  }
  function settingRow(key) {
    return db.prepare("SELECT value FROM settings WHERE key=?").get(key);
  }
  const API_SETTING_ENV = {
    elevenlabs_voice_id: "ELEVENLABS_VOICE_ID",
    elevenlabs_model_id: "ELEVENLABS_MODEL_ID",
    elevenlabs_max_characters: "ELEVENLABS_MAX_CHARACTERS",
    elevenlabs_api_key: "ELEVENLABS_API_KEY",
  };
  function readApiKeyMeta() {
    const row = settingRow("elevenlabs_api_key");
    if (row?.value) {
      try {
        const plain = decryptSecret(row.value);
        return {
          configured: true,
          source: "database",
          last4: secretLast4(plain),
        };
      } catch {
        return {
          configured: true,
          source: "database",
          last4: null,
          unreadable: true,
        };
      }
    }
    const envKey = process.env.ELEVENLABS_API_KEY?.trim() || "";
    if (envKey) {
      return { configured: true, source: "env", last4: secretLast4(envKey) };
    }
    return { configured: false, source: "none", last4: null };
  }
  const childAttempts = (id) =>
    db
      .prepare(
        "SELECT result,created_at FROM attempts WHERE user_id=? ORDER BY created_at DESC",
      )
      .all(id)
      .map((r) => ({ ...JSON.parse(r.result), createdAt: r.created_at }));
  function childSnapshot(id) {
    const row = db.prepare("SELECT * FROM progress WHERE user_id=?").get(id);
    return {
      user: safeUser(raw(id)),
      progress: {
        sections: row ? JSON.parse(row.sections) : [],
        updatedAt: row?.updated_at ?? null,
      },
      attempts: childAttempts(id),
      practice: db
        .prepare(
          "SELECT answer,feedback,created_at AS createdAt FROM practice WHERE user_id=? ORDER BY created_at DESC LIMIT 30",
        )
        .all(id)
        .map((row) => ({ ...row })),
    };
  }
  const api = {
    close() {
      db.close();
    },
    publicUser: safeUser,
    registerFamily(input) {
      const name = field(input.name, 60),
        email = field(input.email, 200).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        fail("أدخلي بريدًا إلكترونيًا صحيحًا.");
      const password = field(input.password, 128);
      if (password.length < 10) fail("كلمة المرور لا تقل عن 10 أحرف.");
      const rawChildren = input.children;
      if (rawChildren != null && !Array.isArray(rawChildren))
        fail("بيانات الأبناء غير صحيحة.");
      const list = rawChildren ?? [];
      if (list.length > 6) fail("يمكن إضافة ستة أبناء كحد أقصى.");
      const children = list.map((row, index) => readChild(row, index));
      const seen = new Set();
      for (let i = 0; i < children.length; i++) {
        const username = children[i].username;
        if (
          seen.has(username) ||
          db.prepare("SELECT id FROM users WHERE username=?").get(username)
        )
          childFail(i, "اسم المستخدم غير متاح. اختاري اسمًا آخر.");
        seen.add(username);
      }
      const id = randomUUID();
      db.exec("BEGIN");
      try {
        try {
          db.prepare(
            "INSERT INTO users(id,name,role,email,secret,created_at) VALUES(?,?,?,?,?,?)",
          ).run(id, name, "parent", email, hash(password), Date.now());
        } catch (e) {
          if (String(e).includes("UNIQUE"))
            fail("تعذّر التسجيل بهذه البيانات. جرّبي تسجيل الدخول.");
          throw e;
        }
        const insertChild = db.prepare(
          "INSERT INTO users(id,name,role,username,secret,parent_id,created_at,grade,gender) VALUES(?,?,?,?,?,?,?,?,?)",
        );
        for (let i = 0; i < children.length; i++) {
          const c = children[i];
          try {
            insertChild.run(
              randomUUID(),
              c.name,
              "student",
              c.username,
              hash(c.pin),
              id,
              Date.now(),
              c.grade,
              c.gender,
            );
          } catch (e) {
            if (String(e).includes("UNIQUE"))
              childFail(i, "اسم المستخدم غير متاح. اختاري اسمًا آخر.");
            throw e;
          }
        }
        db.exec("COMMIT");
      } catch (e) {
        try {
          db.exec("ROLLBACK");
        } catch {
          /* transaction already closed */
        }
        throw e;
      }
      return safeUser(raw(id));
    },
    registerParent(input) {
      return api.registerFamily({
        name: input.name,
        email: input.email,
        password: input.password,
        children: [],
      });
    },
    loginParent(email, password) {
      const user = db
        .prepare(
          "SELECT * FROM users WHERE email=? AND role IN ('parent','admin')",
        )
        .get(field(email, 200).toLowerCase());
      const valid = verify(field(password, 128), user?.secret ?? dummyHash);
      if (!user || !valid || user.disabled_at)
        fail("بيانات الدخول غير صحيحة.", 401);
      return safeUser(user);
    },
    createChild(parentId, input) {
      requireRole(parentId, ["parent"]);
      const child = readChild(input);
      const id = randomUUID();
      try {
        db.prepare(
          "INSERT INTO users(id,name,role,username,secret,parent_id,created_at,grade,gender) VALUES(?,?,?,?,?,?,?,?,?)",
        ).run(
          id,
          child.name,
          "student",
          child.username,
          hash(child.pin),
          parentId,
          Date.now(),
          child.grade,
          child.gender,
        );
      } catch (e) {
        if (String(e).includes("UNIQUE"))
          fail("اسم المستخدم غير متاح. اختاري اسمًا آخر.");
        throw e;
      }
      return safeUser(raw(id));
    },
    resetChildPin(parentId, childId, pin) {
      api.getChild(parentId, childId);
      if (typeof pin !== "string" || !/^\d{6,12}$/.test(pin))
        fail("رمز الدخول من 6 إلى 12 رقمًا.");
      db.prepare("UPDATE users SET secret=? WHERE id=?").run(
        hash(pin),
        childId,
      );
      db.prepare("DELETE FROM sessions WHERE user_id=?").run(childId);
      return { ok: true };
    },
    getChild(parentId, childId) {
      requireRole(parentId, ["parent"]);
      const child = raw(childId);
      if (!child || child.parent_id !== parentId) fail("الملف غير متاح.", 404);
      return safeUser(child);
    },
    loginChild(username, pin) {
      const user = db
        .prepare("SELECT * FROM users WHERE username=? AND role='student'")
        .get(field(username, 32).toLowerCase());
      const valid = verify(field(pin, 12), user?.secret ?? dummyHash);
      if (!user || !valid || user.disabled_at)
        fail("اسم المستخدم أو رمز الدخول غير صحيح.", 401);
      return safeUser(user);
    },
    createSession(userId) {
      const account = raw(userId);
      if (!account || account.disabled_at) fail("الحساب غير متاح.", 401);
      const token = randomBytes(32).toString("hex");
      db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
      db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
        digest(token),
        userId,
        Date.now() + 7 * 86400000,
      );
      return token;
    },
    sessionUser(token) {
      if (typeof token !== "string" || token.length !== 64) return null;
      const row = db
        .prepare("SELECT user_id FROM sessions WHERE token=? AND expires>?")
        .get(digest(token), Date.now());
      if (!row) return null;
      const user = raw(row.user_id);
      if (!user || user.disabled_at) return null;
      return safeUser(user);
    },
    revokeSession(token) {
      if (token)
        db.prepare("DELETE FROM sessions WHERE token=?").run(digest(token));
    },
    rateLimit(key) {
      const now = Date.now();
      db.prepare("DELETE FROM limits WHERE expires<?").run(now);
      const row = db.prepare("SELECT * FROM limits WHERE key=?").get(key);
      if (row && row.count >= 12)
        fail("محاولات كثيرة. انتظري عشر دقائق ثم حاولي مجددًا.", 429);
      if (row)
        db.prepare("UPDATE limits SET count=count+1 WHERE key=?").run(key);
      else
        db.prepare("INSERT INTO limits VALUES(?,?,?)").run(
          key,
          1,
          now + 600000,
        );
    },
    saveProgress(userId, { section }) {
      requireRole(userId, ["student"]);
      if (!["map", "explore", "practice", "quiz"].includes(section))
        fail("مقطع غير معروف.");
      const row = db
        .prepare("SELECT sections FROM progress WHERE user_id=?")
        .get(userId);
      const sections = new Set(row ? JSON.parse(row.sections) : []);
      sections.add(section);
      db.prepare(
        "INSERT INTO progress VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET sections=excluded.sections,updated_at=excluded.updated_at",
      ).run(userId, JSON.stringify([...sections]), Date.now());
      return { sections: [...sections] };
    },
    submit(userId, { id, answers }) {
      requireRole(userId, ["student"]);
      if (typeof id !== "string" || !/^[\w-]{10,80}$/.test(id))
        fail("معرّف المحاولة غير صحيح.");
      const existing = db.prepare("SELECT * FROM attempts WHERE id=?").get(id);
      if (existing) {
        if (existing.user_id !== userId) fail("المحاولة غير متاحة.", 403);
        return JSON.parse(existing.result);
      }
      if (!answers || typeof answers !== "object" || Array.isArray(answers))
        fail("الإجابات غير صحيحة.");
      const result = { ...grade(answers), id };
      db.prepare("INSERT INTO attempts VALUES(?,?,?,?)").run(
        id,
        userId,
        JSON.stringify(result),
        Date.now(),
      );
      api.saveProgress(userId, { section: "quiz" });
      return result;
    },
    savePractice(userId, answer) {
      requireRole(userId, ["student"]);
      answer = field(answer, 1500);
      db.prepare("INSERT INTO practice VALUES(?,?,?,?,?)").run(
        randomUUID(),
        userId,
        answer,
        modelReason,
        Date.now(),
      );
      return { mode: "model_answer", feedback: modelReason };
    },
    snapshot(userId) {
      const user = raw(userId);
      if (!user) fail("يلزم تسجيل الدخول.", 401);
      if (user.role === "student") return childSnapshot(userId);
      if (user.role === "parent")
        return {
          user: safeUser(user),
          children: db
            .prepare(
              "SELECT id FROM users WHERE parent_id=? AND role='student'",
            )
            .all(userId)
            .map((c) => ({ ...childSnapshot(c.id) })),
        };
      return {
        user: safeUser(user),
        stats: {
          parents: db
            .prepare("SELECT COUNT(*) AS n FROM users WHERE role='parent'")
            .get().n,
          students: db
            .prepare("SELECT COUNT(*) AS n FROM users WHERE role='student'")
            .get().n,
          attempts: db.prepare("SELECT COUNT(*) AS n FROM attempts").get().n,
        },
        published: api.isPublished(),
      };
    },
    isPublished() {
      return (
        db.prepare("SELECT value FROM settings WHERE key='published'").get()
          .value === "true"
      );
    },
    publish(userId, published) {
      requireRole(userId, ["admin"]);
      if (typeof published !== "boolean") fail("حالة النشر غير صحيحة.");
      db.prepare("UPDATE settings SET value=? WHERE key='published'").run(
        String(published),
      );
      writeAudit(userId, "content.publish", null, { published });
      return { published };
    },
    getApiSetting(name) {
      if (!(name in API_SETTING_ENV)) fail("إعداد غير معروف.");
      const row = settingRow(name);
      if (name === "elevenlabs_api_key") {
        if (row?.value) {
          try {
            const plain = decryptSecret(row.value);
            if (plain) return plain;
          } catch {
            /* fall through to env; never expose ciphertext */
          }
        }
        return process.env.ELEVENLABS_API_KEY ?? "";
      }
      if (name === "elevenlabs_max_characters") {
        if (
          row?.value != null &&
          row.value !== "" &&
          /^[0-9]+$/.test(row.value)
        ) {
          const n = Number(row.value);
          if (n >= 0 && n <= 1_000_000) return n;
        }
        const rawEnv = process.env.ELEVENLABS_MAX_CHARACTERS;
        if (rawEnv && /^[0-9]+$/.test(rawEnv.trim()))
          return Number(rawEnv.trim());
        return null;
      }
      if (row?.value != null && String(row.value).trim())
        return String(row.value).trim();
      return process.env[API_SETTING_ENV[name]]?.trim() || "";
    },
    listAdminUsers(adminId, input = {}) {
      requireRole(adminId, ["admin"]);
      const q = typeof input.q === "string" ? input.q.trim().toLowerCase() : "";
      const page = Math.max(
        1,
        Number.parseInt(String(input.page ?? 1), 10) || 1,
      );
      const pageSize = 20;
      const users = db
        .prepare("SELECT * FROM users ORDER BY created_at DESC")
        .all();
      const match = (u) =>
        !q ||
        [u.name, u.email, u.username].some(
          (value) => value && String(value).toLowerCase().includes(q),
        );
      const byId = new Map(users.map((u) => [u.id, u]));
      const topIds = new Set();
      for (const u of users) {
        if (!match(u)) continue;
        if (u.role === "student" && u.parent_id) topIds.add(u.parent_id);
        else topIds.add(u.id);
      }
      const groups = [...topIds]
        .map((id) => byId.get(id))
        .filter((u) => u && (u.role === "parent" || u.role === "admin"))
        .sort((a, b) => b.created_at - a.created_at);
      const total = groups.length;
      const slice = groups.slice((page - 1) * pageSize, page * pageSize);
      const items = slice.map((u) => {
        if (u.role === "admin") return { kind: "admin", user: adminUser(u) };
        const children = users
          .filter((c) => c.parent_id === u.id && c.role === "student")
          .sort((a, b) => a.created_at - b.created_at)
          .map(adminUser);
        return { kind: "family", parent: adminUser(u), children };
      });
      return { page, pageSize, total, items };
    },
    updateAdminUser(adminId, input) {
      requireRole(adminId, ["admin"]);
      if (!input || typeof input !== "object") fail("بيانات غير صحيحة.");
      const target = raw(input.userId);
      if (!target) fail("الحساب غير متاح.", 404);
      const changed = [];
      if (target.role === "student") {
        const name = field(input.name, 60);
        const username = parseUsername(input.username);
        const nextGrade = parseGrade(input.grade);
        const nextGender = parseGender(input.gender);
        const usernameChanged = username !== target.username;
        if (usernameChanged) {
          const taken = db
            .prepare("SELECT id FROM users WHERE username=? AND id!=?")
            .get(username, target.id);
          if (taken) fail("اسم المستخدم غير متاح. اختاري اسمًا آخر.");
        }
        try {
          db.prepare(
            "UPDATE users SET name=?,username=?,grade=?,gender=? WHERE id=?",
          ).run(name, username, nextGrade, nextGender, target.id);
        } catch (e) {
          if (String(e).includes("UNIQUE"))
            fail("اسم المستخدم غير متاح. اختاري اسمًا آخر.");
          throw e;
        }
        if (usernameChanged) {
          revokeUserSessions(target.id);
          changed.push("username");
        }
        if (name !== target.name) changed.push("name");
        if (nextGrade !== target.grade) changed.push("grade");
        if (nextGender !== target.gender) changed.push("gender");
      } else {
        const name = field(input.name, 60);
        const email = parseEmail(input.email);
        const emailChanged = email !== target.email;
        if (emailChanged) {
          const taken = db
            .prepare("SELECT id FROM users WHERE email=? AND id!=?")
            .get(email, target.id);
          if (taken) fail("هذا البريد الإلكتروني غير متاح.");
        }
        try {
          db.prepare("UPDATE users SET name=?,email=? WHERE id=?").run(
            name,
            email,
            target.id,
          );
        } catch (e) {
          if (String(e).includes("UNIQUE"))
            fail("هذا البريد الإلكتروني غير متاح.");
          throw e;
        }
        if (emailChanged) {
          revokeUserSessions(target.id);
          changed.push("email");
        }
        if (name !== target.name) changed.push("name");
      }
      writeAudit(adminId, "users.update", target.id, {
        fields: changed,
        role: target.role,
      });
      return adminUser(raw(target.id));
    },
    resetAdminSecret(adminId, input) {
      requireRole(adminId, ["admin"]);
      if (!input || typeof input !== "object") fail("بيانات غير صحيحة.");
      const target = raw(input.userId);
      if (!target) fail("الحساب غير متاح.", 404);
      if (target.role === "student") {
        if (typeof input.pin !== "string" || !/^\d{6,12}$/.test(input.pin))
          fail("رمز الدخول من 6 إلى 12 رقمًا.");
        db.prepare("UPDATE users SET secret=? WHERE id=?").run(
          hash(input.pin),
          target.id,
        );
        writeAudit(adminId, "users.reset-secret", target.id, { kind: "pin" });
      } else {
        const next = field(input.password, 128);
        if (next.length < 10) fail("كلمة المرور لا تقل عن 10 أحرف.");
        db.prepare("UPDATE users SET secret=? WHERE id=?").run(
          hash(next),
          target.id,
        );
        writeAudit(adminId, "users.reset-secret", target.id, {
          kind: "password",
        });
      }
      revokeUserSessions(target.id);
      return { ok: true };
    },
    setUserDisabled(adminId, input) {
      requireRole(adminId, ["admin"]);
      if (!input || typeof input !== "object") fail("بيانات غير صحيحة.");
      if (typeof input.disabled !== "boolean") fail("حالة الحساب غير صحيحة.");
      const target = raw(input.userId);
      if (!target) fail("الحساب غير متاح.", 404);
      if (target.id === adminId) fail("لا يمكنكِ تعطيل حسابك.");
      if (target.role === "admin" && input.disabled) {
        const enabled = enabledAdminCount();
        const alreadyDisabled = Boolean(target.disabled_at);
        if (!alreadyDisabled && enabled <= 1)
          fail("يجب أن يبقى حساب إدارة مفعّل واحد على الأقل.");
      }
      const disabledAt = input.disabled ? Date.now() : null;
      db.prepare("UPDATE users SET disabled_at=? WHERE id=?").run(
        disabledAt,
        target.id,
      );
      revokeUserSessions(target.id);
      writeAudit(
        adminId,
        input.disabled ? "users.disable" : "users.enable",
        target.id,
        { role: target.role },
      );
      return adminUser(raw(target.id));
    },
    deleteFamily(adminId, input) {
      requireRole(adminId, ["admin"]);
      if (!input || typeof input !== "object") fail("بيانات غير صحيحة.");
      const parent = raw(input.parentId);
      if (!parent) fail("الأسرة غير متاحة.", 404);
      if (parent.id === adminId) fail("لا يمكنكِ حذف حسابك.");
      if (parent.role !== "parent")
        fail("لا يمكن حذف حسابات الإدارة من هذه الواجهة.");
      const confirmEmail =
        typeof input.confirmEmail === "string"
          ? input.confirmEmail.trim().toLowerCase()
          : "";
      if (!parent.email || confirmEmail !== parent.email)
        fail("اكتبي البريد الإلكتروني لولي الأمر للتأكيد.");
      const children = db
        .prepare("SELECT id FROM users WHERE parent_id=? AND role='student'")
        .all(parent.id);
      const ids = [parent.id, ...children.map((c) => c.id)];
      const placeholders = ids.map(() => "?").join(",");
      db.exec("BEGIN");
      try {
        db.prepare(
          `DELETE FROM sessions WHERE user_id IN (${placeholders})`,
        ).run(...ids);
        db.prepare(
          `DELETE FROM progress WHERE user_id IN (${placeholders})`,
        ).run(...ids);
        db.prepare(
          `DELETE FROM attempts WHERE user_id IN (${placeholders})`,
        ).run(...ids);
        db.prepare(
          `DELETE FROM practice WHERE user_id IN (${placeholders})`,
        ).run(...ids);
        db.prepare("DELETE FROM users WHERE parent_id=?").run(parent.id);
        db.prepare("DELETE FROM users WHERE id=?").run(parent.id);
        writeAudit(adminId, "families.delete", parent.id, {
          email: parent.email,
          children: children.length,
        });
        db.exec("COMMIT");
      } catch (e) {
        try {
          db.exec("ROLLBACK");
        } catch {
          /* transaction already closed */
        }
        throw e;
      }
      return { ok: true };
    },
    createAdminFamily(adminId, input) {
      requireRole(adminId, ["admin"]);
      const parent = api.registerFamily(input);
      writeAudit(adminId, "families.create", parent.id, {
        email: parent.email ?? input.email,
        children: Array.isArray(input?.children) ? input.children.length : 0,
      });
      return parent;
    },
    getAdminSettings(adminId) {
      requireRole(adminId, ["admin"]);
      const voice = settingRow("elevenlabs_voice_id")?.value ?? "";
      const model = settingRow("elevenlabs_model_id")?.value ?? "";
      const maxRaw = settingRow("elevenlabs_max_characters")?.value;
      let maxCharacters = null;
      if (maxRaw != null && /^[0-9]+$/.test(maxRaw)) {
        const n = Number(maxRaw);
        if (n >= 0 && n <= 1_000_000) maxCharacters = n;
      }
      return {
        encryption: encryptionStatus(),
        elevenlabs_voice_id: voice,
        elevenlabs_model_id: model,
        elevenlabs_max_characters: maxCharacters,
        apiKey: readApiKeyMeta(),
      };
    },
    saveAdminSettings(adminId, input) {
      requireRole(adminId, ["admin"]);
      if (!input || typeof input !== "object") fail("بيانات غير صحيحة.");
      const fields = [];
      if ("elevenlabs_voice_id" in input) {
        if (
          input.elevenlabs_voice_id == null ||
          input.elevenlabs_voice_id === ""
        )
          deleteSetting("elevenlabs_voice_id");
        else {
          const value = field(String(input.elevenlabs_voice_id), 100);
          putSetting("elevenlabs_voice_id", value);
        }
        fields.push("elevenlabs_voice_id");
      }
      if ("elevenlabs_model_id" in input) {
        if (
          input.elevenlabs_model_id == null ||
          input.elevenlabs_model_id === ""
        )
          deleteSetting("elevenlabs_model_id");
        else {
          const value = field(String(input.elevenlabs_model_id), 100);
          putSetting("elevenlabs_model_id", value);
        }
        fields.push("elevenlabs_model_id");
      }
      if ("elevenlabs_max_characters" in input) {
        if (
          input.elevenlabs_max_characters == null ||
          input.elevenlabs_max_characters === ""
        ) {
          deleteSetting("elevenlabs_max_characters");
        } else {
          const n = Number(input.elevenlabs_max_characters);
          if (!Number.isInteger(n) || n < 0 || n > 1_000_000)
            fail("الحد الأقصى للمحارف رقم صحيح بين 0 و1,000,000.");
          putSetting("elevenlabs_max_characters", String(n));
        }
        fields.push("elevenlabs_max_characters");
      }
      let apiKeyAction = null;
      if (input.clearApiKey) {
        deleteSetting("elevenlabs_api_key");
        apiKeyAction = "cleared";
      } else if (
        typeof input.elevenlabs_api_key === "string" &&
        input.elevenlabs_api_key
      ) {
        if (input.elevenlabs_api_key.length > 500)
          fail("تحقّقي من الحقول المطلوبة وطولها.");
        putSetting(
          "elevenlabs_api_key",
          encryptSecret(input.elevenlabs_api_key),
        );
        apiKeyAction = "replaced";
      }
      if (!fields.length && !apiKeyAction) fail("لا توجد تغييرات للحفظ.");
      writeAudit(adminId, "settings.update", null, {
        fields,
        ...(apiKeyAction ? { apiKey: apiKeyAction } : {}),
      });
      return api.getAdminSettings(adminId);
    },
    recordAudioReview(adminId, input) {
      requireRole(adminId, ["admin"]);
      if (!input || typeof input !== "object") fail("بيانات غير صحيحة.");
      const segmentId = field(input.segmentId, 80);
      const hash = field(input.hash, 16);
      if (input.decision !== "approve" && input.decision !== "reject") {
        fail("قرار غير صحيح.");
      }
      writeAudit(adminId, "audio.review", null, {
        segmentId,
        hash,
        decision: input.decision,
      });
      return { ok: true };
    },
    listAdminAudit(adminId) {
      requireRole(adminId, ["admin"]);
      const entries = db
        .prepare(
          "SELECT a.id,a.admin_id AS adminId,a.action,a.target_user_id AS targetUserId,a.detail,a.created_at AS createdAt,u.name AS adminName FROM admin_audit a LEFT JOIN users u ON u.id=a.admin_id ORDER BY a.created_at DESC LIMIT 50",
        )
        .all()
        .map((row) => ({
          ...row,
          detail: row.detail
            ? (() => {
                try {
                  return JSON.parse(row.detail);
                } catch {
                  return row.detail;
                }
              })()
            : null,
        }));
      return { entries };
    },
    promoteAdmin(email) {
      const user = db
        .prepare("SELECT * FROM users WHERE email=?")
        .get(email.toLowerCase());
      if (!user) fail("أنشئ حساب ولي أمر أولًا.");
      if (db.prepare("SELECT id FROM users WHERE parent_id=?").get(user.id))
        fail("استخدم حساب إدارة منفصلًا عن حساب الأسرة.");
      db.prepare("UPDATE users SET role='admin' WHERE id=?").run(user.id);
      db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
      return safeUser(raw(user.id));
    },
  };
  return api;
}
const dummyHash = hash("dummy-login-not-a-real-account");
