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
