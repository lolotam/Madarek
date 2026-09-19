import {
  audioTargets,
  quizFillTarget,
  quizOptionTarget,
  quizQuestionTarget,
  resultDetailTarget,
  type AudioTarget,
} from "@/content/audio-targets";

/**
 * Registry lookup, plus the quiz helper ids that are generated per question
 * and therefore not listed on `audioTargets`.
 */
export function resolveAudioTarget(id: string): AudioTarget | undefined {
  const listed = audioTargets.find((target) => target.id === id);
  if (listed) return listed;

  if (id.startsWith("quiz-question-")) {
    return quizQuestionTarget(id.slice("quiz-question-".length));
  }
  if (id.startsWith("quiz-fill-")) {
    return quizFillTarget(id.slice("quiz-fill-".length));
  }
  if (id.startsWith("result-detail-")) {
    return resultDetailTarget(id.slice("result-detail-".length));
  }
  if (id.startsWith("quiz-option-")) {
    const rest = id.slice("quiz-option-".length);
    const dash = rest.indexOf("-");
    if (dash > 0) {
      return quizOptionTarget(rest.slice(0, dash), rest.slice(dash + 1));
    }
  }
  return undefined;
}
