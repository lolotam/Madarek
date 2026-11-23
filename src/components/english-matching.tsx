"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";

export type MatchOptions = { left: string[]; right: string[] };
type Point = { x: number; y: number };
type Drag = { left: number; start: Point; moved: boolean };
const lineColors = ["#6243b4", "#17745d", "#9a5223", "#23669f"];

export function MatchingBoard({
  options,
  value,
  onChange,
  disabled,
  results,
}: {
  options: MatchOptions;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  results?: boolean[];
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [, resize] = useState(0);
  const board = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<Drag | null>(null);
  const skipClick = useRef(false);
  const pairs = options.left.map((_, index) =>
    Number(value.split(",")[index] ?? -1),
  );
  const connected = pairs.filter((index) => index >= 0).length;

  function connect(left: number, right: number) {
    const next = [...pairs];
    const oldLeft = next.indexOf(right);
    if (oldLeft !== -1 && oldLeft !== left) next[oldLeft] = next[left];
    next[left] = right;
    setSelected(null);
    onChange(next.join(","));
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, left: number) {
    if (disabled || event.button !== 0) return;
    skipClick.current = false;
    drag.current = {
      left,
      start: { x: event.clientX, y: event.clientY },
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current) return;
    if (
      Math.hypot(
        current.start.x - event.clientX,
        current.start.y - event.clientY,
      ) < 8 &&
      !current.moved
    )
      return;
    current.moved = true;
    setSelected(current.left);
    setPointer({ x: event.clientX, y: event.clientY });
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    drag.current = null;
    setPointer(null);
    if (!current?.moved) return;
    skipClick.current = true;
    const hit = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLButtonElement>("[data-match-right]");
    if (hit && board.current?.contains(hit))
      connect(current.left, Number(hit.dataset.matchRight));
  }

  useEffect(() => {
    const observer = new ResizeObserver(() => resize((version) => version + 1));
    if (board.current) observer.observe(board.current);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const box = board.current;
    const surface = canvas.current;
    const ctx = surface?.getContext("2d");
    if (!box || !surface || !ctx) return;
    const bounds = box.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(bounds.width * scale);
    const height = Math.round(bounds.height * scale);
    if (surface.width !== width) surface.width = width;
    if (surface.height !== height) surface.height = height;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, bounds.width, bounds.height);

    function endpoint(side: "left" | "right", index: number) {
      const rect = box
        ?.querySelector(`[data-match-${side}="${index}"]`)
        ?.getBoundingClientRect();
      if (!rect) return null;
      return {
        x: (side === "left" ? rect.right : rect.left) - bounds.left,
        y: (rect.top + rect.bottom) / 2 - bounds.top,
      };
    }

    function line(from: Point, to: Point, color: string, dashed = false) {
      if (!ctx) return;
      const bend = Math.max(12, (to.x - from.x) * 0.5);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.setLineDash(dashed ? [7, 7] : []);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.bezierCurveTo(from.x + bend, from.y, to.x - bend, to.y, to.x, to.y);
      ctx.stroke();
    }

    pairs.forEach((right, left) => {
      if (right < 0) return;
      const from = endpoint("left", left),
        to = endpoint("right", right);
      if (from && to)
        line(
          from,
          to,
          results ? (results[left] ? "#237750" : "#b2344f") : lineColors[left],
          results?.[left] === false,
        );
    });
    if (pointer && selected != null) {
      const from = endpoint("left", selected);
      if (from)
        line(
          from,
          { x: pointer.x - bounds.left, y: pointer.y - bounds.top },
          lineColors[selected],
          true,
        );
    }
  });

  return (
    <div className="school-matching">
      <p>
        اسحب من العمود الأول للثاني، أو اضغط على اختيار من كل عمود. تقدر كمان
        تبدّل الوصلات.
      </p>
      <div ref={board} className="school-match-board" dir="ltr">
        <canvas ref={canvas} aria-hidden="true" />
        <div
          className="school-match-column"
          role="group"
          aria-label="العمود الأول"
        >
          {options.left.map((label, index) => (
            <button
              key={label}
              type="button"
              lang="en"
              className="school-match-option"
              aria-pressed={selected === index}
              aria-label={
                pairs[index] < 0
                  ? label
                  : `${label} — ${options.right[pairs[index]]}`
              }
              disabled={disabled}
              data-match-left={index}
              data-connected={pairs[index] >= 0}
              data-correct={results?.[index]}
              onPointerDown={(event) => startDrag(event, index)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={() => {
                drag.current = null;
                setPointer(null);
              }}
              onClick={(event) => {
                if (event.detail && skipClick.current) {
                  skipClick.current = false;
                  return;
                }
                setSelected(selected === index ? null : index);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          className="school-match-column"
          role="group"
          aria-label="العمود الثاني"
        >
          {options.right.map((label, index) => (
            <button
              key={label}
              type="button"
              lang="en"
              className="school-match-option"
              data-match-right={index}
              data-connected={pairs.includes(index)}
              disabled={disabled}
              onClick={() => {
                if (selected != null) connect(selected, index);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="school-match-footer">
        <span role="status">
          {connected.toLocaleString("ar-u-nu-arab")} من{" "}
          {options.left.length.toLocaleString("ar-u-nu-arab")} وصلات
        </span>
        <button
          className="text-link"
          type="button"
          disabled={disabled || !connected}
          onClick={() => {
            setSelected(null);
            onChange("");
          }}
        >
          امسح الوصلات
        </button>
      </div>
    </div>
  );
}
