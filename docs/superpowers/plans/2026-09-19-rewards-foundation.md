# Rewards Foundation (XP, Coins, Streak, Mastery) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give students a daily reason to return — a learning-based streak, XP with titles, Madarek coins and per-concept mastery — and show parents what their child understood and how regularly they study.

**Architecture:** All reward rules are pure functions in `src/server/rewards.mjs` and `src/server/mastery.mjs`, unit-tested without a database. `src/server/store.mjs` records rewards in an append-only `reward_ledger` whose `UNIQUE(user_id, source, source_key)` makes every grant idempotent, tracks study days in Kuwait time, and adds a `rewards` + `mastery` block to the existing student snapshot, so the current `/api/dashboard` and quiz responses carry the new data without new routes. The dashboard UI gets new focused components under `src/components/rewards/`.

**Tech Stack:** Next.js 16 (App Router, existing catch-all API), React 19, TypeScript, `node:sqlite`, `node:test`, Playwright, Framer Motion, lucide-react, plain CSS in `src/app/globals.css`.

**Scope decisions (defaults — the owner has not answered these yet, none of them block this plan):**
- Grades 2 and 5 stay open for sign-up; nothing here depends on them.
- No real prizes, no shop, no real money. Coins accumulate now and get spent in Phase 2.
- No new lessons or questions; everything keys by lesson id so more lessons slot in later.
- XP thresholds, daily coin amounts and quiz multipliers are **provisional constants** in one file, to be tuned after real usage.

---

## Reward rules (the spec this plan implements)

| Rule | Value |
|---|---|
| Day boundary | Midnight **Asia/Kuwait** |
| What counts as a study day | Completing a lesson section, submitting practice, or submitting the quiz. Logging in alone does **not** count. |
| Daily reward (first activity of the day) | 20 XP + `min(streakDay, 5) × 10` coins → 10, 20, 30, 40, 50, 50… |
| Streak milestones | Day 7: +100 XP +100 coins. Day 30: +300 XP +500 coins |
| Freeze | Every 7th streak day earns one freeze (max 2 held). A freeze covers exactly one missed day automatically. |
| Broken streak | Counter restarts at 1; XP, coins, titles and best streak are kept. Dashboard greets the student ("welcome back"), never scolds. |
| Lesson section (first time) | 30 XP + 5 coins |
| Practice (once per day) | 15 XP + 5 coins |
| Quiz XP | `best score × 10`, max 1,000 per lesson. A new attempt pays only the **improvement** over the previous best (XP gained, coins = XP/10). Repeating the same score pays nothing. |
| Serious attempt | All questions answered: +20 XP +5 coins, once per lesson per day |
| XP vs coins vs mastery | XP never decreases and sets level/title. Coins are for the future shop. Mastery is per concept and independent of points. |

Titles (feminine form used when `gender !== "male"`, matching the site's voice):

| XP | Male | Female |
|---|---|---|
| 0 | مستكشف مبتدئ | مستكشفة مبتدئة |
| 300 | صائد الأفكار | صائدة الأفكار |
| 1,000 | محقّق العلوم | محقّقة العلوم |
| 2,500 | مهندس التجارب | مهندسة التجارب |
| 5,000 | قائد المختبر | قائدة المختبر |
| 10,000 | بروفيسور مدارك | بروفيسورة مدارك |
| 20,000 | أسطورة الاكتشاف | أسطورة الاكتشاف |

Mastery per concept (from the quiz `concept` tags), newest attempt first: `secure` (newest attempt correct), `review` (newest wrong but correct before), `needs_help` (never correct), `not_started`.

---

## File map

- Create `src/server/rewards.mjs` — Kuwait day, streak transition, reward amounts, levels/titles. Pure.
- Create `src/server/mastery.mjs` — concept mastery from attempts. Pure.
- Modify `src/server/questions.mjs` — export `LESSON_ID` and `quizConcepts()`.
- Modify `src/server/store.mjs` — clock option, new tables, `attempts.lesson_id` migration, ledger/streak writes, snapshot `rewards` + `mastery`, family deletion cleanup.
- Create `src/components/rewards/types.ts` — client types for the snapshot additions.
- Create `src/content/rewards.ts` — Arabic labels and a day-list helper.
- Create `src/components/rewards/student-rewards.tsx` — `RewardsHero`, `DailyMission`, `MasteryList`, `RewardLog`, `RewardChips`.
- Create `src/components/rewards/child-insights.tsx` — parent view of one child.
- Modify `src/components/dashboard.tsx` — wire the new components.
- Modify `src/components/quiz.tsx` — show earned rewards on the result card.
- Modify `src/components/lesson.tsx` — mention XP in the section-saved feedback.
- Modify `src/app/globals.css` — styles for the new components.
- Create `tests/rewards.test.mjs`, `tests/rewards-store.test.mjs`, `tests/browser/rewards.spec.ts`.
- Modify `docs/IMPLEMENTATION-STATUS.md` — record the reward rules.

---

### Task 0: Worktree setup and green baseline

**Files:** none

- [ ] **Step 1: Install dependencies in the worktree**

Run: `npm ci`
Expected: completes without errors.

- [ ] **Step 2: Run the unit suite to confirm a green baseline**

Run: `npm test`
Expected: all tests pass. If anything fails here, stop and report — do not start the plan on a red baseline.

---

### Task 1: Pure reward rules

**Files:**
- Create: `src/server/rewards.mjs`
- Test: `tests/rewards.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `tests/rewards.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/rewards.test.mjs`
Expected: FAIL — `Cannot find module '.../src/server/rewards.mjs'`.

- [ ] **Step 3: Implement the rules**

Create `src/server/rewards.mjs`:

```js
// Reward rules for the student dashboard. Every number here is provisional:
// tune it after real students use the platform, not before.

const kuwaitDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kuwait",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The study day ("YYYY-MM-DD") that `ms` falls on in Kuwait. */
export function kuwaitDay(ms) {
  return kuwaitDate.format(new Date(ms));
}

export function daysBetween(fromDay, toDay) {
  return Math.round(
    (Date.parse(toDay + "T00:00:00Z") - Date.parse(fromDay + "T00:00:00Z")) /
      86400000,
  );
}

export const MAX_FREEZES = 2;

/**
 * Streak state after studying on `day`. A freeze silently covers one missed
 * day; a longer gap restarts the counter but never touches `best`.
 */
export function nextStreak(state, day) {
  const s = state ?? { current: 0, best: 0, lastDay: null, freezes: 0 };
  const gap = s.lastDay ? daysBetween(s.lastDay, day) : null;
  if (gap !== null && gap <= 0)
    return { ...s, isNewDay: false, usedFreeze: false };
  let current = 1,
    freezes = s.freezes,
    usedFreeze = false;
  if (gap === 1) current = s.current + 1;
  else if (gap === 2 && s.freezes > 0) {
    current = s.current + 1;
    freezes -= 1;
    usedFreeze = true;
  }
  if (current % 7 === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
  return {
    current,
    best: Math.max(s.best, current),
    lastDay: day,
    freezes,
    isNewDay: true,
    usedFreeze,
  };
}

export function dailyReward(streakDay) {
  return { xp: 20, coins: Math.min(streakDay, 5) * 10 };
}

export const STREAK_MILESTONES = {
  7: { xp: 100, coins: 100 },
  30: { xp: 300, coins: 500 },
};
export const SECTION_REWARD = { xp: 30, coins: 5 };
export const PRACTICE_REWARD = { xp: 15, coins: 5 };
export const QUIZ_EFFORT = { xp: 20, coins: 5 };

export function quizXp(score) {
  return Math.min(1000, Math.round(score * 10));
}

/** Only the gain over the previous best is paid, so retakes cannot farm XP. */
export function quizImprovement(previousBest, score) {
  const xp = quizXp(score) - quizXp(previousBest ?? 0);
  return xp > 0 ? { xp, coins: Math.round(xp / 10) } : null;
}

export const TITLES = [
  { xp: 0, male: "مستكشف مبتدئ", female: "مستكشفة مبتدئة" },
  { xp: 300, male: "صائد الأفكار", female: "صائدة الأفكار" },
  { xp: 1000, male: "محقّق العلوم", female: "محقّقة العلوم" },
  { xp: 2500, male: "مهندس التجارب", female: "مهندسة التجارب" },
  { xp: 5000, male: "قائد المختبر", female: "قائدة المختبر" },
  { xp: 10000, male: "بروفيسور مدارك", female: "بروفيسورة مدارك" },
  { xp: 20000, male: "أسطورة الاكتشاف", female: "أسطورة الاكتشاف" },
];

export function levelFor(xp, gender) {
  let index = 0;
  for (let i = 0; i < TITLES.length; i++) if (xp >= TITLES[i].xp) index = i;
  const name = (t) => (gender === "male" ? t.male : t.female);
  const next = TITLES[index + 1];
  return {
    level: index + 1,
    title: name(TITLES[index]),
    floorXp: TITLES[index].xp,
    nextTitle: next ? name(next) : null,
    nextXp: next ? next.xp : null,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/rewards.test.mjs`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/rewards.mjs tests/rewards.test.mjs
git commit -m "Add pure reward rules: Kuwait study day, streak, XP, coins and titles" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Concept mastery and quiz metadata

**Files:**
- Create: `src/server/mastery.mjs`
- Modify: `src/server/questions.mjs` (add exports after `publicQuestions`, around line 134)
- Test: `tests/rewards.test.mjs` (append)

- [ ] **Step 1: Append the failing tests**

Add to the imports at the top of `tests/rewards.test.mjs`:

```js
import { conceptMastery } from "../src/server/mastery.mjs";
import { LESSON_ID, quizConcepts } from "../src/server/questions.mjs";
```

Append at the end of the file:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/rewards.test.mjs`
Expected: FAIL — cannot find `src/server/mastery.mjs`.

- [ ] **Step 3: Implement mastery and the quiz exports**

Create `src/server/mastery.mjs`:

```js
/**
 * Per-concept understanding from quiz attempts (newest first). A concept
 * counts as correct in an attempt only if every question on it was right.
 */
export function conceptMastery(concepts, attempts) {
  return concepts.map((concept) => {
    const history = attempts
      .map((a) => (a.details ?? []).filter((d) => d.concept === concept))
      .filter((rows) => rows.length)
      .map((rows) => rows.every((d) => d.correct));
    const status = !history.length
      ? "not_started"
      : history[0]
        ? "secure"
        : history.some(Boolean)
          ? "review"
          : "needs_help";
    return { concept, status };
  });
}
```

In `src/server/questions.mjs`, add directly after the `publicQuestions` function:

```js
/** The lesson these questions assess; attempts and rewards are keyed by it. */
export const LESSON_ID = "nutrients";
export function quizConcepts() {
  return [...new Set(questions.map((q) => q.concept))];
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/rewards.test.mjs`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/mastery.mjs src/server/questions.mjs tests/rewards.test.mjs
git commit -m "Add per-concept mastery and expose the quiz's lesson id and concepts" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Store schema — clock, reward tables, lesson id on attempts, family cleanup

**Files:**
- Modify: `src/server/store.mjs` (imports line 11; `createStore` signature line ~93; schema block lines ~98–108; column migration after line ~122; `childAttempts` ~229; `submit` insert ~464; `deleteFamily` ~826)
- Test: `tests/rewards-store.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `tests/rewards-store.test.mjs`:

```js
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
```

Note: the third test only fails after Task 4 adds reward writes (the foreign keys then block deletion). It is written now so the cleanup lands together with the tables.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/rewards-store.test.mjs`
Expected: FAIL — `lesson_id` column missing (`no such column: lesson_id`) and `lessonId` undefined.

- [ ] **Step 3: Implement the schema changes**

In `src/server/store.mjs`:

1. Replace the questions import (line 11):

```js
import { grade, modelReason, LESSON_ID } from "./questions.mjs";
```

2. Change the signature:

```js
export function createStore(filename, { now = Date.now } = {}) {
```

3. Inside the big `db.exec(...)` schema string, add these three lines just before `INSERT OR IGNORE INTO settings`:

```sql
    CREATE TABLE IF NOT EXISTS reward_ledger(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),source TEXT NOT NULL,source_key TEXT NOT NULL,xp INTEGER NOT NULL,coins INTEGER NOT NULL,created_at INTEGER NOT NULL,UNIQUE(user_id,source,source_key));
    CREATE TABLE IF NOT EXISTS activity_days(user_id TEXT NOT NULL REFERENCES users(id),day TEXT NOT NULL,PRIMARY KEY(user_id,day));
    CREATE TABLE IF NOT EXISTS streaks(user_id TEXT PRIMARY KEY REFERENCES users(id),current INTEGER NOT NULL,best INTEGER NOT NULL,last_day TEXT,freezes INTEGER NOT NULL);
```

4. After the existing `if (!userColumns.has("disabled_at")) ...` block, add:

```js
  const attemptColumns = new Set(
    db
      .prepare("PRAGMA table_info(attempts)")
      .all()
      .map((c) => c.name),
  );
  if (!attemptColumns.has("lesson_id")) {
    db.exec("ALTER TABLE attempts ADD COLUMN lesson_id TEXT");
    // Every attempt before this column existed was the nutrients quiz.
    db.prepare("UPDATE attempts SET lesson_id=? WHERE lesson_id IS NULL").run(
      LESSON_ID,
    );
  }
```

5. Replace `childAttempts` so it selects and returns the lesson id:

```js
  const childAttempts = (id) =>
    db
      .prepare(
        "SELECT result,lesson_id,created_at FROM attempts WHERE user_id=? ORDER BY created_at DESC",
      )
      .all(id)
      .map((r) => ({
        ...JSON.parse(r.result),
        lessonId: r.lesson_id,
        createdAt: r.created_at,
      }));
```

6. In `submit`, the positional insert `INSERT INTO attempts VALUES(?,?,?,?)` now breaks because the table has 5 columns. Replace it with:

```js
      db.prepare(
        "INSERT INTO attempts(id,user_id,result,created_at,lesson_id) VALUES(?,?,?,?,?)",
      ).run(id, userId, JSON.stringify(result), Date.now(), LESSON_ID);
```

7. In `deleteFamily`, right after the `DELETE FROM practice ...` statement, add:

```js
        for (const table of ["reward_ledger", "activity_days", "streaks"])
          db.prepare(
            `DELETE FROM ${table} WHERE user_id IN (${placeholders})`,
          ).run(...ids);
```

- [ ] **Step 4: Run the tests to verify they pass, and the old suites still pass**

Run: `node --test tests/rewards-store.test.mjs`
Expected: PASS (3 tests).
Run: `npm test`
Expected: all suites PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/store.mjs tests/rewards-store.test.mjs
git commit -m "Add reward tables, tag quiz attempts with their lesson and clean up rewards on family deletion" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Store — grant rewards and expose them in the snapshot

**Files:**
- Modify: `src/server/store.mjs` (imports; helpers before `childSnapshot`; `childSnapshot`; `saveProgress`; `submit`; `savePractice`)
- Test: `tests/rewards-store.test.mjs` (append)

- [ ] **Step 1: Append the failing tests**

Append to `tests/rewards-store.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/rewards-store.test.mjs`
Expected: FAIL — `first.rewards` is undefined; the delete-family test from Task 3 may still pass because nothing writes rewards yet.

- [ ] **Step 3: Implement grants and the summary**

In `src/server/store.mjs`, add imports below the questions import:

```js
import {
  kuwaitDay,
  daysBetween,
  nextStreak,
  dailyReward,
  STREAK_MILESTONES,
  SECTION_REWARD,
  PRACTICE_REWARD,
  QUIZ_EFFORT,
  quizImprovement,
  levelFor,
} from "./rewards.mjs";
import { conceptMastery } from "./mastery.mjs";
```

and change the questions import to `import { grade, modelReason, LESSON_ID, quizConcepts } from "./questions.mjs";`.

Directly above `const childAttempts = ...`, add the reward helpers:

```js
  /** Append a reward once; returns it, or null when it was already granted. */
  function grant(userId, source, key, reward) {
    const info = db
      .prepare(
        "INSERT OR IGNORE INTO reward_ledger(id,user_id,source,source_key,xp,coins,created_at) VALUES(?,?,?,?,?,?,?)",
      )
      .run(randomUUID(), userId, source, key, reward.xp, reward.coins, now());
    return info.changes
      ? { source, xp: reward.xp, coins: reward.coins }
      : null;
  }
  /** Mark today as a study day and pay the daily and milestone rewards. */
  function recordActivity(userId) {
    const day = kuwaitDay(now());
    db.prepare(
      "INSERT OR IGNORE INTO activity_days(user_id,day) VALUES(?,?)",
    ).run(userId, day);
    const row = db.prepare("SELECT * FROM streaks WHERE user_id=?").get(userId);
    const next = nextStreak(
      row
        ? {
            current: row.current,
            best: row.best,
            lastDay: row.last_day,
            freezes: row.freezes,
          }
        : null,
      day,
    );
    if (!next.isNewDay) return [];
    db.prepare(
      "INSERT INTO streaks(user_id,current,best,last_day,freezes) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET current=excluded.current,best=excluded.best,last_day=excluded.last_day,freezes=excluded.freezes",
    ).run(userId, next.current, next.best, next.lastDay, next.freezes);
    const granted = [grant(userId, "daily", day, dailyReward(next.current))];
    const milestone = STREAK_MILESTONES[next.current];
    if (milestone)
      granted.push(
        grant(userId, "streak_bonus", `${next.current}:${day}`, milestone),
      );
    return granted.filter(Boolean);
  }
  function rewardSummary(user) {
    const totals = db
      .prepare(
        "SELECT COALESCE(SUM(xp),0) AS xp,COALESCE(SUM(coins),0) AS coins FROM reward_ledger WHERE user_id=?",
      )
      .get(user.id);
    const streak = db
      .prepare("SELECT * FROM streaks WHERE user_id=?")
      .get(user.id);
    const today = kuwaitDay(now());
    const gap = streak?.last_day ? daysBetween(streak.last_day, today) : null;
    const alive =
      gap !== null && (gap <= 1 || (gap === 2 && streak.freezes > 0));
    return {
      xp: totals.xp,
      coins: totals.coins,
      ...levelFor(totals.xp, user.gender),
      streak: {
        current: alive ? streak.current : 0,
        best: streak?.best ?? 0,
        freezes: streak?.freezes ?? 0,
        todayDone: streak?.last_day === today,
      },
      today,
      activeDays: db
        .prepare(
          "SELECT day FROM activity_days WHERE user_id=? ORDER BY day DESC LIMIT 14",
        )
        .all(user.id)
        .map((r) => r.day),
      recent: db
        .prepare(
          "SELECT source,source_key AS sourceKey,xp,coins,created_at AS createdAt FROM reward_ledger WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 20",
        )
        .all(user.id)
        .map((r) => ({ ...r })),
    };
  }
```

Replace `childSnapshot` with:

```js
  function childSnapshot(id) {
    const user = raw(id);
    const row = db.prepare("SELECT * FROM progress WHERE user_id=?").get(id);
    const attempts = childAttempts(id);
    return {
      user: safeUser(user),
      progress: {
        sections: row ? JSON.parse(row.sections) : [],
        updatedAt: row?.updated_at ?? null,
      },
      attempts,
      practice: db
        .prepare(
          "SELECT answer,feedback,created_at AS createdAt FROM practice WHERE user_id=? ORDER BY created_at DESC LIMIT 30",
        )
        .all(id)
        .map((row) => ({ ...row })),
      rewards: rewardSummary(user),
      mastery: conceptMastery(quizConcepts(), attempts),
    };
  }
```

In `saveProgress`, replace the final `return { sections: [...sections] };` with:

```js
      const rewards = [
        ...recordActivity(userId),
        grant(userId, "lesson_section", `${LESSON_ID}:${section}`, SECTION_REWARD),
      ].filter(Boolean);
      return { sections: [...sections], rewards };
```

In `submit`, compute the previous best **before** the insert, and replace the tail. The body after the `answers` validation becomes:

```js
      const result = { ...grade(answers), id };
      const previousBest = db
        .prepare("SELECT result FROM attempts WHERE user_id=? AND lesson_id=?")
        .all(userId, LESSON_ID)
        .reduce((best, r) => Math.max(best, JSON.parse(r.result).score), 0);
      db.prepare(
        "INSERT INTO attempts(id,user_id,result,created_at,lesson_id) VALUES(?,?,?,?,?)",
      ).run(id, userId, JSON.stringify(result), Date.now(), LESSON_ID);
      const rewards = [...api.saveProgress(userId, { section: "quiz" }).rewards];
      if (result.details.every((d) => d.submitted))
        rewards.push(
          grant(
            userId,
            "quiz_effort",
            `${LESSON_ID}:${kuwaitDay(now())}`,
            QUIZ_EFFORT,
          ),
        );
      const gain = quizImprovement(previousBest, result.score);
      if (gain) rewards.push(grant(userId, "quiz", `${LESSON_ID}:${id}`, gain));
      return { ...result, rewards: rewards.filter(Boolean) };
```

(The stored attempt JSON never contains `rewards`, so replaying the same attempt id returns the result without rewards and pays nothing twice.)

In `savePractice`, replace `return { mode: "model_answer", feedback: modelReason };` with:

```js
      const rewards = [
        ...recordActivity(userId),
        grant(
          userId,
          "practice",
          `${LESSON_ID}:${kuwaitDay(now())}`,
          PRACTICE_REWARD,
        ),
      ].filter(Boolean);
      return { mode: "model_answer", feedback: modelReason, rewards };
```

- [ ] **Step 4: Run all unit tests**

Run: `npm test`
Expected: all suites PASS, including the 7 tests in `tests/rewards-store.test.mjs`. If `tests/core.test.mjs` or `tests/admin.test.mjs` compare `saveProgress`/`savePractice` output with `deepEqual`, they will now see the extra `rewards` key — update those assertions to check the fields they care about rather than removing the new key.

- [ ] **Step 5: Commit**

```bash
git add src/server/store.mjs tests/rewards-store.test.mjs
git commit -m "Grant XP and coins for study activity and expose rewards and mastery in the dashboard snapshot" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Client types and Arabic labels

**Files:**
- Create: `src/components/rewards/types.ts`
- Create: `src/content/rewards.ts`

- [ ] **Step 1: Create the types**

`src/components/rewards/types.ts`:

```ts
export type RewardSource =
  | "daily"
  | "streak_bonus"
  | "quiz"
  | "quiz_effort"
  | "lesson_section"
  | "practice";
export type RewardEntry = {
  source: RewardSource;
  sourceKey?: string;
  xp: number;
  coins: number;
  createdAt?: number;
};
export type RewardSummary = {
  xp: number;
  coins: number;
  level: number;
  title: string;
  floorXp: number;
  nextTitle: string | null;
  nextXp: number | null;
  streak: { current: number; best: number; freezes: number; todayDone: boolean };
  today: string;
  activeDays: string[];
  recent: RewardEntry[];
};
export type ConceptStatus = "secure" | "review" | "needs_help" | "not_started";
export type Mastery = { concept: string; status: ConceptStatus }[];
```

- [ ] **Step 2: Create the labels**

`src/content/rewards.ts`:

```ts
import type { ConceptStatus, RewardSource } from "@/components/rewards/types";

export const rewardSourceLabel: Record<RewardSource, string> = {
  daily: "مهمة اليوم",
  streak_bonus: "إنجاز الانتظام",
  quiz: "تحسّن في الاختبار",
  quiz_effort: "محاولة جادة",
  lesson_section: "مقطع من الدرس",
  practice: "تدريب كتابي",
};

export const conceptStatusLabel: Record<
  ConceptStatus,
  { text: string; tone: "green" | "yellow" | "pink" | "muted" }
> = {
  secure: { text: "مفهوم ثابت", tone: "green" },
  review: { text: "يحتاج مراجعة", tone: "yellow" },
  needs_help: { text: "يحتاج مساعدة", tone: "pink" },
  not_started: { text: "لم يُختبر بعد", tone: "muted" },
};

/** The `n` study days ending at `today` ("YYYY-MM-DD"), oldest first. */
export function lastDays(today: string, n: number) {
  const end = Date.parse(today + "T00:00:00Z");
  return Array.from({ length: n }, (_, i) =>
    new Date(end - (n - 1 - i) * 86400000).toISOString().slice(0, 10),
  );
}

export function weekdayName(day: string) {
  return new Date(day + "T00:00:00Z").toLocaleDateString("ar-KW", {
    weekday: "long",
    timeZone: "UTC",
  });
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/rewards/types.ts src/content/rewards.ts
git commit -m "Add reward types and Arabic labels for the dashboards" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Student reward components and styles

**Files:**
- Create: `src/components/rewards/student-rewards.tsx`
- Modify: `src/app/globals.css` (append at end)

Follow `design-system/hana-learning/pages/platform.md` tokens; the variables below (`--violet`, `--amber-soft`, …) already exist in `globals.css`. No new colours.

- [ ] **Step 1: Create the components**

`src/components/rewards/student-rewards.tsx`:

```tsx
"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Coins,
  Flame,
  Snowflake,
  Sparkles,
  Star,
} from "lucide-react";
import { lessonPath } from "@/content/curriculum";
import {
  conceptStatusLabel,
  lastDays,
  rewardSourceLabel,
  weekdayName,
} from "@/content/rewards";
import type { Mastery, RewardEntry, RewardSummary } from "./types";

const n = (value: number) => value.toLocaleString("ar-KW");

export function RewardsHero({ rewards }: { rewards: RewardSummary }) {
  const reduce = useReducedMotion();
  const progress = rewards.nextXp
    ? Math.min(
        1,
        (rewards.xp - rewards.floorXp) / (rewards.nextXp - rewards.floorXp),
      )
    : 1;
  return (
    <section className="rewards-hero" aria-labelledby="rewards-title">
      <div>
        <span className="rewards-level">المستوى {n(rewards.level)}</span>
        <h2 id="rewards-title">{rewards.title}</h2>
        <div
          className="xp-track"
          role="progressbar"
          aria-label="التقدّم نحو اللقب التالي"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <motion.span
            className="xp-fill"
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <p className="muted-text">
          {rewards.nextTitle && rewards.nextXp
            ? `${n(rewards.nextXp - rewards.xp)} خبرة حتى لقب «${rewards.nextTitle}»`
            : "وصلتِ إلى أعلى لقب. أسطورة حقيقية!"}
        </p>
      </div>
      <dl className="rewards-numbers">
        <div>
          <dt>
            <Star size={17} aria-hidden /> الخبرة
          </dt>
          <dd>{n(rewards.xp)}</dd>
        </div>
        <div>
          <dt>
            <Coins size={17} aria-hidden /> عملات مدارك
          </dt>
          <dd>{n(rewards.coins)}</dd>
        </div>
        <div>
          <dt>
            <Flame size={17} aria-hidden /> أيام متتالية
          </dt>
          <dd>{n(rewards.streak.current)}</dd>
        </div>
      </dl>
    </section>
  );
}

export function DailyMission({
  rewards,
  nextSection,
}: {
  rewards: RewardSummary;
  nextSection: string;
}) {
  const done = rewards.streak.todayDone;
  const returning = !done && rewards.streak.current === 0 && rewards.streak.best > 0;
  const active = new Set(rewards.activeDays);
  return (
    <section
      className={"mission-card" + (done ? " done" : "")}
      aria-labelledby="mission-title"
    >
      <div>
        <span className="eyebrow">مهمة اليوم · من ٥ إلى ١٠ دقائق</span>
        <h2 id="mission-title">
          {done
            ? "أنجزتِ مهمة اليوم، نكمّل بكرة"
            : returning
              ? "أهلًا بعودتك! نبدأ سلسلة جديدة اليوم"
              : "أنجزي نشاطًا واحدًا اليوم"}
        </h2>
        <p>
          {done
            ? "عودي غدًا لتكبر سلسلتك وتزيد عملاتك."
            : "أكملي مقطعًا من الدرس أو تدريبًا أو اختبارًا لتحصلي على عملات اليوم."}
        </p>
      </div>
      <ol className="streak-days" aria-label="نشاط آخر سبعة أيام">
        {lastDays(rewards.today, 7).map((day) => (
          <li key={day} className={active.has(day) ? "on" : ""}>
            <Flame size={16} aria-hidden />
            <span className="sr-only">
              {weekdayName(day)}: {active.has(day) ? "يوم دراسة" : "بلا نشاط"}
            </span>
          </li>
        ))}
      </ol>
      <p className="streak-meta">
        <Snowflake size={16} aria-hidden /> أيام حماية:{" "}
        {n(rewards.streak.freezes)} · أطول سلسلة: {n(rewards.streak.best)}
      </p>
      {!done && (
        <Link href={lessonPath + "#" + nextSection} className="button primary">
          ابدئي مهمة اليوم <ArrowLeft size={18} />
        </Link>
      )}
    </section>
  );
}

export function MasteryList({
  mastery,
  heading,
}: {
  mastery: Mastery;
  heading: string;
}) {
  return (
    <section className="panel mastery-panel">
      <h3>{heading}</h3>
      <ul className="mastery-list">
        {mastery.map((m) => {
          const label = conceptStatusLabel[m.status];
          return (
            <li key={m.concept}>
              <span>{m.concept}</span>
              <span className={"pill " + label.tone}>{label.text}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function RewardLog({ entries }: { entries: RewardEntry[] }) {
  if (!entries.length) return null;
  return (
    <section className="panel reward-log">
      <h3>سجل المكافآت</h3>
      <ul>
        {entries.map((e) => (
          <li key={e.source + ":" + e.sourceKey}>
            <span>
              <Sparkles size={16} aria-hidden /> {rewardSourceLabel[e.source]}
            </span>
            <span className="reward-amount">
              +{n(e.xp)} خبرة · +{n(e.coins)} عملة
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RewardChips({ rewards }: { rewards?: RewardEntry[] }) {
  const reduce = useReducedMotion();
  if (!rewards?.length) return null;
  const xp = rewards.reduce((sum, r) => sum + r.xp, 0);
  const coins = rewards.reduce((sum, r) => sum + r.coins, 0);
  return (
    <motion.div
      className="reward-chips"
      role="status"
      initial={reduce ? false : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <span>
        <Star size={16} aria-hidden /> +{n(xp)} خبرة
      </span>
      <span>
        <Coins size={16} aria-hidden /> +{n(coins)} عملة
      </span>
    </motion.div>
  );
}
```

- [ ] **Step 2: Append the styles**

Append to `src/app/globals.css`:

```css
/* Rewards — student and parent dashboards */
.rewards-hero {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 24px;
  align-items: center;
  background: linear-gradient(135deg, var(--violet-soft), var(--azure-soft));
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 27px;
  margin-bottom: 25px;
}
.rewards-level {
  font-size: 13px;
  font-weight: 700;
  color: var(--violet-ink);
}
.rewards-hero h2 {
  margin: 4px 0 14px;
}
.xp-track {
  height: 12px;
  border-radius: 999px;
  background: var(--white);
  border: 1px solid var(--line);
  overflow: hidden;
  margin-bottom: 8px;
}
.xp-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--violet), var(--pink));
}
.rewards-numbers {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 0;
}
.rewards-numbers > div {
  background: var(--white);
  border-radius: 16px;
  padding: 14px 8px;
  text-align: center;
}
.rewards-numbers dt {
  display: flex;
  gap: 6px;
  justify-content: center;
  align-items: center;
  font-size: 12px;
  color: var(--muted);
}
.rewards-numbers dd {
  margin: 6px 0 0;
  font-size: 26px;
  font-weight: 800;
}
.mission-card {
  display: grid;
  gap: 14px;
  background: var(--white);
  border: 2px dashed var(--amber);
  border-radius: var(--radius);
  padding: 24px;
  margin-bottom: 25px;
}
.mission-card.done {
  border: 1px solid var(--line);
  background: var(--amber-soft);
}
.mission-card h2 {
  margin: 4px 0;
}
.mission-card > .button {
  justify-self: start;
}
.streak-days {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0;
  margin: 0;
}
.streak-days li {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--line);
}
.streak-days li.on {
  border-color: var(--orange);
  background: var(--orange-soft);
  color: var(--orange);
}
.streak-days.small li {
  width: 26px;
  height: 26px;
}
.streak-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}
.mastery-list,
.reward-log ul {
  list-style: none;
  display: grid;
  gap: 4px;
  padding: 0;
  margin: 12px 0 0;
}
.mastery-list li,
.reward-log li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}
.reward-log li > span:first-child {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.reward-amount {
  font-size: 13px;
  font-weight: 700;
  color: var(--violet-ink);
}
.reward-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}
.reward-chips span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--amber-soft);
  color: var(--amber-ink);
  font-weight: 700;
}
.child-insights {
  display: grid;
  gap: 16px;
  margin: 16px 0;
}
.child-insights h4 {
  margin: 0 0 8px;
  font-size: 14px;
}
.insight-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
@media (max-width: 640px) {
  .rewards-hero {
    grid-template-columns: 1fr;
    padding: 20px;
  }
  .rewards-numbers dd {
    font-size: 20px;
  }
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/rewards/student-rewards.tsx src/app/globals.css
git commit -m "Add student reward components: title and XP bar, daily mission, mastery and reward log" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Wire rewards into the student dashboard, quiz result and lesson feedback

**Files:**
- Modify: `src/components/dashboard.tsx` (imports; `ChildData` type ~line 21; student block ~lines 236–285)
- Modify: `src/components/quiz.tsx` (`Result` type ~line 31; result card ~line 150)
- Modify: `src/components/lesson.tsx` (progress feedback ~line 84)

- [ ] **Step 1: Dashboard types and imports**

In `src/components/dashboard.tsx` add imports:

```tsx
import {
  DailyMission,
  MasteryList,
  RewardLog,
  RewardsHero,
} from "./rewards/student-rewards";
import type { Mastery, RewardSummary } from "./rewards/types";
```

Extend `ChildData`:

```tsx
type ChildData = {
  user: User;
  progress: { sections: string[] };
  attempts: Result[];
  practice: { answer: string; feedback: string; createdAt: number }[];
  rewards: RewardSummary;
  mastery: Mastery;
};
```

- [ ] **Step 2: Student block**

Just after `const student = data as ChildData;` add:

```tsx
  const nextSection =
    ["map", "explore", "practice", "quiz"].find(
      (s) => !student.progress?.sections.includes(s),
    ) || "quiz";
```

In the `{user.role === "student" && (<> ... </>)}` block:
- Insert as the first children: `<RewardsHero rewards={student.rewards} />` and `<DailyMission rewards={student.rewards} nextSection={nextSection} />`.
- Replace the `href={lessonPath + "#" + ([...].find(...) || "quiz")}` expression on the continue link with `href={lessonPath + "#" + nextSection}`.
- Between the continue card and `<History .../>`, insert:

```tsx
          <MasteryList
            mastery={student.mastery}
            heading="ماذا أتقنتِ في المغذّيات؟"
          />
          <RewardLog entries={student.rewards.recent} />
```

Keep the existing three `Stat` cards — `tests/browser/learning.spec.ts:173` asserts "أفضل درجة مسجلة".

- [ ] **Step 3: Quiz result chips**

In `src/components/quiz.tsx`:
- Import: `import { RewardChips } from "./rewards/student-rewards";` and `import type { RewardEntry } from "./rewards/types";`.
- Add `rewards?: RewardEntry[];` to the `Result` type.
- Directly after the `<p className="save-label">…</p>` element in the result card, add `<RewardChips rewards={result.rewards} />`.

- [ ] **Step 4: Lesson section feedback**

In `src/components/lesson.tsx`, replace the success feedback in the progress handler:

```tsx
      const data = await api("progress", { section });
      setSections(data.sections);
      const gained = (data.rewards ?? []).reduce(
        (sum: number, r: { xp: number }) => sum + r.xp,
        0,
      );
      setFeedback({
        section,
        tone: "success",
        text: gained
          ? `حُفظ تقدّمك. +${gained.toLocaleString("ar-KW")} خبرة!`
          : "حُفظ تقدّمك. خطوة رائعة!",
      });
```

- [ ] **Step 5: Type-check and unit tests**

Run: `npx tsc --noEmit` → no errors.
Run: `npm test` → all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard.tsx src/components/quiz.tsx src/components/lesson.tsx
git commit -m "Show title, daily mission, mastery and earned rewards to students" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Parent view — consistency, level and mastery per child

**Files:**
- Create: `src/components/rewards/child-insights.tsx`
- Modify: `src/components/dashboard.tsx` (`ChildPanel`, after the `child-summary` div ~line 385)

- [ ] **Step 1: Create the component**

`src/components/rewards/child-insights.tsx`:

```tsx
import { Flame } from "lucide-react";
import { lastDays, weekdayName } from "@/content/rewards";
import { MasteryList } from "./student-rewards";
import type { Mastery, RewardSummary } from "./types";

const n = (value: number) => value.toLocaleString("ar-KW");

export function ChildInsights({
  rewards,
  mastery,
}: {
  rewards: RewardSummary;
  mastery: Mastery;
}) {
  const days = lastDays(rewards.today, 14);
  const active = new Set(rewards.activeDays);
  const studied = days.filter((d) => active.has(d)).length;
  return (
    <div className="child-insights">
      <div className="insight-row">
        <span className="pill blue">
          {rewards.title} · المستوى {n(rewards.level)}
        </span>
        <span className="muted-text">
          {n(rewards.xp)} خبرة · {n(rewards.coins)} عملة
        </span>
      </div>
      <div>
        <h4>الانتظام: {n(studied)} من ١٤ يومًا</h4>
        <ol className="streak-days small" aria-label="نشاط آخر ١٤ يومًا">
          {days.map((day) => (
            <li key={day} className={active.has(day) ? "on" : ""}>
              <Flame size={13} aria-hidden />
              <span className="sr-only">
                {weekdayName(day)}: {active.has(day) ? "يوم دراسة" : "بلا نشاط"}
              </span>
            </li>
          ))}
        </ol>
        <p className="muted-text">
          السلسلة الحالية {n(rewards.streak.current)} · الأطول{" "}
          {n(rewards.streak.best)}
        </p>
      </div>
      <MasteryList mastery={mastery} heading="ماذا فهم في المغذّيات؟" />
    </div>
  );
}
```

`MasteryList` lives in a `"use client"` module; importing it here is fine because `ChildPanel` is itself inside the client `Dashboard`.

- [ ] **Step 2: Render it in `ChildPanel`**

In `src/components/dashboard.tsx` import `import { ChildInsights } from "./rewards/child-insights";` and, directly after the closing `</div>` of `<div className="child-summary">`, add:

```tsx
      <ChildInsights rewards={child.rewards} mastery={child.mastery} />
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit` → no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/rewards/child-insights.tsx src/components/dashboard.tsx
git commit -m "Show parents each child's study consistency, level and concept mastery" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Browser test, build and full verification

**Files:**
- Create: `tests/browser/rewards.spec.ts`

- [ ] **Step 1: Write the end-to-end test**

`tests/browser/rewards.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("a student earns XP for a lesson step and the daily mission shows as done", async ({
  page,
}) => {
  const stamp = Date.now();
  const username = `rw-${stamp}`;
  const register = await page.request.post("/api/register", {
    data: {
      name: "ولي أمر المكافآت",
      email: `rw-${stamp}@example.test`,
      password: "Test-password-9876",
      children: [
        { name: "نور", username, pin: "73918264", grade: 8, gender: "female" },
      ],
    },
  });
  expect(register.ok()).toBeTruthy();
  const login = await page.request.post("/api/student-login", {
    data: { username, pin: "73918264" },
  });
  expect(login.ok()).toBeTruthy();

  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "مستكشفة مبتدئة", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "أنجزي نشاطًا واحدًا اليوم" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "ابدئي مهمة اليوم" }).click();
  await page
    .getByRole("button", { name: "فهمت، أنجزت هذا المقطع", exact: true })
    .first()
    .click();
  await expect(page.getByText(/خبرة!/)).toBeVisible();

  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "أنجزتِ مهمة اليوم، نكمّل بكرة" }),
  ).toBeVisible();
  await expect(page.getByText("مقطع من الدرس")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
});
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 3: Run the browser suites**

Run: `npx playwright test tests/browser/rewards.spec.ts tests/browser/learning.spec.ts tests/browser/accessibility.spec.ts`
Expected: PASS. If an axe violation appears on the dashboard, fix the markup (labels, contrast) rather than excluding the rule.

- [ ] **Step 4: Check the phone width by eye**

Run the app (`npm run start`), sign in as the student from the test, and view `/dashboard` at 360 px wide. Hero, mission card and streak dots stack vertically with no horizontal scrolling.

- [ ] **Step 5: Commit**

```bash
git add tests/browser/rewards.spec.ts
git commit -m "Add browser test for the daily mission and lesson XP" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Record the rules

**Files:**
- Modify: `docs/IMPLEMENTATION-STATUS.md` (append a section)

- [ ] **Step 1: Append the section**

```markdown
## Rewards (Phase 1)

- Study day = midnight Asia/Kuwait. Only learning actions count (lesson section, practice, quiz submission), not logging in.
- Daily reward: 20 XP + 10–50 coins (capped at day 5). Milestones at 7 and 30 days. Every 7th day earns a freeze (max 2) that covers one missed day.
- Quiz: XP = best score × 10 (max 1,000 per lesson); retakes pay only the improvement. Serious attempt (all answered): +20 XP once per lesson per day.
- XP sets level and title and never decreases; coins are kept for the Phase 2 shop; mastery per concept is separate from points.
- All grants go through `reward_ledger` with `UNIQUE(user_id, source, source_key)`, so every reward is paid at most once and is computed on the server.
- Numbers live in `src/server/rewards.mjs` and are provisional until real usage data exists.
```

- [ ] **Step 2: Commit**

```bash
git add docs/IMPLEMENTATION-STATUS.md
git commit -m "Docs: record the Phase 1 reward rules" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Deliberately not in this plan

- Shop, avatars and spending coins (Phase 2).
- Leaderboards, student of the week, public profiles (Phase 3, need parent consent flow).
- Per-lesson `progress` rows — progress stays one row per student until a second lesson ships.
- Rewards for watching videos (the video plan pays nothing for playback).
