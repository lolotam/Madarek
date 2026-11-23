const criteria = {
  punctuate: [
    ["words", "الحفاظ على الكلمات", 20],
    ["capitals", "الحروف الكبيرة", 40],
    ["marks", "علامات الترقيم", 40],
  ],
  correct: [
    ["grammar", "تصحيح الخطأ", 60],
    ["meaning", "الحفاظ على المعنى", 25],
    ["mechanics", "الإملاء والترقيم", 15],
  ],
  writing: [
    ["meaning", "المعنى وتنفيذ المطلوب", 40],
    ["grammar", "تكوين الجمل", 35],
    ["mechanics", "الإملاء والترقيم", 25],
  ],
  order: [
    ["order", "ترتيب الكلمات", 65],
    ["words", "اكتمال الجملة", 20],
    ["mechanics", "الحروف الكبيرة والترقيم", 15],
  ],
  short: [
    ["target", "الكلمة أو الإجابة المطلوبة", 80],
    ["spelling", "صحة الكتابة", 20],
  ],
};
export function rubricFor(q) {
  return (criteria[q.task] || criteria.short).map(([key, label, max]) => ({
    key,
    label,
    max,
  }));
}
export function assess(q, points, correction) {
  const breakdown = rubricFor(q).map((c, i) => {
    const awarded = points[i];
    if (!Number.isInteger(awarded) || awarded < 0 || awarded > c.max)
      throw Error("Invalid criterion score");
    return { ...c, awarded };
  });
  if (typeof correction !== "string" || correction.length > 600)
    throw Error("Invalid correction");
  return {
    breakdown,
    correction,
    score: breakdown.reduce((sum, c) => sum + c.awarded, 0),
  };
}
export function punctuationMark(q, answer) {
  const words = (s) => s.match(/[A-Za-z]+/g) || [];
  const a = words(answer);
  const marks = (s) => s.match(/[.,!?]/g)?.join("") || "";
  let best = null;
  for (const target of q.answer.split("|")) {
    const t = words(target);
    if (
      a.length !== t.length ||
      !a.every((w, i) => w.toLowerCase() === t[i].toLowerCase())
    )
      continue;
    const caps = t
      .map((w, i) => (w !== w.toLowerCase() ? i : -1))
      .filter((i) => i >= 0);
    const errors = t.reduce((n, w, i) => n + Number(w !== a[i]), 0);
    const capitalPoints = Math.round(
      40 * Math.max(0, 1 - errors / Math.max(1, caps.length)),
    );
    const punctPoints =
      marks(target) === marks(answer) &&
      answer.trimEnd().endsWith(target.at(-1))
        ? 40
        : 0;
    const result = assess(q, [20, capitalPoints, punctPoints], target);
    if (!best || result.score > best.score) best = result;
  }
  return best;
}
