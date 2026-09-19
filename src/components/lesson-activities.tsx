"use client";
import { useState } from "react";
import Image from "next/image";
import * as Tabs from "@radix-ui/react-tabs";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Lightbulb,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
} from "lucide-react";
import { nutrients, foods } from "@/content/nutrients";
import { NutrientIcon } from "./nutrient-icon";
import { api } from "./providers";

export function ConceptTree() {
  const [group, setGroup] = useState("major"),
    [selected, setSelected] = useState("carbs");
  const nutrient = nutrients.find((n) => n.id === selected)!;
  return (
    <div className="concept-card">
      <div className="tree-root">
        <Sparkles size={23} />
        <strong>المغذّيات</strong>
        <span>للنمو والطاقة والصحة</span>
      </div>
      <div className="tree-stem" />
      <Tabs.Root
        dir="rtl"
        value={group}
        onValueChange={(value) => {
          setGroup(value);
          setSelected(value === "major" ? "carbs" : "vitamins");
        }}
      >
        <Tabs.List className="tree-branches" aria-label="تصنيف المغذيات">
          <Tabs.Trigger value="major">
            <b>المغذّيات الكبرى</b>
            <span>نحتاجها بكميات كبيرة</span>
          </Tabs.Trigger>
          <Tabs.Trigger value="minor">
            <b>المغذّيات الصغرى</b>
            <span>نحتاجها بكميات قليلة</span>
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value={group}>
          <div className="nutrient-nodes">
            {nutrients
              .filter((n) => n.group === group)
              .map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSelected(n.id)}
                  aria-pressed={selected === n.id}
                  className={
                    "nutrient-node " +
                    n.color +
                    (selected === n.id ? " selected" : "")
                  }
                >
                  <NutrientIcon name={n.icon} />
                  <span>{n.name}</span>
                </button>
              ))}
          </div>
        </Tabs.Content>
      </Tabs.Root>
      <AnimatePresence mode="wait">
        <motion.div
          key={selected}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={"nutrient-detail " + nutrient.color}
          aria-live="polite"
        >
          <div className="detail-icon">
            <NutrientIcon name={nutrient.icon} size={40} />
          </div>
          <div>
            <span className="eyebrow">{nutrient.tag}</span>
            <h3>{nutrient.name}</h3>
            <p>{nutrient.function}</p>
            <div className="detail-examples">
              <b>نجدها في:</b> {nutrient.examples}
            </div>
            <p className="insight">
              <Lightbulb size={17} />
              {nutrient.note}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
      <p className="micro-copy">
        اضغطي على أي مغذٍ لتكتشفي دوره ومصادره. كبرى وصغرى تصفان الكمية، وليس
        الأهمية.
      </p>
    </div>
  );
}

export function FoodExplorer() {
  const [selected, setSelected] = useState("oats");
  const food = foods.find((f) => f.id === selected)!;
  return (
    <div className="food-lab">
      <div className="food-options" aria-label="اختاري طعامًا">
        {foods.map((f) => (
          <button
            className={
              "food-option " + f.color + (selected === f.id ? " selected" : "")
            }
            key={f.id}
            onClick={() => setSelected(f.id)}
            aria-pressed={selected === f.id}
          >
            <Image
              src={f.image}
              alt=""
              width={52}
              height={52}
              className="food-option-photo"
            />
            <span>{f.name}</span>
          </button>
        ))}
      </div>
      <div className={"food-reveal " + food.color}>
        <motion.div
          key={selected}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="food-symbol"
        >
          <Image
            src={food.image}
            alt={food.imageAlt}
            fill
            sizes="(max-width: 767px) 180px, 200px"
          />
        </motion.div>
        <div aria-live="polite">
          <span className="eyebrow">لننظر داخل {food.name}</span>
          <h3>{food.main}</h3>
          <span className="food-also">ومعه: {food.also}</span>
          <p>{food.description}</p>
        </div>
      </div>
      <p className="insight">
        <Info size={17} /> هذه أمثلة تعليمية؛ معظم الأطعمة تحتوي أكثر من نوع من
        المغذّيات.
      </p>
    </div>
  );
}

export function EnergyLab() {
  const [mode, setMode] = useState<"energy" | "repair">("energy"),
    [step, setStep] = useState(0);
  const steps =
    mode === "energy"
      ? [
          {
            name: "الكربوهيدرات",
            text: "نبدأ بطعام يحتوي كربوهيدرات، مثل الخبز أو الأرز.",
            icon: "wheat",
          },
          {
            name: "الجلوكوز",
            text: "يحوّل الجسم الكربوهيدرات إلى سكريات بسيطة، أهمها الجلوكوز.",
            icon: "blocks",
          },
          {
            name: "طاقة للخلايا",
            text: "تستخدم الخلايا الجلوكوز للحصول على الطاقة اللازمة لأداء وظائفها.",
            icon: "leaf",
          },
        ]
      : [
          {
            name: "مصدر للبروتين",
            text: "يمكن أن يأتي البروتين من البيض أو الحليب أو البقوليات مثل العدس.",
            icon: "beans",
          },
          {
            name: "البناء والإصلاح",
            text: "يستخدم الجسم مكوّنات البروتينات لبناء العضلات وإصلاح الأنسجة التالفة.",
            icon: "blocks",
          },
          {
            name: "دعم التئام الجروح",
            text: "هذا يفسّر أهمية البروتينات في التئام الجروح والنمو.",
            icon: "leaf",
          },
        ];
  return (
    <div className="energy-lab">
      <div className="segmented" role="group" aria-label="اختاري التجربة">
        {(
          [
            ["energy", "رحلة الطاقة"],
            ["repair", "البناء والإصلاح"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            data-state={mode === value ? "active" : "inactive"}
            onClick={() => {
              setMode(value);
              setStep(0);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="energy-steps">
        {steps.map((s, i) => (
          <div
            key={s.name}
            className={"energy-step " + (i <= step ? "lit" : "")}
          >
            <motion.div
              animate={{
                scale: i === step ? 1.08 : 1,
                opacity: i <= step ? 1 : 0.35,
              }}
            >
              <NutrientIcon name={s.icon} size={38} />
            </motion.div>
            <b>{s.name}</b>
            {i < 2 && <ArrowLeft className="flow-arrow" size={23} />}
          </div>
        ))}
      </div>
      <p className="experiment-caption" aria-live="polite">
        {steps[step].text}
      </p>
      <div className="button-row">
        <button
          className="button primary"
          onClick={() => setStep((step + 1) % 3)}
        >
          {step === 2 ? <RotateCcw size={18} /> : <Play size={18} />}{" "}
          {step === 2 ? "أعيدي التجربة" : "الخطوة التالية"}
        </button>
        <span className="micro-copy">{step + 1} / ٣ · نموذج مبسّط للفهم</span>
      </div>
    </div>
  );
}

export function Practice() {
  const [choice, setChoice] = useState<string | null>(null),
    [answer, setAnswer] = useState(""),
    [feedback, setFeedback] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function review() {
    setBusy(true);
    setError("");
    try {
      const data = await api("practice", { answer });
      setFeedback(data.feedback);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="practice-grid">
      <div className="practice-card">
        <span className="pill blue">اختاري · تدريب</span>
        <h3>يحتاج الجسم إلى الفيتامينات بكميات…</h3>
        <div className="practice-choices">
          {["كبيرة", "قليلة"].map((c) => (
            <button
              className={"choice " + (choice === c ? "selected" : "")}
              onClick={() => setChoice(c)}
              key={c}
            >
              {c}
              {choice === c && <Check size={18} />}
            </button>
          ))}
        </div>
        {choice && (
          <div
            className={"feedback " + (choice === "قليلة" ? "success" : "retry")}
            role="status"
          >
            {choice === "قليلة" ? (
              <CheckCircle2 size={20} />
            ) : (
              <Lightbulb size={20} />
            )}
            <p>
              {choice === "قليلة"
                ? "أحسنتِ! الفيتامينات من المغذّيات الصغرى."
                : "فكّري مجددًا: الفيتامينات من المغذّيات الصغرى، فنحتاجها بكميات قليلة."}
            </p>
          </div>
        )}
        <p className="micro-copy">
          تذكّري: القليل في الكمية قد يكون كبيرًا في الأهمية.
        </p>
      </div>
      <div className="practice-card">
        <span className="pill yellow">علّلي · نفكّر معًا</span>
        <h3>لماذا تُنصح المصابة بجرح بتناول البروتينات ضمن غذائها؟</h3>
        <label className="field">
          <span>اكتبي الفكرة بأسلوبك</span>
          <textarea
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              setFeedback("");
            }}
            maxLength={1500}
            rows={3}
            placeholder="لأن البروتينات تساعد على…"
          />
        </label>
        <button
          className="button outline small"
          disabled={busy || !answer.trim()}
          onClick={review}
        >
          {busy ? "جارٍ الحفظ…" : "قارني بالإجابة النموذجية"}
          <ArrowLeft size={17} />
        </button>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {feedback && (
          <div className="feedback success" role="status">
            <Lightbulb size={21} />
            <div>
              <b>الفكرة الأساسية</b>
              <p>{feedback}</p>
              <small>هل ذكرتِ إصلاح الأنسجة والتئام الجروح؟</small>
            </div>
          </div>
        )}
        <p className="micro-copy">
          تدريب خارج الدرجة النهائية. التقييم بالذكاء الاصطناعي لم يُفعّل بعد؛
          المعروض إجابة نموذجية.
        </p>
      </div>
    </div>
  );
}
