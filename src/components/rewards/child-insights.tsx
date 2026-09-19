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
