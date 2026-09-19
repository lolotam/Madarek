import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import {
  audioTargets,
  quizTargetsForQuestions,
  type PublicQuizQuestion,
} from "../../src/content/audio-targets";

type NarrationCue = {
  phrase: string;
  occurrence?: number;
  target: string;
  reveal?: boolean;
};

type NarrationSegment = {
  id: string;
  text: string;
  cues: NarrationCue[];
};

const segments = JSON.parse(
  readFileSync(
    join(process.cwd(), "src/server/narration/nutrients.json"),
    "utf8",
  ),
) as NarrationSegment[];

test("every narration cue target exists in audioTargets or quiz helpers", async ({
  request,
}) => {
  const response = await request.get("/api/quiz");
  expect(response.ok()).toBeTruthy();
  const { questions } = (await response.json()) as {
    questions: PublicQuizQuestion[];
  };

  const allowed = new Set([
    ...audioTargets.map((target) => target.id),
    ...quizTargetsForQuestions(questions).map((target) => target.id),
    "result-score",
    "result-review",
  ]);

  const missing: string[] = [];
  for (const segment of segments) {
    for (const cue of segment.cues) {
      if (!allowed.has(cue.target)) {
        missing.push(`${segment.id}: ${cue.target}`);
      }
    }
  }
  expect(missing).toEqual([]);

  const questionsById = new Map(
    questions.map((question) => [question.id, question]),
  );
  for (const segment of segments) {
    for (const cue of segment.cues) {
      const match = /^quiz-option-(q\d+)-(.+)$/.exec(cue.target);
      if (!match) continue;
      const questionId = match[1];
      const optionValue = match[2];
      const question = questionsById.get(questionId);
      expect(question, cue.target).toBeTruthy();
      expect(question?.kind, cue.target).toBe("choice");
      const values = (question?.options ?? []).map(([value]) => value);
      expect(values, cue.target).toContain(optionValue);
    }
  }
});
