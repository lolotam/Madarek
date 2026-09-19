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
