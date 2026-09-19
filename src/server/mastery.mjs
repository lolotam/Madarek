/**
 * Per-concept understanding from quiz attempts (newest first). A concept
 * counts as correct in an attempt only if every question on it was right.
 */
export function conceptMastery(concepts, attempts) {
  return concepts.map((concept) => {
    const history = attempts
      .map((a) => (a.details ?? []).filter((d) => d.concept === concept))
      .filter((rows) => rows.length)
      .map((rows) => rows.every((d) => d.correct));
    const status = !history.length
      ? "not_started"
      : history[0]
        ? "secure"
        : history.some(Boolean)
          ? "review"
          : "needs_help";
    return { concept, status };
  });
}
