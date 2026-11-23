"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowUpDown, PencilLine, Move, RotateCcw } from "lucide-react";
import {
  placementItems,
  placementStart,
  placementSurfaces,
  placementTargets,
} from "@/content/english-placement.mjs";
import { EnglishWords } from "./english-glossary";
import "./english-interactive.css";

export type FixPart = { text: string } | { choices: string[]; start: number };
export type PlaceExercise = {
  item: keyof typeof placementItems;
  surface: keyof typeof placementSurfaces;
};

type Controls = {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
};
const numbers = (value: string) => (value ? value.split(",").map(Number) : []);

export function SentenceOrdering({
  tiles,
  value,
  onChange,
  disabled,
}: Controls & { tiles: string[] }) {
  const chosen = numbers(value);
  return (
    <div className="school-interactive" data-exercise="order">
      <div className="school-exercise-title">
        <ArrowUpDown size={20} aria-hidden /> <strong>رتّب الجملة</strong>
      </div>
      <p>المس البطاقات بالترتيب. المس بطاقة في الجملة عشان ترجعها.</p>
      <div
        className="school-order-answer"
        dir="ltr"
        lang="en"
        aria-label="ترتيبك للجملة"
      >
        {tiles.map((_, index) => {
          const tile = chosen[index];
          return tile === undefined ? (
            <span className="school-order-slot" key={index}>
              {index + 1}
            </span>
          ) : (
            <button
              className="school-word-tile"
              key={index}
              type="button"
              disabled={disabled}
              onClick={() =>
                onChange(chosen.filter((_, i) => i !== index).join(","))
              }
            >
              <EnglishWords text={tiles[tile]} embedded />
            </button>
          );
        })}
      </div>
      <div
        className="school-tile-bank"
        dir="ltr"
        lang="en"
        aria-label="بطاقات ترتيب الجملة"
      >
        {tiles.map((tile, index) => (
          <button
            className="school-word-tile"
            type="button"
            key={index}
            data-practice-control
            disabled={disabled || chosen.includes(index)}
            onClick={() => onChange([...chosen, index].join(","))}
          >
            <EnglishWords text={tile} embedded />
          </button>
        ))}
      </div>
      {chosen.length > 0 && (
        <button
          className="school-exercise-clear"
          type="button"
          disabled={disabled}
          onClick={() => onChange("")}
        >
          <RotateCcw size={15} aria-hidden /> امسح الترتيب
        </button>
      )}
    </div>
  );
}

const marks: Record<string, string> = {
  ".": "نقطة",
  "?": "علامة استفهام",
  "!": "علامة تعجب",
};

export function SentenceCorrection({
  parts,
  value,
  onChange,
  disabled,
}: Controls & { parts: FixPart[] }) {
  const [active, setActive] = useState<number | null>(null);
  const edits = parts.filter((part) => "choices" in part);
  const current = value ? numbers(value) : edits.map((part) => part.start);
  let editIndex = 0;

  return (
    <div className="school-interactive" data-exercise="fix">
      <div className="school-exercise-title">
        <PencilLine size={20} aria-hidden /> <strong>محقق الأخطاء</strong>
      </div>
      <p>المس جزء من الأجزاء الملوّنة واختار التصحيح.</p>
      <div className="school-fix-line" dir="ltr" lang="en">
        {parts.map((part, index) => {
          if ("text" in part)
            return (
              <span key={index}>
                <EnglishWords text={part.text} />
              </span>
            );
          const edit = editIndex++;
          const text = part.choices[current[edit]];
          return (
            <button
              className="school-word-tile"
              type="button"
              key={index}
              data-practice-control
              disabled={disabled}
              aria-expanded={active === edit}
              aria-label={marks[text] ? "عدّل علامة الترقيم" : `عدّل ${text}`}
              onClick={() => setActive(active === edit ? null : edit)}
            >
              <EnglishWords text={text} embedded />
            </button>
          );
        })}
      </div>
      {active !== null && (
        <div className="school-tile-bank" dir="ltr" lang="en">
          {edits[active].choices.map((choice, index) => (
            <button
              className="school-word-tile"
              type="button"
              key={choice}
              disabled={disabled}
              aria-label={marks[choice]}
              aria-pressed={current[active] === index}
              onClick={() => {
                onChange(
                  current
                    .map((number, position) =>
                      position === active ? index : number,
                    )
                    .join(","),
                );
                setActive(null);
              }}
            >
              <EnglishWords text={choice} embedded />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type Point = { x: number; y: number };
type Target = keyof typeof placementTargets;
const targetList = Object.entries(placementTargets) as [
  Target,
  (typeof placementTargets)[Target],
][];

export function ScenePlacement({
  exercise,
  value,
  onChange,
  disabled,
}: Controls & { exercise: PlaceExercise }) {
  const [picked, setPicked] = useState(false);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [hasModel, setHasModel] = useState(false);
  const field = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const renderer = useRef<{
    move: (point: Point) => void;
    dispose: () => void;
  } | null>(null);
  const drag = useRef<{ start: Point; moved: boolean } | null>(null);
  const skipClick = useRef(false);
  const position =
    pointer ?? placementTargets[value as Target] ?? placementStart;
  const latest = useRef<Point>(position);

  useEffect(() => {
    let active = true;
    import("./english-placement-scene.mjs")
      .then(({ showPlacement }) => {
        if (!active || !canvas.current) return;
        renderer.current = showPlacement(
          canvas.current,
          exercise,
          latest.current,
        );
        setHasModel(!!renderer.current);
      })
      .catch(() => {});
    return () => {
      active = false;
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, [exercise]);

  useEffect(() => {
    latest.current = position;
    renderer.current?.move(position);
  }, [position]);

  function choose(target: Target) {
    if (disabled) return;
    setPicked(false);
    onChange(target);
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    const bounds = field.current?.getBoundingClientRect();
    if (!current || !bounds || disabled) return;
    if (
      !current.moved &&
      Math.hypot(
        event.clientX - current.start.x,
        event.clientY - current.start.y,
      ) < 7
    )
      return;
    current.moved = true;
    setPicked(true);
    const clamp = (v: number) => Math.min(0.94, Math.max(0.06, v));
    setPointer({
      x: clamp((event.clientX - bounds.left) / bounds.width),
      y: clamp((event.clientY - bounds.top) / bounds.height),
    });
  }

  function finish(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    drag.current = null;
    setPointer(null);
    if (!current?.moved) return;
    skipClick.current = true;
    const bounds = field.current?.getBoundingClientRect();
    if (!bounds) return;
    for (const [target, point] of targetList) {
      if (
        Math.hypot(
          event.clientX - bounds.left - point.x * bounds.width,
          event.clientY - bounds.top - point.y * bounds.height,
        ) < 45
      ) {
        choose(target);
        break;
      }
    }
  }

  const item = placementItems[exercise.item];
  const surface = placementSurfaces[exercise.surface];
  return (
    <div className="school-interactive" data-exercise="place">
      <div className="school-exercise-title">
        <Move size={20} aria-hidden /> <strong>حرّك القطعة</strong>
      </div>
      <p>اسحب {item.name} للمكان المطلوب، أو المس القطعة وبعدها المكان.</p>
      <div
        className="school-place-board"
        ref={field}
        data-model={hasModel ? "3d" : "fallback"}
      >
        <div className="school-place-canvas" ref={canvas} aria-hidden />
        {!hasModel && (
          <div className="school-place-fallback" aria-hidden>
            {surface.icon} <span>{surface.name}</span>
          </div>
        )}
        {targetList.map(([key, point], index) => (
          <button
            key={key}
            type="button"
            className="school-place-target"
            data-position={key}
            data-picked={picked ? "" : undefined}
            disabled={disabled}
            aria-label={`${point.label} ${surface.name}`}
            aria-pressed={value === key}
            style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
            onClick={() => choose(key)}
          >
            {index + 1}
          </button>
        ))}
        <button
          className="school-place-item"
          type="button"
          data-practice-control
          data-place-item
          disabled={disabled}
          aria-label={`حرّك ${item.name}`}
          aria-pressed={picked}
          style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}
          onPointerDown={(event) => {
            if (disabled || event.button !== 0) return;
            skipClick.current = false;
            drag.current = {
              start: { x: event.clientX, y: event.clientY },
              moved: false,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={() => {
            drag.current = null;
            setPointer(null);
          }}
          onClick={() => {
            if (skipClick.current) {
              skipClick.current = false;
              return;
            }
            setPicked((state) => !state);
          }}
        >
          {!hasModel && <span aria-hidden>{item.icon}</span>}
        </button>
      </div>
    </div>
  );
}
