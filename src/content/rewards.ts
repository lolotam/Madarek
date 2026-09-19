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
