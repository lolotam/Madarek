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
