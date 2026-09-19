"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";

const PAD = 6;
const SPRING = { stiffness: 400, damping: 35 };

function findTarget(id: string) {
  return document.querySelector(`[data-audio-target="${CSS.escape(id)}"]`);
}

function markActive(el: Element | null, previous: Element | null) {
  if (previous && previous !== el) {
    previous.removeAttribute("data-audio-active");
  }
  if (el && el.getAttribute("data-audio-active") !== "true") {
    el.setAttribute("data-audio-active", "true");
  }
  return el;
}

export function HighlightOverlay({
  targetId,
  follow,
}: {
  targetId: string | null;
  follow: boolean;
}) {
  const reduce = useReducedMotion();
  const [portalReady, setPortalReady] = useState(false);
  const [badgeId, setBadgeId] = useState<string | null>(null);
  const [ringShown, setRingShown] = useState(false);
  const markedRef = useRef<Element | null>(null);
  const appearedForRef = useRef<string | null>(null);
  const followRef = useRef(follow);
  followRef.current = follow;

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rawW = useMotionValue(0);
  const rawH = useMotionValue(0);
  const x = useSpring(rawX, SPRING);
  const y = useSpring(rawY, SPRING);
  const width = useSpring(rawW, SPRING);
  const height = useSpring(rawH, SPRING);
  const opacity = useMotionValue(0);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    appearedForRef.current = null;
  }, [targetId]);

  useEffect(() => {
    if (!portalReady) return;
    if (!targetId) {
      opacity.set(0);
      rawW.set(0);
      rawH.set(0);
      if (reduce) {
        width.jump(0);
        height.jump(0);
      }
      setRingShown(false);
      setBadgeId(null);
      markedRef.current = markActive(null, markedRef.current);
      return;
    }

    let raf = 0;
    const tick = () => {
      const el = findTarget(targetId);
      if (!(el instanceof HTMLElement)) {
        opacity.set(0);
        rawW.set(0);
        rawH.set(0);
        if (reduce) {
          width.jump(0);
          height.jump(0);
        }
        setRingShown(false);
        setBadgeId(null);
        markedRef.current = markActive(null, markedRef.current);
      } else {
        const rect = el.getBoundingClientRect();
        const nextX = rect.left - PAD;
        const nextY = rect.top - PAD;
        const nextW = rect.width + PAD * 2;
        const nextH = rect.height + PAD * 2;
        rawX.set(nextX);
        rawY.set(nextY);
        rawW.set(nextW);
        rawH.set(nextH);
        if (reduce) {
          x.jump(nextX);
          y.jump(nextY);
          width.jump(nextW);
          height.jump(nextH);
        }
        opacity.set(1);
        setRingShown(true);
        markedRef.current = markActive(el, markedRef.current);
        setBadgeId(targetId);
        if (appearedForRef.current !== targetId) {
          appearedForRef.current = targetId;
          if (followRef.current) {
            el.scrollIntoView({
              block: "nearest",
              behavior: reduce ? "auto" : "smooth",
            });
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [
    targetId,
    portalReady,
    reduce,
    opacity,
    rawX,
    rawY,
    rawW,
    rawH,
    x,
    y,
    width,
    height,
  ]);

  useEffect(() => {
    return () => {
      markedRef.current = markActive(null, markedRef.current);
    };
  }, []);

  if (!portalReady) return null;

  const ringX = reduce ? rawX : x;
  const ringY = reduce ? rawY : y;
  const ringW = reduce ? rawW : width;
  const ringH = reduce ? rawH : height;

  return createPortal(
    <div className="audio-highlight-layer" aria-hidden="true">
      <motion.div
        className="audio-highlight-ring"
        data-audio-highlight-ring="true"
        style={{
          x: ringX,
          y: ringY,
          width: ringW,
          height: ringH,
          opacity,
          visibility: ringShown ? "visible" : "hidden",
        }}
      >
        <AnimatePresence>
          {badgeId && (
            <motion.span
              key={badgeId}
              className="audio-highlight-badge"
              initial={{ opacity: 0, y: reduce ? 0 : -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -6 }}
              transition={{ duration: 0.2 }}
            >
              بنشرح دلوقتي
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </div>,
    document.body,
  );
}
