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
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('parent','student','admin')),email TEXT UNIQUE,username TEXT UNIQUE,secret TEXT NOT NULL,parent_id TEXT REFERENCES users(id),created_at INTEGER NOT NULL,grade INTEGER CHECK(grade IN (2,5,8)),gender TEXT CHECK(gender IN ('male','female')));
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS progress(user_id TEXT PRIMARY KEY REFERENCES users(id),sections TEXT NOT NULL DEFAULT '[]',updated_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS attempts(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),result TEXT NOT NULL,created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS practice(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),answer TEXT NOT NULL,feedback TEXT NOT NULL,created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
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
  const raw = (id) => db.prepare("SELECT * FROM users WHERE id=?").get(id);
  function requireRole(id, roles) {
    const user = raw(id);
    if (!user || !roles.includes(user.role))
      fail("لا تملكين صلاحية لهذا الإجراء.", 403);
    return user;
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
      if (!user || !valid) fail("بيانات الدخول غير صحيحة.", 401);
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
      if (!user || !valid) fail("اسم المستخدم أو رمز الدخول غير صحيح.", 401);
      return safeUser(user);
    },
    createSession(userId) {
      if (!raw(userId)) fail("الحساب غير متاح.", 401);
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
      return row ? safeUser(raw(row.user_id)) : null;
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
      return { published };
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
