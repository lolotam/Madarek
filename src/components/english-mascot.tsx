"use client";

import "./english-mascot.css";
import {
  defaultEnglishMascot,
  englishMascots,
} from "@/content/english-mascots.mjs";
import { EnglishWords } from "./english-glossary";

const imagePath = (name: string) => `/english/mascots/${name}`;
const reactions = {
  idle: { animation: "idle", message: "أنا معاك." },
  correct: { animation: "correct", message: "أحسنت!" },
  retry: { animation: "retry", message: "حاول مرة تانية!" },
  partial: { animation: "retry", message: "قربت! جرّب تاني." },
  pending: { animation: "idle", message: "إجابتك قيد المراجعة." },
};

export function EnglishMascotChoice({
  name = "englishMascot",
  value,
  onChange,
  initial,
}: {
  name?: string;
  value?: string;
  initial?: string | null;
  onChange?: (id: string) => void;
}) {
  return (
    <fieldset className="school-mascot-choice">
      <legend>اختار مساعدك</legend>
      <div>
        {englishMascots.map((mascot) => (
          <label className="school-mascot-option" key={mascot.id}>
            <input
              type="radio"
              name={name}
              value={mascot.id}
              {...(value !== undefined
                ? {
                    checked: value === mascot.id,
                    onChange: () => onChange?.(mascot.id),
                  }
                : {
                    defaultChecked:
                      (initial || defaultEnglishMascot) === mascot.id,
                  })}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${imagePath(mascot.id)}/portrait.webp`}
              alt=""
              width="68"
              height="68"
            />
            <span>{mascot.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function EnglishMascot({
  selected,
  outcome,
  hint,
}: {
  selected?: string | null;
  outcome: keyof typeof reactions;
  hint?: string;
}) {
  const mascot =
    englishMascots.find((item) => item.id === selected) ?? englishMascots[0];
  const { animation, message } = reactions[outcome];
  const reacting = outcome !== "idle";
  return (
    <aside
      key={mascot.id + outcome}
      className="school-mascot"
      data-reaction={reacting ? outcome : undefined}
      aria-label={`${mascot.name}، مساعدك في الإنجليزي`}
    >
      <picture>
        <source
          media="(prefers-reduced-motion: reduce)"
          srcSet={`${imagePath(mascot.id)}/portrait.webp`}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${imagePath(mascot.id)}/${animation}.gif`}
          width="108"
          height="108"
          alt=""
        />
      </picture>
      <div>
        <strong>{reacting ? message : mascot.name}</strong>
        <span>{reacting ? mascot.name : message}</span>
        {hint && (
          <p className="school-mascot-hint">
            <EnglishWords text={hint} />
          </p>
        )}
      </div>
    </aside>
  );
}
