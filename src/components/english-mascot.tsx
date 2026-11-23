"use client";

import "./english-mascot.css";
import {
  defaultEnglishMascot,
  englishMascots,
} from "@/content/english-mascots.mjs";

const imagePath = (name: string) => `/english/mascots/${name}`;

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
}: {
  selected?: string | null;
  outcome: "idle" | "correct" | "retry";
}) {
  const mascot =
    englishMascots.find((item) => item.id === selected) ?? englishMascots[0];
  const message =
    outcome === "correct"
      ? "أحسنت!"
      : outcome === "retry"
        ? "حاول مرة تانية!"
        : "أنا معاك.";
  return (
    <aside
      key={mascot.id + outcome}
      className="school-mascot"
      aria-label={`${mascot.name}، مساعدك في الإنجليزي`}
    >
      <picture>
        <source
          media="(prefers-reduced-motion: reduce)"
          srcSet={`${imagePath(mascot.id)}/portrait.webp`}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${imagePath(mascot.id)}/${outcome}.gif`}
          width="108"
          height="108"
          alt=""
        />
      </picture>
      <div>
        <strong>{mascot.name}</strong>
        <span>{message}</span>
      </div>
    </aside>
  );
}
