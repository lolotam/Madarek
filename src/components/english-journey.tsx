"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Flag, Star, Trophy } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { englishIndex } from "@/content/english-index.mjs";
import { englishMascots } from "@/content/english-mascots.mjs";
import "./english-journey.css";

export type EnglishJourneyStage = {
  page: number;
  possible: number;
  answered: number;
  scored: number;
  points: number;
  complete: boolean;
};

const boardWidth = 1000;
const number = (value: number) =>
  value.toLocaleString("ar-u-nu-arab", { maximumFractionDigits: 2 });

function stops(count: number) {
  const xPositions = [640, 360, 610, 340, 655, 385, 630, 345];
  return Array.from({ length: count }, (_, index) => {
    return {
      x: xPositions[index % xPositions.length],
      y: 185 + index * 420,
    };
  });
}

function road(points: ReturnType<typeof stops>) {
  const [first, ...rest] = points;
  let path = `M ${first.x} ${first.y}`;
  let previous = first;
  for (const next of rest) {
    const middle = (previous.y + next.y) / 2;
    path += ` C ${previous.x} ${middle}, ${next.x} ${middle}, ${next.x} ${next.y}`;
    previous = next;
  }
  return path;
}

function walk(points: ReturnType<typeof stops>) {
  return [
    points[0],
    ...points.slice(1).flatMap((next, index) => {
      const previous = points[index];
      // These samples follow the same cubic curve as the drawn road.
      return [0.25, 0.5, 0.75, 1].map((t) => ({
        x: previous.x + (next.x - previous.x) * (t ** 2 * (3 - 2 * t)),
        y: previous.y + (next.y - previous.y) * (1.5 * t * (1 - t) + t ** 3),
      }));
    }),
  ];
}

export function EnglishJourney({
  stages,
  mascotId,
  fromLesson,
  settings,
}: {
  stages: EnglishJourneyStage[];
  mascotId?: string | null;
  fromLesson?: number;
  settings: ReactNode;
}) {
  const currentStop = useRef<HTMLAnchorElement | HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const mascot =
    englishMascots.find(({ id }) => id === mascotId) ?? englishMascots[0];
  const firstIncomplete = stages.findIndex(({ complete }) => !complete);
  const current = firstIncomplete < 0 ? stages.length : firstIncomplete;
  const points = stops(stages.length + 1);
  const end = points.at(-1)!;
  const height = end.y + 190;
  const top = (y: number) => `${(y / height) * 100}%`;
  const finished = stages.filter(({ complete }) => complete);
  const earned = finished.reduce((total, stage) => total + stage.points, 0);
  const arrival = fromLesson === undefined ? undefined : stages[fromLesson - 1];
  const from =
    arrival?.complete && arrival.page - 1 < current
      ? arrival.page - 1
      : current;
  const moving = from !== current && !reduceMotion;
  const steps = moving
    ? walk(points.slice(from, current + 1))
    : [points[current]];

  useEffect(() => {
    if (!arrival?.complete || !currentStop.current) return;
    const position =
      currentStop.current.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: position - window.innerHeight * 0.62,
      behavior: "instant",
    });
  }, [arrival?.complete, current]);

  return (
    <section
      id="english-map"
      className="english-journey"
      aria-labelledby="english-map-title"
    >
      <header className="english-journey-header">
        <div>
          <p className="english-journey-unit" lang="en" dir="ltr">
            My School Day
          </p>
          <h2 id="english-map-title">رحلة الإنجليزي</h2>
          <div className="english-journey-totals">
            <span>
              <Flag size={17} aria-hidden /> {number(finished.length)} من{" "}
              {number(stages.length)} درس
            </span>
            <span>
              <Star size={17} aria-hidden /> نقاطي <bdi>{number(earned)}</bdi>
            </span>
          </div>
        </div>
        {settings}
      </header>
      {arrival?.complete && (
        <p className="english-journey-arrival" role="status">
          خلّصت {englishIndex[arrival.page - 1].ar} ·{" "}
          <bdi>+{number(arrival.points)}</bdi> نقطة
        </p>
      )}
      <div
        className="english-journey-board"
        style={{ height: `calc(${stages.length} * max(14rem, 48svh) + 19rem)` }}
      >
        <svg
          className="english-journey-road"
          viewBox={`0 0 ${boardWidth} ${height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={road(points)} className="english-journey-road-edge" />
          <path d={road(points)} className="english-journey-road-fill" />
          {current > 0 && (
            <path
              d={road(points.slice(0, current + 1))}
              className="english-journey-road-done"
            />
          )}
        </svg>
        {stages.map((stage, index) => {
          const lesson = englishIndex[index];
          const here = index === current;
          const { x, y } = points[index];
          return (
            <Link
              key={stage.page}
              ref={
                here
                  ? (element) => {
                      currentStop.current = element;
                    }
                  : undefined
              }
              href={`/grade/2/english/${stage.page}?from=map`}
              prefetch={false}
              aria-current={here ? "step" : undefined}
              className="english-journey-stop"
              data-complete={stage.complete ? "" : undefined}
              data-page={stage.page}
              style={{ left: `${x / 10}%`, top: top(y) }}
            >
              <span className="english-journey-token">
                {stage.complete && (
                  <Check size={15} strokeWidth={3} aria-hidden />
                )}
                {number(stage.page)}
              </span>
              <span className="english-journey-label">
                <strong>{lesson.ar}</strong>
                <span lang="en" dir="ltr">
                  {lesson.title}
                </span>
                {stage.complete ? (
                  <small className="english-journey-score">
                    <Star size={12} aria-hidden />{" "}
                    <bdi>
                      {number(stage.points)} / {number(stage.possible)}
                    </bdi>
                    {stage.scored < stage.possible && (
                      <span aria-label="بعض الدرجات قيد التصحيح">…</span>
                    )}
                  </small>
                ) : (
                  stage.answered > 0 && (
                    <small>
                      <bdi>
                        {number(stage.answered)} / {number(stage.possible)}
                      </bdi>{" "}
                      سؤال
                    </small>
                  )
                )}
              </span>
            </Link>
          );
        })}
        <div
          ref={
            current === stages.length
              ? (element) => {
                  currentStop.current = element;
                }
              : undefined
          }
          className="english-journey-stop english-journey-finish"
          aria-current={current === stages.length ? "step" : undefined}
          style={{ left: `${end.x / 10}%`, top: top(end.y) }}
        >
          <span className="english-journey-token">
            <Trophy size={27} aria-hidden />
          </span>
          <span className="english-journey-label">
            <strong>
              {current === stages.length ? "خلّصت الرحلة!" : "نهاية الرحلة"}
            </strong>
          </span>
        </div>
        <motion.div
          className="english-journey-mascot"
          key={`${from}-${current}`}
          data-at-stage={current + 1}
          initial={{ left: `${steps[0].x / 10}%`, top: top(steps[0].y) }}
          animate={{
            left: steps.map(({ x }) => `${x / 10}%`),
            top: steps.map(({ y }) => top(y)),
          }}
          transition={{
            duration: moving ? Math.min(2.4, 0.8 + (current - from) * 0.35) : 0,
            ease: "linear",
          }}
        >
          <picture>
            <source
              media="(prefers-reduced-motion: reduce)"
              srcSet={`/english/mascots/${mascot.id}/portrait.webp`}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/english/mascots/${mascot.id}/idle.gif`}
              width={108}
              height={108}
              alt={mascot.name}
            />
          </picture>
        </motion.div>
      </div>
    </section>
  );
}
