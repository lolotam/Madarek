"use client";
import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Lightbulb,
  ListOrdered,
  RotateCcw,
  Shapes,
  Sparkles,
} from "lucide-react";
import { journeys, nutrients } from "@/content/nutrients";
import { NutrientIcon } from "./nutrient-icon";

type Mode = keyof typeof journeys;

// ---------------------------------------------------------------------------
// Drill 1 — put the journey back in order
// ---------------------------------------------------------------------------

// Fixed opening scrambles: a random shuffle during render would differ between
// the server and the browser and break hydration. Reshuffling happens only
// when the student asks for another round.
const SCRAMBLES: Record<Mode, number[][]> = {
  energy: [
    [2, 0, 1],
    [1, 2, 0],
    [2, 1, 0],
  ],
  repair: [
    [1, 2, 0],
    [2, 0, 1],
    [0, 2, 1],
  ],
};
const arabicIndex = ["١", "٢", "٣"];

export function JourneyOrder() {
  const [mode, setMode] = useState<Mode>("energy");
  const [round, setRound] = useState(0);
  const [order, setOrder] = useState(SCRAMBLES.energy[0]);
  const [checked, setChecked] = useState(false);
  const reduce = useReducedMotion();
  const journey = journeys[mode];
  const solved = checked && order.every((step, index) => step === index);

  function restart(next: Mode, nextRound: number) {
    const options = SCRAMBLES[next];
    setMode(next);
    setRound(nextRound);
    setOrder(options[nextRound % options.length]);
    setChecked(false);
  }

  function move(from: number, direction: -1 | 1) {
    const to = from + direction;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[from], next[to]] = [next[to], next[from]];
    setOrder(next);
    setChecked(false);
  }

  return (
    <div className="drill order-drill">
      <div className="drill-head">
        <span className="drill-badge violet">
          <ListOrdered size={19} />
        </span>
        <div>
          <span className="eyebrow">رتّبي · نشاط</span>
          <h3>رتّبي خطوات {journey.name} من البداية إلى النهاية.</h3>
        </div>
      </div>
      <div className="segmented" role="group" aria-label="اختاري الرحلة">
        {(Object.keys(journeys) as Mode[]).map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${journeys[value].name} — نشاط الترتيب`}
            aria-pressed={mode === value}
            data-state={mode === value ? "active" : "inactive"}
            onClick={() => restart(value, 0)}
          >
            {journeys[value].name}
          </button>
        ))}
      </div>
      <ol className="order-list">
        {order.map((step, index) => {
          const card = journey.steps[step];
          const right = checked && step === index;
          const wrong = checked && step !== index;
          return (
            <motion.li
              key={card.name}
              layout={!reduce}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className={
                "order-card" + (right ? " right" : "") + (wrong ? " wrong" : "")
              }
            >
              <span className="order-rank">{arabicIndex[index]}</span>
              <span className="order-icon">
                <NutrientIcon name={card.icon} size={26} />
              </span>
              <b>{card.name}</b>
              {checked && (
                <span className="order-mark">
                  {right ? (
                    <>
                      <CheckCircle2 size={17} /> في مكانها
                    </>
                  ) : (
                    <>
                      <Lightbulb size={17} /> ليست هنا
                    </>
                  )}
                </span>
              )}
              <span className="order-moves">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`حرّكي ${card.name} لأعلى`}
                >
                  <ArrowUp size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === order.length - 1}
                  aria-label={`حرّكي ${card.name} لأسفل`}
                >
                  <ArrowDown size={18} />
                </button>
              </span>
            </motion.li>
          );
        })}
      </ol>
      <div className="button-row">
        <button
          className="button primary"
          type="button"
          onClick={() => setChecked(true)}
        >
          <CheckCircle2 size={18} /> تحقّقي من الترتيب
        </button>
        <button
          className="button outline small"
          type="button"
          onClick={() => restart(mode, round + 1)}
        >
          <RotateCcw size={17} /> ابدئي من جديد
        </button>
      </div>
      <div role="status" aria-live="polite">
        <AnimatePresence initial={false} mode="wait">
          {checked && (
            <motion.div
              key={solved ? "solved" : "retry" + order.join("")}
              className={"feedback " + (solved ? "success" : "retry")}
              initial={{ opacity: 0, y: reduce ? 0 : -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
            >
              {solved ? <Sparkles size={20} /> : <Lightbulb size={20} />}
              <p>
                {solved
                  ? `أحسنتِ! ${journey.steps.map((s) => s.name).join(" ← ")}.`
                  : "البطاقات الملوّنة بالكهرماني ليست في مكانها بعد. حرّكيها بالسهمين وحاولي مرة أخرى."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="micro-copy">
        تدريب خارج الدرجة النهائية. الترتيب نموذج مبسّط لما يحدث في الجسم.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drill 2 — sort the nutrients into major / minor
// ---------------------------------------------------------------------------

const bins = [
  {
    id: "major" as const,
    name: "المغذّيات الكبرى",
    hint: "نحتاج منها كميات كبيرة",
  },
  {
    id: "minor" as const,
    name: "المغذّيات الصغرى",
    hint: "نحتاج منها كميات قليلة",
  },
];
const binName = (group: string) =>
  bins.find((bin) => bin.id === group)?.name ?? group;
const binHint = (group: string) =>
  bins.find((bin) => bin.id === group)?.hint ?? "";

function TrayChip({
  nutrient,
  selected,
  shakeToken,
  onSelect,
}: {
  nutrient: (typeof nutrients)[number];
  selected: boolean;
  shakeToken: number;
  onSelect: () => void;
}) {
  const controls = useAnimationControls();
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!shakeToken || reduce) return;
    controls.start({
      x: [0, -9, 9, -6, 6, 0],
      transition: { duration: 0.42 },
    });
  }, [shakeToken, controls, reduce]);
  return (
    <motion.button
      type="button"
      layoutId={"sort-" + nutrient.id}
      animate={controls}
      className={"sort-chip " + nutrient.color + (selected ? " selected" : "")}
      aria-label={`${nutrient.name} — اختاريها للتصنيف`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <NutrientIcon name={nutrient.icon} size={22} />
      {nutrient.name}
    </motion.button>
  );
}

/**
 * Pick a nutrient, then pick the row it belongs to. Tap-then-place instead of
 * dragging: it works with a finger, a mouse and a keyboard alike. Every answer
 * is corrected on the spot — right ones settle into the row, wrong ones shake
 * back and say why.
 */
export function NutrientSort() {
  const [selected, setSelected] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [shakes, setShakes] = useState<Record<string, number>>({});
  const [misses, setMisses] = useState(0);
  const [note, setNote] = useState<{
    tone: "success" | "retry";
    text: string;
  }>();
  const reduce = useReducedMotion();
  const remaining = nutrients.filter((n) => !placed[n.id]);
  const done = remaining.length === 0;

  function place(group: string) {
    const nutrient = nutrients.find((n) => n.id === selected);
    if (!nutrient) return;
    if (nutrient.group === group) {
      setPlaced((previous) => ({ ...previous, [nutrient.id]: group }));
      setSelected(null);
      setNote({
        tone: "success",
        text: `أحسنتِ! ${nutrient.name} من ${binName(group)}: ${binHint(group)}.`,
      });
      return;
    }
    setShakes((previous) => ({
      ...previous,
      [nutrient.id]: (previous[nutrient.id] ?? 0) + 1,
    }));
    setMisses((count) => count + 1);
    setNote({
      tone: "retry",
      text: `ليس هنا. ${nutrient.name} من ${binName(nutrient.group)}: ${binHint(nutrient.group)}.`,
    });
  }

  function reset() {
    setPlaced({});
    setSelected(null);
    setShakes({});
    setMisses(0);
    setNote(undefined);
  }

  return (
    <div className="drill sort-drill">
      <div className="drill-head">
        <span className="drill-badge amber">
          <Shapes size={19} />
        </span>
        <div>
          <span className="eyebrow">صنّفي · نشاط</span>
          <h3>ضعي كل مغذٍّ في صفّه الصحيح.</h3>
        </div>
      </div>
      <p className="sort-steps">
        اختاري مغذّيًا من الأعلى، ثم اضغطي الصف الذي تظنينه صحيحًا.
        <span className="sort-progress">
          صُنِّف {nutrients.length - remaining.length} من {nutrients.length}
        </span>
      </p>
      <div className="sort-tray" aria-label="المغذّيات التي لم تُصنَّف بعد">
        {remaining.map((nutrient) => (
          <TrayChip
            key={nutrient.id}
            nutrient={nutrient}
            selected={selected === nutrient.id}
            shakeToken={shakes[nutrient.id] ?? 0}
            onSelect={() =>
              setSelected(selected === nutrient.id ? null : nutrient.id)
            }
          />
        ))}
        {done && (
          <span className="sort-tray-empty">
            <CheckCircle2 size={18} /> انتهت البطاقات
          </span>
        )}
      </div>
      <div className="sort-bins">
        {bins.map((bin) => {
          const inside = nutrients.filter((n) => placed[n.id] === bin.id);
          return (
            <button
              key={bin.id}
              type="button"
              className={"sort-bin " + bin.id}
              disabled={!selected}
              onClick={() => place(bin.id)}
            >
              <span className="sort-bin-head">
                <b>{bin.name}</b>
                <small>{bin.hint}</small>
              </span>
              <span className="sort-bin-body">
                {inside.map((nutrient) => (
                  <motion.span
                    key={nutrient.id}
                    layoutId={"sort-" + nutrient.id}
                    className={"sort-chip placed " + nutrient.color}
                  >
                    <NutrientIcon name={nutrient.icon} size={20} />
                    {nutrient.name}
                    <CheckCircle2 size={16} />
                  </motion.span>
                ))}
                {!inside.length && (
                  <small className="sort-bin-empty">
                    {selected ? "اضغطي لوضع البطاقة هنا" : "لا شيء هنا بعد"}
                  </small>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <div role="status" aria-live="polite">
        <AnimatePresence initial={false} mode="wait">
          {(note || done) && (
            <motion.div
              key={done ? "done" : (note?.tone ?? "") + (note?.text ?? "")}
              className={
                "feedback " +
                (done || note?.tone === "success" ? "success" : "retry")
              }
              initial={{ opacity: 0, y: reduce ? 0 : -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
            >
              {done || note?.tone === "success" ? (
                <CheckCircle2 size={20} />
              ) : (
                <Lightbulb size={20} />
              )}
              <p>
                {done
                  ? misses
                    ? `اكتمل التصنيف! ${misses} محاولة لم تكن في مكانها، وهذا جزء طبيعي من التعلّم.`
                    : "اكتمل التصنيف من أول محاولة في كل بطاقة. عمل ممتاز!"
                  : note?.text}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {done && (
        <button className="button outline small" type="button" onClick={reset}>
          <RotateCcw size={17} /> أعيدي النشاط
        </button>
      )}
      <p className="micro-copy">
        كبرى وصغرى تصفان الكمية التي يحتاجها الجسم، لا أهمية المغذّي.
      </p>
    </div>
  );
}
