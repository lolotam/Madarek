import test from "node:test";
import assert from "node:assert/strict";
import { normalize, grade, publicQuestions } from "../src/server/questions.mjs";
import { createStore } from "../src/server/store.mjs";

test("Arabic answers ignore decoration and whitespace, but not meaning", () => {
  assert.equal(normalize("  الْمَاءُ  "), "الماء");
  assert.equal(normalize("الــجلوكوز"), "الجلوكوز");
  assert.equal(grade({ q1: "macro", q7: "الْجُلُوكُوز" }).correct, 2);
  assert.equal(grade({ q8: "الماء والدهون" }).correct, 0);
});
test("quiz grades ten fixed questions and never reveals keys in public questions", () => {
  const result = grade({
    q1: "macro",
    q2: "protein",
    q3: "fat",
    q4: "D",
    q5: "oxygen",
    q6: "bowel",
    q7: "الجلوكوز",
    q8: "الماء",
    q9: "الفيتامينات",
    q10: "الكالسيوم",
  });
  assert.equal(result.score, 100);
  assert.equal(result.total, 10);
  assert.equal(result.details[0].submitted, "المغذّيات الكبرى");
  assert.equal(publicQuestions().length, 10);
  assert.ok(
    publicQuestions().every(
      (q) => !("accepted" in q) && !("correct" in q) && !("explanation" in q),
    ),
  );
  assert.equal(grade({}).score, 0);
});
test("family ownership protects child data and role boundaries", () => {
  const store = createStore(":memory:");
  try {
    const p = store.registerParent({
      name: "ولي الأمر",
      email: "parent@example.test",
      password: "Safe-password-123",
    });
    const other = store.registerParent({
      name: "أسرة أخرى",
      email: "other@example.test",
      password: "Safe-password-123",
    });
    const child = store.createChild(p.id, {
      name: "هنا",
      username: "hana-test",
      pin: "12345678",
      grade: 8,
      gender: "female",
    });
    assert.equal(child.role, "student");
    assert.throws(() => store.getChild(other.id, child.id));
    assert.throws(() =>
      store.createChild(child.id, {
        name: "طفل",
        username: "invalid-child",
        pin: "12345678",
      }),
    );
    assert.equal(store.loginChild("hana-test", "12345678").id, child.id);
    assert.throws(() => store.loginChild("hana-test", "87654321"));
    assert.equal(
      store.loginParent("PARENT@example.test", "Safe-password-123").id,
      p.id,
    );
    assert.throws(() => store.loginParent("parent@example.test", "wrong"));
    const token = store.createSession(child.id);
    assert.equal(store.sessionUser(token).id, child.id);
    assert.equal(store.sessionUser("not-a-session"), null);
    assert.ok(!JSON.stringify(store.snapshot(p.id)).includes("hash"));
    store.revokeSession(token);
    assert.equal(store.sessionUser(token), null);
  } finally {
    store.close();
  }
});
test("attempts preserve history, server score and idempotency", () => {
  const store = createStore(":memory:");
  try {
    const p = store.registerParent({
      name: "أب",
      email: "p@example.test",
      password: "Safe-password-123",
    });
    const c = store.createChild(p.id, {
      name: "هنا",
      username: "hana-attempts",
      pin: "12345678",
      grade: 8,
      gender: "female",
    });
    store.saveProgress(c.id, { section: "map" });
    store.savePractice(
      c.id,
      "البروتينات تساعد على إصلاح الأنسجة والتئام الجروح.",
    );
    assert.equal(
      Object.getPrototypeOf(store.snapshot(c.id).practice[0]),
      Object.prototype,
    );
    const first = store.submit(c.id, {
      id: "attempt-00000001",
      answers: { q1: "macro" },
      score: 100,
    });
    assert.equal(first.score, 10);
    const duplicate = store.submit(c.id, {
      id: "attempt-00000001",
      answers: {},
    });
    assert.equal(duplicate.score, 10);
    store.submit(c.id, { id: "attempt-00000002", answers: {} });
    const snapshot = store.snapshot(c.id);
    assert.equal(snapshot.attempts.length, 2);
    assert.deepEqual(snapshot.progress.sections, ["map", "quiz"]);
    assert.equal(store.snapshot(p.id).children[0].attempts.length, 2);
    assert.throws(() =>
      store.submit(p.id, { id: "attempt-00000003", answers: {} }),
    );
  } finally {
    store.close();
  }
});
