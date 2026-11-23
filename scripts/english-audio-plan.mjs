import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import lessons from "../src/server/english-lessons.json" with { type: "json" };
import { grammarRules } from "../src/content/english-grammar.ts";

const punctuation = { "?": "Question mark", ".": "Full stop", ",": "Comma" };

function spoken(text) {
  return (punctuation[text] ?? text)
    .replace(/\p{Extended_Pictographic}|[\u200d\ufe0f]/gu, "")
    .replace(/_{2,}/g, " blank ")
    .replace(/\bP\.?E\.?\b/g, "P E")
    .replace(/\bsh\b/gi, "S H")
    .replace(/\bbl\b/gi, "B L")
    .replace(/\bbr\b/gi, "B R")
    .replace(/\s*→\s*/g, " becomes ")
    .replace(/\s*\/\s*/g, ". ")
    .replace(/\+/g, " plus ")
    .replace(/\s+/g, " ")
    .trim();
}

const clips = {};
function clip(id, text) {
  const line = spoken(text);
  if (!line || Object.hasOwn(clips, id))
    throw new Error(`Invalid audio clip ${id}`);
  clips[id] = line;
}

for (const lesson of lessons) {
  for (const q of lesson.questions) {
    clip(`${q.id}-prompt`, q.prompt);
    if (q.passage?.trim()) clip(`${q.id}-passage`, q.passage);
    if (q.audio?.trim()) clip(`${q.id}-listening`, q.audio);
    if (q.options) {
      clip(
        `${q.id}-options`,
        q.options
          .map(
            (option, index) =>
              `${["First", "Second", "Third", "Fourth"][index]}. ${spoken(option).replace(/[.!?]+$/, "")}.`,
          )
          .join(" "),
      );
    }
    if (q.matches) {
      clip(
        `${q.id}-options`,
        ["First column", ...q.matches.left, "Second column", ...q.matches.right]
          .map((label) => spoken(label).replace(/[.!?]+$/, ""))
          .join(". ") + ".",
      );
    }
  }
}

for (const rule of grammarRules) {
  clip(`grammar-${rule.id}-title`, rule.english);
  rule.steps.forEach((step, stepIndex) => {
    step.samples.forEach(([pattern, example], exampleIndex) => {
      const prefix =
        pattern === example
          ? ""
          : `${spoken(pattern).replace(/[.!?]+$/, "")}. `;
      clip(
        `grammar-${rule.id}-${stepIndex + 1}-${exampleIndex + 1}`,
        prefix + example,
      );
    });
  });
}

if (process.argv.includes("--check")) {
  const missing = Object.keys(clips).filter(
    (id) =>
      !existsSync(
        fileURLToPath(
          new URL(`../public/english/audio/${id}.mp3`, import.meta.url),
        ),
      ),
  );
  if (missing.length) {
    console.error(
      `Missing ${missing.length} clips: ${missing.slice(0, 15).join(", ")}`,
    );
    process.exitCode = 1;
  } else {
    console.log(`Verified ${Object.keys(clips).length} English audio clips.`);
  }
} else {
  process.stdout.write(JSON.stringify(clips));
}
