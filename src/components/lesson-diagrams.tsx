"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Wheat,
  Blocks,
  Bean,
  Zap,
  HeartPulse,
  Sparkles,
  Info,
} from "lucide-react";
import {
  foodLinks,
  foods,
  journeys,
  linkLabels,
  nutrients,
  type FoodLinkKind,
} from "@/content/nutrients";

// ---------------------------------------------------------------------------
// Animated journey art (energy / repair)
// ---------------------------------------------------------------------------

// Two cubic segments, drawn right to left so the flow reads with the Arabic
// page: source (x 548) → conversion (x 320) → body (x 96).
const SEGMENTS = [
  [548, 92, 466, 40, 402, 144, 320, 92],
  [320, 92, 238, 40, 174, 144, 96, 92],
] as const;
const TUBE = "M 548 92 C 466 40 402 144 320 92 C 238 40 174 144 96 92";
const STATIONS = [548, 320, 96];

/**
 * Points along one cubic segment. The travelling particles are keyframed from
 * the same control points that draw the tube, so a particle can never drift
 * off the pipe the way an `offset-path` fallback would.
 */
function pointsOn(segment: readonly number[], count: number) {
  const points: number[][] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count,
      u = 1 - t;
    const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    points.push([
      w[0] * segment[0] +
        w[1] * segment[2] +
        w[2] * segment[4] +
        w[3] * segment[6],
      w[0] * segment[1] +
        w[1] * segment[3] +
        w[2] * segment[5] +
        w[3] * segment[7],
    ]);
  }
  return points;
}
const TRAILS = SEGMENTS.map((segment) => pointsOn(segment, 16));

const art = {
  energy: {
    tint: "var(--amber)",
    ink: "var(--amber-ink)",
    soft: "var(--amber-soft)",
    icons: [Wheat, Blocks, Zap],
    grain: "square",
  },
  repair: {
    tint: "var(--violet)",
    ink: "var(--violet-ink)",
    soft: "var(--violet-soft)",
    icons: [Bean, Blocks, HeartPulse],
    grain: "round",
  },
} as const;

/**
 * The lab illustration: food on the right breaks into small units that travel
 * to the body on the left. Decorative — the step chips and the caption below
 * it carry the meaning, so this is hidden from assistive technology and stands
 * still when the visitor asked for reduced motion.
 */
export function JourneyArt({
  mode,
  step,
}: {
  mode: keyof typeof journeys;
  step: number;
}) {
  const reduce = useReducedMotion();
  const theme = art[mode];
  const trail = TRAILS[Math.max(0, step - 1)];
  const moving = step > 0;
  return (
    <svg
      className="journey-art"
      viewBox="0 0 640 184"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <path className="journey-tube" d={TUBE} />
      <motion.path
        className="journey-tube-lit"
        d={TUBE}
        stroke={theme.tint}
        initial={false}
        animate={{ pathLength: step / 2 }}
        transition={{ duration: reduce ? 0 : 0.7, ease: "easeInOut" }}
      />
      {moving &&
        [0, 1, 2].map((particle) => {
          const from = trail[0];
          if (reduce) {
            // Standing still, the units rest along the middle of the segment
            // they would travel, clear of the station circles drawn over them.
            const rest =
              trail[Math.round(trail.length * (0.35 + particle * 0.15))];
            return (
              <circle
                key={particle}
                r={7}
                cx={rest[0]}
                cy={rest[1]}
                fill={theme.tint}
                opacity={0.85}
              />
            );
          }
          return (
            <motion.circle
              key={mode + step + particle}
              r={theme.grain === "square" ? 7 : 6}
              fill={theme.tint}
              initial={{ cx: from[0], cy: from[1], opacity: 0 }}
              animate={{
                cx: trail.map((p) => p[0]),
                cy: trail.map((p) => p[1]),
                opacity: [0, 1, 1, 1, 0.2],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                repeatDelay: 0.2,
                delay: particle * 0.45,
                ease: "linear",
              }}
            />
          );
        })}
      {STATIONS.map((x, index) => {
        const Icon = theme.icons[index];
        const lit = index <= step;
        return (
          <g key={x} style={{ color: lit ? theme.ink : "#b6abc4" }}>
            {index === 2 && step === 2 && !reduce && (
              <>
                {[0, 1].map((ring) => (
                  <motion.circle
                    key={ring}
                    cx={x}
                    cy={92}
                    r={34}
                    fill="none"
                    stroke={theme.tint}
                    strokeWidth={2}
                    initial={{ r: 34, opacity: 0.55 }}
                    animate={{ r: 60, opacity: 0 }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      delay: ring * 0.9,
                      ease: "easeOut",
                    }}
                  />
                ))}
              </>
            )}
            <motion.circle
              cx={x}
              cy={92}
              r={34}
              initial={false}
              animate={{ r: index === step ? 37 : 34 }}
              transition={{ duration: reduce ? 0 : 0.3 }}
              fill={lit ? theme.soft : "#f4f1f7"}
              stroke={lit ? theme.tint : "#e5ddea"}
              strokeWidth={2}
            />
            <Icon
              x={x - 17}
              y={75}
              width={34}
              height={34}
              strokeWidth={1.6}
              aria-hidden="true"
            />
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Relationship map (food ↔ nutrient)
// ---------------------------------------------------------------------------

type Line = {
  key: string;
  d: string;
  kind: FoodLinkKind;
  food: string;
  nutrient: string;
};
type Pick = { side: "food" | "nutrient"; id: string };

const foodName = (id: string) => foods.find((f) => f.id === id)?.name ?? id;
const nutrientName = (id: string) =>
  nutrients.find((n) => n.id === id)?.name ?? id;

/**
 * One food carries several nutrients, and one nutrient hides in several foods.
 * Tapping either side lights the links it belongs to; the sentence underneath
 * says the same thing in words, so nothing depends on seeing the curves.
 */
export function RelationMap() {
  const [pick, setPick] = useState<Pick>({ side: "food", id: "milk" });
  const [lines, setLines] = useState<Line[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const frame = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const reduce = useReducedMotion();

  const keep = useCallback((key: string, element: HTMLElement | null) => {
    if (element) nodes.current.set(key, element);
    else nodes.current.delete(key);
  }, []);

  const measure = useCallback(() => {
    const box = frame.current?.getBoundingClientRect();
    if (!box || !box.width) return;
    setSize({ width: box.width, height: box.height });
    const drawn: Line[] = [];
    for (const link of foodLinks) {
      const a = nodes.current.get("food:" + link.food)?.getBoundingClientRect();
      const b = nodes.current
        .get("nutrient:" + link.nutrient)
        ?.getBoundingClientRect();
      if (!a || !b) continue;
      // Foods sit in the right column (RTL first column), nutrients in the
      // left one, so the curve leaves a food at its left edge.
      const x1 = a.left - box.left,
        y1 = a.top - box.top + a.height / 2;
      const x2 = b.right - box.left,
        y2 = b.top - box.top + b.height / 2;
      const bend = x1 - (x1 - x2) / 2;
      drawn.push({
        key: link.food + "-" + link.nutrient,
        kind: link.kind,
        food: link.food,
        nutrient: link.nutrient,
        d: `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${bend.toFixed(1)} ${y1.toFixed(1)} ${bend.toFixed(1)} ${y2.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
      });
    }
    setLines(drawn);
  }, []);

  useEffect(() => {
    measure();
    const element = frame.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure]);

  const active = (line: Line) =>
    pick.side === "food" ? line.food === pick.id : line.nutrient === pick.id;
  const related = lines.filter(active);
  const linkedIds = new Set(
    related.map((line) => (pick.side === "food" ? line.nutrient : line.food)),
  );
  const sentence =
    pick.side === "food"
      ? `${foodName(pick.id)}: ` +
        related
          .map((l) => `${nutrientName(l.nutrient)} (${linkLabels[l.kind]})`)
          .join("، ")
      : `${nutrientName(pick.id)}: ` +
        related.map((l) => foodName(l.food)).join("، ");

  return (
    <div className="relation-map">
      <div className="relation-frame" ref={frame}>
        <svg
          className="relation-lines"
          viewBox={`0 0 ${size.width || 1} ${size.height || 1}`}
          width={size.width || undefined}
          height={size.height || undefined}
          aria-hidden="true"
          focusable="false"
        >
          {lines.map((line) => (
            <motion.path
              key={line.key}
              className={
                "relation-line " +
                line.kind +
                (active(line) ? " active" : " dim")
              }
              d={line.d}
              initial={false}
              animate={{ pathLength: 1 }}
              transition={{ duration: reduce ? 0 : 0.5, ease: "easeOut" }}
            />
          ))}
        </svg>
        <div className="relation-column">
          <span className="relation-head">أطعمة</span>
          {foods.map((food) => (
            <button
              key={food.id}
              type="button"
              ref={(element) => keep("food:" + food.id, element)}
              className={"relation-node " + food.color}
              aria-label={`${food.name} — اعرضي مغذّياته`}
              aria-pressed={pick.side === "food" && pick.id === food.id}
              data-linked={pick.side === "nutrient" && linkedIds.has(food.id)}
              onClick={() => setPick({ side: "food", id: food.id })}
            >
              {food.name}
            </button>
          ))}
        </div>
        <div className="relation-column">
          <span className="relation-head">مغذّيات</span>
          {nutrients.map((nutrient) => (
            <button
              key={nutrient.id}
              type="button"
              ref={(element) => keep("nutrient:" + nutrient.id, element)}
              className={"relation-node " + nutrient.color}
              aria-label={`${nutrient.name} — اعرضي الأطعمة التي تحتويه`}
              aria-pressed={pick.side === "nutrient" && pick.id === nutrient.id}
              data-linked={pick.side === "food" && linkedIds.has(nutrient.id)}
              onClick={() => setPick({ side: "nutrient", id: nutrient.id })}
            >
              {nutrient.name}
            </button>
          ))}
        </div>
      </div>
      <p className="relation-reading" aria-live="polite">
        <Sparkles size={17} />
        {related.length
          ? sentence
          : `${nutrientName(pick.id)}: لا يظهر في الأطعمة الأربعة المعروضة هنا، وله مصادر أخرى كثيرة.`}
      </p>
      <ul className="relation-legend">
        {(Object.keys(linkLabels) as FoodLinkKind[]).map((kind) => (
          <li key={kind}>
            <span className={"legend-swatch " + kind} />
            {linkLabels[kind]}
          </li>
        ))}
      </ul>
      <p className="insight">
        <Info size={17} /> الخطوط تصل الطعام بمغذّياته. لاحظي أن مغذّيًا واحدًا
        قد يأتي من أكثر من طعام، والعكس صحيح.
      </p>
    </div>
  );
}
