export const englishMascots = [
  { id: "noub", name: "نُوب" },
  { id: "barq", name: "برق" },
  { id: "louz", name: "لوز" },
];
export const defaultEnglishMascot = englishMascots[0].id;

export function isEnglishMascot(value) {
  return englishMascots.some(({ id }) => id === value);
}
