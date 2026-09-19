import test from "node:test";
import assert from "node:assert/strict";
import {
  kuwaitDay,
  daysBetween,
  nextStreak,
  dailyReward,
  quizXp,
  quizImprovement,
  levelFor,
} from "../src/server/rewards.mjs";
import { conceptMastery } from "../src/server/mastery.mjs";
import { LESSON_ID, quizConcepts } from "../src/server/questions.mjs";

const at = (iso) => Date.parse(iso);

test("the study day flips at midnight Kuwait time, not UTC", () => {
  assert.equal(kuwaitDay(at("2026-09-19T20:59:00Z")), "2026-09-19");
  assert.equal(kuwaitDay(at("2026-09-19T21:00:00Z")), "2026-09-20");
  assert.equal(daysBetween("2026-09-19", "2026-09-20"), 1);
  assert.equal(daysBetween("2026-02-28", "2026-03-01"), 1);
});

test("streak grows on consecutive days and ignores repeat activity on the same day", () => {
  let s = nextStreak(null, "2026-09-01");
  assert.deepEqual([s.current, s.isNewDay], [1, true]);
  s = nextStreak(s, "2026-09-01");
  assert.deepEqual([s.current, s.isNewDay], [1, false]);
  s = nextStreak(s, "2026-09-02");
  assert.equal(s.current, 2);
  const backwards = nextStreak(s, "2026-08-30");
  assert.equal(backwards.isNewDay, false);
});

test("a missed day restarts the counter unless a freeze covers it, and best is kept", () => {
  const base = { current: 4, best: 4, lastDay: "2026-09-04", freezes: 0 };
  const broken = nextStreak(base, "2026-09-06");
  assert.deepEqual([broken.current, broken.best], [1, 4]);
  const covered = nextStreak({ ...base, freezes: 1 }, "2026-09-06");
  assert.deepEqual(
    [covered.current, covered.freezes, covered.usedFreeze],
    [5, 0, true],
  );
  const tooLong = nextStreak({ ...base, freezes: 1 }, "2026-09-07");
  assert.equal(tooLong.current, 1);
});

test("every seventh streak day earns a freeze, capped at two", () => {
  const s = nextStreak(
    { current: 6, best: 6, lastDay: "2026-09-06", freezes: 0 },
    "2026-09-07",
  );
  assert.deepEqual([s.current, s.freezes], [7, 1]);
  const capped = nextStreak(
    { current: 13, best: 13, lastDay: "2026-09-13", freezes: 2 },
    "2026-09-14",
  );
  assert.equal(capped.freezes, 2);
});

test("daily coins rise 10 to 50 and then stay capped", () => {
  assert.deepEqual(
    [1, 2, 5, 6, 40].map((day) => dailyReward(day).coins),
    [10, 20, 50, 50, 50],
  );
  assert.equal(dailyReward(3).xp, 20);
});

test("quiz XP is best score x10 and only improvement is paid again", () => {
  assert.equal(quizXp(100), 1000);
  assert.equal(quizXp(90), 900);
  assert.deepEqual(quizImprovement(0, 80), { xp: 800, coins: 80 });
  assert.deepEqual(quizImprovement(80, 90), { xp: 100, coins: 10 });
  assert.equal(quizImprovement(90, 90), null);
  assert.equal(quizImprovement(90, 70), null);
});

test("titles follow XP and match the student's gender", () => {
  assert.equal(levelFor(0, "female").title, "مستكشفة مبتدئة");
  assert.equal(levelFor(0, "male").title, "مستكشف مبتدئ");
  assert.equal(levelFor(0, null).title, "مستكشفة مبتدئة");
  const l = levelFor(1200, "male");
  assert.deepEqual(
    [l.level, l.title, l.floorXp, l.nextTitle, l.nextXp],
    [3, "محقّق العلوم", 1000, "مهندس التجارب", 2500],
  );
  const top = levelFor(999999, "female");
  assert.deepEqual([top.level, top.nextTitle, top.nextXp], [7, null, null]);
});

test("mastery reads the newest attempt for each concept", () => {
  const attempts = [
    {
      details: [
        { concept: "الماء", correct: false },
        { concept: "الدهون", correct: true },
      ],
    },
    {
      details: [
        { concept: "الماء", correct: true },
        { concept: "الدهون", correct: false },
      ],
    },
  ];
  assert.deepEqual(conceptMastery(["الماء", "الدهون", "الألياف"], attempts), [
    { concept: "الماء", status: "review" },
    { concept: "الدهون", status: "secure" },
    { concept: "الألياف", status: "not_started" },
  ]);
  assert.deepEqual(
    conceptMastery(
      ["الماء"],
      [{ details: [{ concept: "الماء", correct: false }] }],
    ),
    [{ concept: "الماء", status: "needs_help" }],
  );
});

test("a concept with two questions is secure only when both are right", () => {
  const attempts = [
    {
      details: [
        { concept: "التصنيف", correct: true },
        { concept: "التصنيف", correct: false },
      ],
    },
  ];
  assert.equal(conceptMastery(["التصنيف"], attempts)[0].status, "needs_help");
});

test("the nutrients quiz exposes its lesson id and unique concepts", () => {
  assert.equal(LESSON_ID, "nutrients");
  const concepts = quizConcepts();
  assert.equal(concepts.length, new Set(concepts).size);
  assert.ok(concepts.includes("البروتينات"));
  assert.equal(concepts.length, 8);
});
