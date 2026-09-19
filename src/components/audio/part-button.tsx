"use client";

import { Headphones } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { NarrationPart } from "@/content/narration-contract";
import { useAudio } from "./audio-provider";

export function PartPlayButton({
  part,
  partName,
}: {
  part: Exclude<NarrationPart, "result">;
  partName: string;
}) {
  const reduce = useReducedMotion();
  const { playPart, canPlayPart, status } = useAudio();
  // Hidden while no narration is available, rather than a dead button.
  if (status === "not_ready") return null;
  const disabled =
    !canPlayPart(part) || status === "loading" || status === "starting";
  return (
    <motion.button
      type="button"
      className="button small outline audio-part-play"
      disabled={disabled}
      onClick={() => playPart(part)}
      aria-label={`تشغيل شرح: ${partName}`}
      whileTap={reduce ? undefined : { scale: 0.96 }}
    >
      <Headphones size={16} />
      اسمعي هذا الجزء
    </motion.button>
  );
}
