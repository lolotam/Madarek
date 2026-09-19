import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStore } from "../src/server/store.mjs";

const DAY = 86400000;
const password = "Safe-password-123";
const allCorrect = {
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
};

function setup() {
  let clock = Date.parse("2026-09-19T06:00:00Z");
  const store = createStore(":memory:", { now: () => clock });
  const parent = store.registerFamily({
    name: "ولي الأمر",
    email: "rewards@example.test",
    password,
    children: [
      {
        name: "هنا",
        username: "hana-rewards",
        pin: "12345678",
        grade: 8,
        gender: "female",
      },
    ],
  });
  const kid = store.loginChild("hana-rewards", "12345678");
  return {
    store,
    parent,
    kid,
    advance(days) {
      clock += days * DAY;
    },
  };
}

test("existing attempts are backfilled with the nutrients lesson id", () => {
  const dir = mkdtempSync(join(tmpdir(), "madarek-")),
    file = join(dir, "old.sqlite");
  try {
    const old = new DatabaseSync(file);
    old.exec(
      "CREATE TABLE attempts(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,result TEXT NOT NULL,created_at INTEGER NOT NULL); INSERT INTO attempts VALUES('a1','u1','{}',1);",
    );
    old.close();
    createStore(file).close();
    const check = new DatabaseSync(file);
    assert.equal(
      check.prepare("SELECT lesson_id FROM attempts WHERE id='a1'").get()
        .lesson_id,
      "nutrients",
    );
    check.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("attempts carry their lesson id in the snapshot", () => {
  const { store, kid } = setup();
  try {
    store.submit(kid.id, { id: "attempt-rw-lesson1", answers: allCorrect });
    assert.equal(store.snapshot(kid.id).attempts[0].lessonId, "nutrients");
  } finally {
    store.close();
  }
});

test("deleting a family also removes its reward history", () => {
  const { store, parent, kid } = setup();
  try {
    store.registerParent({
      name: "إدارة",
      email: "admin-rw@example.test",
      password,
    });
    const admin = store.promoteAdmin("admin-rw@example.test");
    store.submit(kid.id, { id: "attempt-rw-delete1", answers: allCorrect });
    store.deleteFamily(admin.id, {
      parentId: parent.id,
      confirmEmail: "rewards@example.test",
    });
    assert.throws(
      () => store.snapshot(kid.id),
      (e) => e.status === 401,
    );
  } finally {
    store.close();
  }
});

test("the first study activity of the day pays the daily reward once", () => {
  const { store, kid } = setup();
  try {
    const first = store.saveProgress(kid.id, { section: "map" });
    assert.deepEqual(
      first.rewards.map((r) => r.source),
      ["daily", "lesson_section"],
    );
    assert.deepEqual(store.saveProgress(kid.id, { section: "map" }).rewards, []);
    const r = store.snapshot(kid.id).rewards;
    assert.deepEqual(
      [r.streak.current, r.streak.todayDone, r.xp, r.coins],
      [1, true, 50, 15],
    );
    assert.equal(r.title, "مستكشفة مبتدئة");
  } finally {
    store.close();
  }
});

test("retaking the quiz pays only the improvement over the best score", () => {
  const { store, kid } = setup();
  try {
    const ninety = { ...allCorrect, q10: "الحديد" };
    const a = store.submit(kid.id, { id: "attempt-rw-000001", answers: ninety });
    assert.equal(a.score, 90);
    assert.equal(a.rewards.find((r) => r.source === "quiz").xp, 900);
    assert.ok(a.rewards.some((r) => r.source === "quiz_effort"));
    const b = store.submit(kid.id, { id: "attempt-rw-000002", answers: ninety });
    assert.deepEqual(b.rewards, []);
    const c = store.submit(kid.id, {
      id: "attempt-rw-000003",
      answers: allCorrect,
    });
    assert.deepEqual(c.rewards, [{ source: "quiz", xp: 100, coins: 10 }]);
    const replay = store.submit(kid.id, {
      id: "attempt-rw-000003",
      answers: allCorrect,
    });
    assert.equal(replay.rewards, undefined);
  } finally {
    store.close();
  }
});

test("a gap breaks the streak but keeps XP, best streak and study days", () => {
  const { store, kid, advance } = setup();
  try {
    store.saveProgress(kid.id, { section: "map" });
    advance(1);
    store.saveProgress(kid.id, { section: "explore" });
    assert.equal(store.snapshot(kid.id).rewards.streak.current, 2);
    const xpBefore = store.snapshot(kid.id).rewards.xp;
    advance(3);
    assert.equal(store.snapshot(kid.id).rewards.streak.current, 0);
    store.savePractice(kid.id, "البروتينات تبني العضلات وتصلح الأنسجة.");
    const after = store.snapshot(kid.id).rewards;
    assert.deepEqual([after.streak.current, after.streak.best], [1, 2]);
    assert.ok(after.xp > xpBefore);
    assert.equal(after.activeDays.length, 3);
    assert.equal(after.recent[0].source, "practice");
  } finally {
    store.close();
  }
});

test("parents see each child's title, streak and concept mastery", () => {
  const { store, parent, kid } = setup();
  try {
    store.submit(kid.id, {
      id: "attempt-rw-parent1",
      answers: { ...allCorrect, q8: "" },
    });
    const child = store.snapshot(parent.id).children[0];
    assert.equal(child.rewards.xp, 950);
    assert.deepEqual(
      [child.rewards.level, child.rewards.title],
      [2, "صائدة الأفكار"],
    );
    const status = Object.fromEntries(
      child.mastery.map((m) => [m.concept, m.status]),
    );
    assert.equal(status["الماء"], "needs_help");
    assert.equal(status["التصنيف"], "secure");
  } finally {
    store.close();
  }
});
