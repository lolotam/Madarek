import { foods, nutrients } from "./nutrients";

export const labModes = ["energy", "repair"] as const;
export const labSteps = [0, 1, 2] as const;
export type LabMode = (typeof labModes)[number];
export type LabStep = (typeof labSteps)[number];
export type ConceptGroup = "major" | "minor";

export type AudioReveal =
  | { kind: "always" }
  | { kind: "concept-group"; group: ConceptGroup }
  | { kind: "concept-nutrient"; nutrient: string }
  | { kind: "food"; food: string }
  | { kind: "lab"; mode: LabMode; step: LabStep }
  | { kind: "quiz-question"; question: string }
  | { kind: "quiz-result" };

export type AudioTarget = {
  id: string;
  reveal: AudioReveal;
};

export type PublicQuizQuestion = {
  id: string;
  kind: string;
  options?: [string, string][];
};

function target(id: string, reveal: AudioReveal): AudioTarget {
  return { id, reveal };
}

export const lessonHeroTarget = target("lesson-hero", { kind: "always" });
export const learningGoalsTarget = target("learning-goals", {
  kind: "always",
});
export const sectionMapTarget = target("section-map", { kind: "always" });
export const sectionExploreTarget = target("section-explore", {
  kind: "always",
});
export const sectionPracticeTarget = target("section-practice", {
  kind: "always",
});
export const sectionQuizTarget = target("section-quiz", { kind: "always" });
export const conceptRootTarget = target("concept-root", { kind: "always" });
export const fiberNoteTarget = target("fiber-note", { kind: "always" });
export const practiceChoiceTarget = target("practice-choice", {
  kind: "always",
});
export const practiceReasonTarget = target("practice-reason", {
  kind: "always",
});
export const lessonSummaryTarget = target("lesson-summary", {
  kind: "always",
});
export const labCaptionTarget = target("lab-caption", { kind: "always" });
export const resultScoreTarget = target("result-score", {
  kind: "quiz-result",
});
export const resultReviewTarget = target("result-review", {
  kind: "quiz-result",
});

export function conceptGroupTarget(group: ConceptGroup): AudioTarget {
  return target(`concept-group-${group}`, {
    kind: "concept-group",
    group,
  });
}

export function conceptNutrientTarget(nutrientId: string): AudioTarget {
  return target(`concept-nutrient-${nutrientId}`, {
    kind: "concept-nutrient",
    nutrient: nutrientId,
  });
}

export function conceptDetailTarget(nutrientId: string): AudioTarget {
  return target(`concept-detail-${nutrientId}`, {
    kind: "concept-nutrient",
    nutrient: nutrientId,
  });
}

export function foodTarget(foodId: string): AudioTarget {
  return target(`food-${foodId}`, { kind: "food", food: foodId });
}

export function foodDetailTarget(foodId: string): AudioTarget {
  return target(`food-detail-${foodId}`, { kind: "food", food: foodId });
}

export function labModeTarget(mode: LabMode): AudioTarget {
  return target(`lab-mode-${mode}`, { kind: "always" });
}

export function labStepTarget(mode: LabMode, step: LabStep): AudioTarget {
  return target(`lab-step-${mode}-${step}`, { kind: "lab", mode, step });
}

export function quizQuestionTarget(questionId: string): AudioTarget {
  return target(`quiz-question-${questionId}`, {
    kind: "quiz-question",
    question: questionId,
  });
}

export function quizOptionTarget(
  questionId: string,
  optionValue: string,
): AudioTarget {
  return target(`quiz-option-${questionId}-${optionValue}`, {
    kind: "quiz-question",
    question: questionId,
  });
}

export function quizFillTarget(questionId: string): AudioTarget {
  return target(`quiz-fill-${questionId}`, {
    kind: "quiz-question",
    question: questionId,
  });
}

export function resultDetailTarget(questionId: string): AudioTarget {
  return target(`result-detail-${questionId}`, { kind: "quiz-result" });
}

export function quizTargetsForQuestions(
  questions: PublicQuizQuestion[],
): AudioTarget[] {
  return questions.flatMap((question) => [
    quizQuestionTarget(question.id),
    ...(question.kind === "choice"
      ? (question.options ?? []).map(([value]) =>
          quizOptionTarget(question.id, value),
        )
      : [quizFillTarget(question.id)]),
    resultDetailTarget(question.id),
  ]);
}

export const audioTargets: AudioTarget[] = [
  lessonHeroTarget,
  learningGoalsTarget,
  sectionMapTarget,
  sectionExploreTarget,
  sectionPracticeTarget,
  sectionQuizTarget,
  conceptRootTarget,
  conceptGroupTarget("major"),
  conceptGroupTarget("minor"),
  ...nutrients.map((n) => conceptNutrientTarget(n.id)),
  ...nutrients.map((n) => conceptDetailTarget(n.id)),
  ...foods.map((f) => foodTarget(f.id)),
  ...foods.map((f) => foodDetailTarget(f.id)),
  ...labModes.map((mode) => labModeTarget(mode)),
  ...labModes.flatMap((mode) =>
    labSteps.map((step) => labStepTarget(mode, step)),
  ),
  labCaptionTarget,
  fiberNoteTarget,
  practiceChoiceTarget,
  practiceReasonTarget,
  lessonSummaryTarget,
  resultScoreTarget,
  resultReviewTarget,
];
