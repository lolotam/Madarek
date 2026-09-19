import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStore } from "../src/server/store.mjs";
import {
  decryptSecret,
  encryptSecret,
  parseSettingsEncryptionKey,
} from "../src/server/settings.mjs";

const password = "valid-password-123";
const pin = "12345678";
const TEST_KEY = Buffer.alloc(32, 9).toString("base64");

function withEnv(vars, fn) {
  const saved = {};
  for (const key of Object.keys(vars)) {
    saved[key] = process.env[key];
    if (vars[key] == null) delete process.env[key];
    else process.env[key] = vars[key];
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(vars)) {
      if (saved[key] == null) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

function child(overrides = {}) {
  return {
    name: "هنا",
    grade: 8,
    gender: "female",
    username: "hana-admin",
    pin,
    ...overrides,
  };
}

function makeAdmin(store, email = "admin@example.test") {
  store.registerParent({ name: "مديرة", email, password });
  return store.promoteAdmin(email);
}

function makeFamily(
  store,
  email = "family@example.test",
  username = "kid-one",
) {
  return store.registerFamily({
    name: "ولي الأمر",
    email,
    password,
    children: [child({ username })],
  });
}

test("createStore migrates disabled_at and creates admin_audit", () => {
  const dir = mkdtempSync(join(tmpdir(), "hana-admin-mig-"));
  const path = join(dir, "old.sqlite");
  const old = new DatabaseSync(path);
  old.exec(
    "CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('parent','student','admin')),email TEXT UNIQUE,username TEXT UNIQUE,secret TEXT NOT NULL,parent_id TEXT REFERENCES users(id),created_at INTEGER NOT NULL);",
  );
  old
    .prepare(
      "INSERT INTO users(id,name,role,email,secret,created_at) VALUES(?,?,?,?,?,?)",
    )
    .run(
      "legacy-parent",
      "حساب قديم",
      "parent",
      "legacy@example.test",
      "not-a-login-hash",
      Date.now(),
    );
  old.close();
  const store = createStore(path);
  try {
    const data = store.snapshot("legacy-parent");
    assert.equal(data.user.name, "حساب قديم");
    assert.equal(data.user.disabledAt ?? null, null);
    store.listAdminAudit(makeAdmin(store).id);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("disabled parent and child cannot log in with the same generic messages", () => {
  const store = createStore(":memory:");
  try {
    const admin = makeAdmin(store);
    const parent = makeFamily(store);
    const kid = store.loginChild("kid-one", pin);
    store.setUserDisabled(admin.id, { userId: parent.id, disabled: true });
    assert.throws(
      () => store.loginParent("family@example.test", password),
      (e) => e.status === 401 && e.message === "بيانات الدخول غير صحيحة.",
    );
    assert.equal(store.loginChild("kid-one", pin).id, kid.id);
    store.setUserDisabled(admin.id, { userId: kid.id, disabled: true });
    assert.throws(
      () => store.loginChild("kid-one", pin),
      (e) =>
        e.status === 401 &&
        e.message === "اسم المستخدم أو رمز الدخول غير صحيح.",
    );
  } finally {
    store.close();
  }
});

test("disabling a user revokes sessions and sessionUser treats them as signed out", () => {
  const store = createStore(":memory:");
  try {
    const admin = makeAdmin(store);
    const parent = makeFamily(store);
    const token = store.createSession(parent.id);
    assert.equal(store.sessionUser(token).id, parent.id);
    store.setUserDisabled(admin.id, { userId: parent.id, disabled: true });
    assert.equal(store.sessionUser(token), null);
    store.setUserDisabled(admin.id, { userId: parent.id, disabled: false });
    assert.equal(
      store.loginParent("family@example.test", password).id,
      parent.id,
    );
  } finally {
    store.close();
  }
});

test("an admin cannot disable or delete their own account", () => {
  const store = createStore(":memory:");
  try {
    const admin = makeAdmin(store);
    assert.throws(
      () =>
        store.setUserDisabled(admin.id, { userId: admin.id, disabled: true }),
      (e) => e.status === 400,
    );
    assert.throws(
      () =>
        store.deleteFamily(admin.id, {
          parentId: admin.id,
          confirmEmail: "admin@example.test",
        }),
      (e) => e.status === 400,
    );
  } finally {
    store.close();
  }
});

test("no action may leave zero enabled admins and admins cannot be deleted", () => {
  const store = createStore(":memory:");
  try {
    const admin = makeAdmin(store);
    const other = makeAdmin(store, "second-admin@example.test");
    assert.throws(
      () =>
        store.deleteFamily(admin.id, {
          parentId: other.id,
          confirmEmail: "second-admin@example.test",
        }),
      (e) => e.message.includes("إدارة"),
    );
    store.setUserDisabled(admin.id, { userId: other.id, disabled: true });
    const listed = store.listAdminUsers(admin.id, {
      q: "second-admin@example.test",
      page: 1,
    });
    assert.ok(listed.items[0].user.disabledAt);
    assert.throws(
      () =>
        store.setUserDisabled(admin.id, { userId: admin.id, disabled: true }),
      (e) => e.message.includes("تعطيل") || e.message.includes("إدارة"),
    );
  } finally {
    store.close();
  }
});

test("delete family removes parent, children, sessions, progress, attempts and practice", () => {
  const store = createStore(":memory:");
  try {
    const admin = makeAdmin(store);
    const parent = makeFamily(store);
    const kid = store.loginChild("kid-one", pin);
    store.saveProgress(kid.id, { section: "map" });
    store.savePractice(kid.id, "البروتينات تساعد على إصلاح الأنسجة.");
    store.submit(kid.id, { id: "attempt-family-01", answers: { q1: "macro" } });
    store.createSession(parent.id);
    store.createSession(kid.id);
    assert.throws(
      () =>
        store.deleteFamily(admin.id, {
          parentId: parent.id,
          confirmEmail: "wrong@example.test",
        }),
      (e) => e.status === 400,
    );
    store.deleteFamily(admin.id, {
      parentId: parent.id,
      confirmEmail: "family@example.test",
    });
    assert.throws(() => store.loginParent("family@example.test", password));
    assert.throws(() => store.loginChild("kid-one", pin));
    assert.throws(
      () => store.snapshot(parent.id),
      (e) => e.status === 401,
    );
    assert.throws(
      () => store.snapshot(kid.id),
      (e) => e.status === 401,
    );
  } finally {
    store.close();
  }
});

test("password, PIN, username, email and disable changes revoke that user's sessions", () => {
  const store = createStore(":memory:");
  try {
    const admin = makeAdmin(store);
    const parent = makeFamily(store);
    const kid = store.loginChild("kid-one", pin);
    const parentToken = store.createSession(parent.id);
    const kidToken = store.createSession(kid.id);
    store.updateAdminUser(admin.id, {
      userId: parent.id,
      name: "اسم جديد",
      email: "renamed@example.test",
    });
    assert.equal(store.sessionUser(parentToken), null);
    const parentToken2 = store.createSession(parent.id);
    store.resetAdminSecret(admin.id, {
      userId: parent.id,
      password: "newer-password-99",
    });
    assert.equal(store.sessionUser(parentToken2), null);
    store.updateAdminUser(admin.id, {
      userId: kid.id,
      name: "هنا",
      username: "kid-two",
      grade: 5,
      gender: "female",
    });
    assert.equal(store.sessionUser(kidToken), null);
    const kidToken2 = store.createSession(kid.id);
    store.resetAdminSecret(admin.id, { userId: kid.id, pin: "87654321" });
    assert.equal(store.sessionUser(kidToken2), null);
    assert.equal(store.loginChild("kid-two", "87654321").id, kid.id);
  } finally {
    store.close();
  }
});

test("listAdminUsers searches, paginates families, and includes attempt counts", () => {
  const store = createStore(":memory:");
  try {
    const admin = makeAdmin(store);
    for (let i = 0; i < 21; i++) {
      makeFamily(
        store,
        `page-${String(i).padStart(2, "0")}@example.test`,
        `page-kid-${i}`,
      );
    }
    const first = store.listAdminUsers(admin.id, { q: "", page: 1 });
    assert.equal(first.pageSize, 20);
    assert.equal(first.items.length, 20);
    assert.ok(first.total >= 22);
    const found = store.listAdminUsers(admin.id, { q: "page-kid-3", page: 1 });
    assert.equal(found.items.length, 1);
    assert.equal(found.items[0].kind, "family");
    assert.equal(found.items[0].children[0].username, "page-kid-3");
    const kid = store.loginChild("page-kid-3", pin);
    store.submit(kid.id, { id: "attempt-list-01", answers: { q1: "macro" } });
    const after = store.listAdminUsers(admin.id, { q: "page-kid-3", page: 1 });
    assert.equal(after.items[0].children[0].attemptCount, 1);
  } finally {
    store.close();
  }
});

test("admin family create reuses registerFamily and records audit without secrets", () => {
  const store = createStore(":memory:");
  try {
    const admin = makeAdmin(store);
    const created = store.createAdminFamily(admin.id, {
      name: "أسرة الإدارة",
      email: "created-by-admin@example.test",
      password: "admin-made-password",
      children: [child({ username: "created-kid", pin: "24681357" })],
    });
    assert.equal(created.role, "parent");
    assert.equal(
      store.loginChild("created-kid", "24681357").username,
      "created-kid",
    );
    const audit = store.listAdminAudit(admin.id);
    assert.ok(audit.entries.some((row) => row.action === "families.create"));
    const blob = JSON.stringify(audit.entries);
    assert.equal(blob.includes("admin-made-password"), false);
    assert.equal(blob.includes("24681357"), false);
  } finally {
    store.close();
  }
});

test("non-admin cannot call admin store methods", () => {
  const store = createStore(":memory:");
  try {
    const parent = makeFamily(store);
    assert.throws(
      () => store.listAdminUsers(parent.id, { page: 1 }),
      (e) => e.status === 403,
    );
    assert.throws(
      () => store.getAdminSettings(parent.id),
      (e) => e.status === 403,
    );
    assert.throws(
      () => store.listAdminAudit(parent.id),
      (e) => e.status === 403,
    );
  } finally {
    store.close();
  }
});

test("AES-256-GCM settings encryption round-trips and rejects a missing key", () => {
  withEnv({ SETTINGS_ENCRYPTION_KEY: TEST_KEY }, () => {
    const stored = encryptSecret("sk_live_super_secret_key");
    assert.match(
      stored,
      /^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/,
    );
    assert.equal(decryptSecret(stored), "sk_live_super_secret_key");
    assert.equal(parseSettingsEncryptionKey(TEST_KEY).length, 32);
  });
  withEnv({ SETTINGS_ENCRYPTION_KEY: "" }, () => {
    assert.equal(parseSettingsEncryptionKey(""), null);
    assert.throws(() => encryptSecret("nope"));
  });
  withEnv({ SETTINGS_ENCRYPTION_KEY: "not-a-valid-key" }, () => {
    assert.equal(parseSettingsEncryptionKey("not-a-valid-key"), null);
  });
});

test("admin settings never return plaintext and database wins over env", () => {
  withEnv(
    {
      SETTINGS_ENCRYPTION_KEY: TEST_KEY,
      ELEVENLABS_API_KEY: "env-key-ABCDEFGH",
      ELEVENLABS_VOICE_ID: "env-voice",
      ELEVENLABS_MODEL_ID: "env-model",
      ELEVENLABS_MAX_CHARACTERS: "99",
    },
    () => {
      const store = createStore(":memory:");
      try {
        const admin = makeAdmin(store);
        assert.equal(store.getApiSetting("elevenlabs_voice_id"), "env-voice");
        assert.equal(
          store.getApiSetting("elevenlabs_api_key"),
          "env-key-ABCDEFGH",
        );
        const before = store.getAdminSettings(admin.id);
        assert.equal(before.apiKey.configured, true);
        assert.equal(before.apiKey.source, "env");
        assert.equal(before.apiKey.last4, "EFGH");
        assert.equal("value" in before.apiKey, false);
        assert.ok(!JSON.stringify(before).includes("env-key-ABCDEFGH"));
        store.saveAdminSettings(admin.id, {
          elevenlabs_voice_id: "db-voice",
          elevenlabs_model_id: "db-model",
          elevenlabs_max_characters: 2500,
          elevenlabs_api_key: "db-key-XYZ12345",
        });
        assert.equal(store.getApiSetting("elevenlabs_voice_id"), "db-voice");
        assert.equal(store.getApiSetting("elevenlabs_model_id"), "db-model");
        assert.equal(store.getApiSetting("elevenlabs_max_characters"), 2500);
        assert.equal(
          store.getApiSetting("elevenlabs_api_key"),
          "db-key-XYZ12345",
        );
        const after = store.getAdminSettings(admin.id);
        assert.equal(after.apiKey.source, "database");
        assert.equal(after.apiKey.last4, "2345");
        assert.ok(!JSON.stringify(after).includes("db-key-XYZ12345"));
        const audit = store.listAdminAudit(admin.id);
        assert.ok(!JSON.stringify(audit).includes("db-key-XYZ12345"));
        store.saveAdminSettings(admin.id, { clearApiKey: true });
        assert.equal(
          store.getApiSetting("elevenlabs_api_key"),
          "env-key-ABCDEFGH",
        );
      } finally {
        store.close();
      }
    },
  );
});

test("missing encryption key disables secrets and never stores plaintext", () => {
  withEnv({ SETTINGS_ENCRYPTION_KEY: "" }, () => {
    const store = createStore(":memory:");
    try {
      const admin = makeAdmin(store);
      const view = store.getAdminSettings(admin.id);
      assert.equal(view.encryption.ready, false);
      assert.match(view.encryption.message, /SETTINGS_ENCRYPTION_KEY/);
      assert.throws(() =>
        store.saveAdminSettings(admin.id, {
          elevenlabs_api_key: "should-not-store",
        }),
      );
      store.saveAdminSettings(admin.id, {
        elevenlabs_voice_id: "plain-voice",
      });
      assert.equal(store.getApiSetting("elevenlabs_voice_id"), "plain-voice");
    } finally {
      store.close();
    }
  });
});

test("unreadable ciphertext reports configured but unreadable without leaking data", () => {
  withEnv({ SETTINGS_ENCRYPTION_KEY: TEST_KEY }, () => {
    const store = createStore(":memory:");
    try {
      const admin = makeAdmin(store);
      store.saveAdminSettings(admin.id, {
        elevenlabs_api_key: "secret-key-9999",
      });
      process.env.SETTINGS_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString(
        "base64",
      );
      const view = store.getAdminSettings(admin.id);
      assert.equal(view.apiKey.configured, true);
      assert.equal(view.apiKey.unreadable, true);
      assert.ok(!JSON.stringify(view).includes("secret-key-9999"));
      assert.ok(!JSON.stringify(view).includes("v1:"));
    } finally {
      store.close();
    }
  });
});

test("publish still requires admin and is recorded in the audit log", () => {
  const store = createStore(":memory:");
  try {
    const parent = makeFamily(store);
    assert.throws(() => store.publish(parent.id, false));
    const admin = makeAdmin(store);
    store.publish(admin.id, false);
    assert.equal(store.isPublished(), false);
    const audit = store.listAdminAudit(admin.id);
    assert.ok(audit.entries.some((row) => row.action === "content.publish"));
  } finally {
    store.close();
  }
});

test("recordAudioReview requires admin and writes approve/reject without a reason", () => {
  const store = createStore(":memory:");
  try {
    const parent = makeFamily(store);
    assert.throws(
      () =>
        store.recordAudioReview(parent.id, {
          segmentId: "map.intro",
          hash: "aaaaaaaaaaaaaaaa",
          decision: "approve",
        }),
      (e) => e.status === 403,
    );
    const admin = makeAdmin(store);
    store.recordAudioReview(admin.id, {
      segmentId: "map.intro",
      hash: "aaaaaaaaaaaaaaaa",
      decision: "approve",
    });
    store.recordAudioReview(admin.id, {
      segmentId: "explore.groups",
      hash: "bbbbbbbbbbbbbbbb",
      decision: "reject",
      reason: "نطق المصطلح غير واضح ويجب ألا يُحفظ",
    });
    const { entries } = store.listAdminAudit(admin.id);
    const reviews = entries.filter((row) => row.action === "audio.review");
    assert.equal(reviews.length, 2);
    const approve = reviews.find((row) => row.detail.decision === "approve");
    const reject = reviews.find((row) => row.detail.decision === "reject");
    assert.deepEqual(approve.detail, {
      segmentId: "map.intro",
      hash: "aaaaaaaaaaaaaaaa",
      decision: "approve",
    });
    assert.deepEqual(reject.detail, {
      segmentId: "explore.groups",
      hash: "bbbbbbbbbbbbbbbb",
      decision: "reject",
    });
    const blob = JSON.stringify(entries);
    assert.equal(blob.includes("نطق المصطلح غير واضح"), false);
    assert.equal(blob.includes("reason"), false);
  } finally {
    store.close();
  }
});
