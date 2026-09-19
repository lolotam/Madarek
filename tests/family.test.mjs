import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStore } from "../src/server/store.mjs";

const password = "Safe-password-123";
const pin = "12345678";
function child(overrides = {}) {
  return {
    name: "هنا",
    grade: 8,
    gender: "female",
    username: "hana-one",
    pin,
    ...overrides,
  };
}
function parent(overrides = {}) {
  return {
    name: "ولي الأمر",
    email: "family@example.test",
    password,
    children: [],
    ...overrides,
  };
}

test("registerFamily creates parent and children who can loginChild", () => {
  const store = createStore(":memory:");
  try {
    const p = store.registerFamily(
      parent({
        children: [
          child({ username: "hana-a", grade: 2, gender: "male", name: "أحمد" }),
          child({
            username: "hana-b",
            grade: 5,
            gender: "female",
            name: "هنا",
          }),
        ],
      }),
    );
    assert.equal(p.role, "parent");
    assert.equal(p.grade, null);
    assert.equal(p.gender, null);
    const a = store.loginChild("hana-a", pin);
    const b = store.loginChild("hana-b", pin);
    assert.equal(a.name, "أحمد");
    assert.equal(a.grade, 2);
    assert.equal(a.gender, "male");
    assert.equal(a.parentId, p.id);
    assert.equal(b.grade, 5);
    assert.equal(b.gender, "female");
    assert.equal(store.snapshot(p.id).children.length, 2);
  } finally {
    store.close();
  }
});

test("duplicate child username in the form or against an existing account creates nothing", () => {
  const store = createStore(":memory:");
  try {
    store.registerFamily(
      parent({
        email: "first@example.test",
        children: [child({ username: "taken-user" })],
      }),
    );
    assert.throws(
      () =>
        store.registerFamily(
          parent({
            email: "dup-form@example.test",
            children: [
              child({ username: "form-one", name: "الأول" }),
              child({ username: "form-one", name: "الثاني" }),
            ],
          }),
        ),
      (e) =>
        e.message.includes("الطالب ٢") &&
        e.message.includes("اسم المستخدم غير متاح"),
    );
    assert.throws(() => store.loginParent("dup-form@example.test", password));
    assert.throws(() => store.loginChild("form-one", pin));
    assert.throws(
      () =>
        store.registerFamily(
          parent({
            email: "dup-taken@example.test",
            children: [
              child({ username: "still-free", name: "الأول" }),
              child({ username: "taken-user", name: "الثاني" }),
            ],
          }),
        ),
      (e) =>
        e.message.includes("الطالب ٢") &&
        e.message.includes("اسم المستخدم غير متاح"),
    );
    assert.throws(() => store.loginParent("dup-taken@example.test", password));
    assert.throws(() => store.loginChild("still-free", pin));
    const recovered = store.registerFamily(
      parent({
        email: "dup-form@example.test",
        children: [child({ username: "form-one" })],
      }),
    );
    assert.equal(recovered.role, "parent");
    assert.equal(store.loginChild("form-one", pin).username, "form-one");
  } finally {
    store.close();
  }
});

test("invalid grade, gender, or PIN names the failing child row", () => {
  const store = createStore(":memory:");
  try {
    assert.throws(
      () =>
        store.registerFamily(
          parent({
            email: "bad-grade@example.test",
            children: [
              child({ username: "ok-one" }),
              child({ username: "bad-grade", grade: 4 }),
            ],
          }),
        ),
      (e) =>
        e.message.includes("الطالب ٢") &&
        e.message.includes("اختيار الصف مطلوب"),
    );
    assert.throws(
      () =>
        store.registerFamily(
          parent({
            email: "bad-gender@example.test",
            children: [child({ username: "bad-gender", gender: "girl" })],
          }),
        ),
      (e) =>
        e.message.includes("الطالب ١") &&
        e.message.includes("اختيار الجنس مطلوب"),
    );
    assert.throws(
      () =>
        store.registerFamily(
          parent({
            email: "bad-pin@example.test",
            children: [child({ username: "bad-pin", pin: "12ab56" })],
          }),
        ),
      (e) => e.message.includes("الطالب ١") && e.message.includes("رمز الدخول"),
    );
    assert.throws(() => store.loginParent("bad-grade@example.test", password));
    assert.throws(() => store.loginChild("ok-one", pin));
  } finally {
    store.close();
  }
});

test("more than six children is rejected", () => {
  const store = createStore(":memory:");
  try {
    assert.throws(
      () =>
        store.registerFamily(
          parent({
            children: Array.from({ length: 7 }, (_, i) =>
              child({ username: `kid-${i + 1}` }),
            ),
          }),
        ),
      (e) => e.message.includes("ستة"),
    );
    assert.throws(() => store.loginParent("family@example.test", password));
  } finally {
    store.close();
  }
});

test("createChild requires grade and gender", () => {
  const store = createStore(":memory:");
  try {
    const p = store.registerParent({
      name: "ولي الأمر",
      email: "child-fields@example.test",
      password,
    });
    assert.throws(() =>
      store.createChild(p.id, {
        name: "هنا",
        username: "needs-grade",
        pin,
      }),
    );
    const c = store.createChild(p.id, {
      name: "هنا",
      username: "has-grade",
      pin,
      grade: "5",
      gender: "male",
    });
    assert.equal(c.grade, 5);
    assert.equal(c.gender, "male");
  } finally {
    store.close();
  }
});

test("createStore migrates an old users table in place", () => {
  const dir = mkdtempSync(join(tmpdir(), "hana-migrate-"));
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
    assert.equal(data.user.grade, null);
    assert.equal(data.user.gender, null);
    const p = store.registerParent({
      name: "جديد",
      email: "migrated@example.test",
      password,
    });
    const c = store.createChild(p.id, {
      name: "هنا",
      username: "after-migrate",
      pin,
      grade: 8,
      gender: "female",
    });
    assert.equal(c.grade, 8);
    assert.equal(c.gender, "female");
  } finally {
    store.close();
    const expectedPrefix = join(tmpdir(), "hana-migrate-");
    assert.ok(dir.startsWith(expectedPrefix));
    rmSync(dir, { recursive: true, force: true });
  }
});
