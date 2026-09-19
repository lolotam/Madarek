import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStore } from "../src/server/store.mjs";

test('local admin promotion enables publication control and revokes old sessions',()=>{
 const s=createStore(':memory:');try{
  const p=s.registerParent({name:'Administrator',email:'admin@example.test',password:'valid-password-123'});
  const token=s.createSession(p.id);s.promoteAdmin('admin@example.test');
  assert.equal(s.sessionUser(token),null);
  const admin=s.loginParent('admin@example.test','valid-password-123');
  assert.equal(admin.role,'admin');s.publish(admin.id,false);assert.equal(s.isPublished(),false);s.publish(admin.id,true);assert.equal(s.snapshot(admin.id).published,true);
 }finally{s.close();}
});

test("public signup cannot select admin role and parent cannot publish", () => {
  const s = createStore(":memory:");
  try {
    const p = s.registerParent({
      name: "Parent",
      email: "a@example.test",
      password: "valid-password-123",
      role: "admin",
    });
    assert.equal(p.role, "parent");
    assert.throws(() => s.publish(p.id, false));
    assert.equal(s.isPublished(), true);
  } finally {
    s.close();
  }
});
test("resetting a child pin revokes sessions and forbids another family", () => {
  const s = createStore(":memory:");
  try {
    const p = s.registerParent({
      name: "Parent",
      email: "a@example.test",
      password: "valid-password-123",
    });
    const o = s.registerParent({
      name: "Other",
      email: "b@example.test",
      password: "valid-password-123",
    });
    const c = s.createChild(p.id, {
      name: "Child",
      username: "child",
      pin: "12345678",
    });
    const token = s.createSession(c.id);
    assert.throws(() => s.resetChildPin(o.id, c.id, "87654321"));
    s.resetChildPin(p.id, c.id, "87654321");
    assert.equal(s.sessionUser(token), null);
    assert.throws(() => s.loginChild("child", "12345678"));
    assert.equal(s.loginChild("child", "87654321").id, c.id);
  } finally {
    s.close();
  }
});
test("rate limit rejects repeated attempts", () => {
  const s = createStore(":memory:");
  try {
    for (let i = 0; i < 12; i++) s.rateLimit("login:one");
    assert.throws(
      () => s.rateLimit("login:one"),
      (e) => e.status === 429,
    );
    s.rateLimit("login:other");
  } finally {
    s.close();
  }
});
test("database reopen preserves progress and attempt history", () => {
  const dir = mkdtempSync(join(tmpdir(), "hana-qa-"));
  const path = join(dir, "test.sqlite");
  let s = createStore(path);
  try {
    const p = s.registerParent({
      name: "Parent",
      email: "p@example.test",
      password: "valid-password-123",
    });
    const c = s.createChild(p.id, {
      name: "Child",
      username: "persist-child",
      pin: "12345678",
    });
    s.saveProgress(c.id, { section: "map" });
    s.submit(c.id, { id: "persist-attempt-01", answers: { q1: "macro" } });
    s.close();
    s = createStore(path);
    const data = s.snapshot(c.id);
    assert.deepEqual(data.progress.sections, ["map", "quiz"]);
    assert.equal(data.attempts[0].score, 10);
  } finally {
    s.close();
    const expectedPrefix = join(tmpdir(), "hana-qa-");
    assert.ok(dir.startsWith(expectedPrefix));
    rmSync(dir, { recursive: true, force: true });
  }
});
