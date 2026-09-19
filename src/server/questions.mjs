const questions = [
  {
    id: "q1",
    kind: "choice",
    concept: "التصنيف",
    prompt: "إلى أي مجموعة ينتمي الماء؟",
    options: [
      ["macro", "المغذّيات الكبرى"],
      ["micro", "المغذّيات الصغرى"],
      ["none", "ليس من المغذّيات"],
    ],
    accepted: ["macro"],
    answer: "المغذّيات الكبرى",
    explanation:
      "يحتاج الجسم إلى الماء بكميات كبيرة، رغم أنه لا يمدّه بالسعرات الحرارية.",
  },
  {
    id: "q2",
    kind: "choice",
    concept: "البروتينات",
    prompt: "أي مغذٍ يساعد أساسًا على بناء العضلات وإصلاح الأنسجة؟",
    options: [
      ["protein", "البروتينات"],
      ["water", "الماء"],
      ["fiber", "الألياف"],
    ],
    accepted: ["protein"],
    answer: "البروتينات",
    explanation:
      "البروتينات تدخل في بناء العضلات وإصلاح الأنسجة والتئام الجروح.",
  },
  {
    id: "q3",
    kind: "choice",
    concept: "الدهون",
    prompt: "ما المغذّي الذي يساعد على امتصاص الفيتامينات A وD وE وK؟",
    options: [
      ["water", "الماء"],
      ["fat", "الدهون"],
      ["fiber", "الألياف"],
    ],
    accepted: ["fat"],
    answer: "الدهون",
    explanation: "هذه فيتامينات ذائبة في الدهون، فتساعد الدهون على امتصاصها.",
  },
  {
    id: "q4",
    kind: "choice",
    concept: "الفيتامينات",
    prompt: "أي فيتامين يساعد الجسم على امتصاص الكالسيوم؟",
    options: [
      ["C", "فيتامين C"],
      ["K", "فيتامين K"],
      ["D", "فيتامين D"],
    ],
    accepted: ["D"],
    answer: "فيتامين D",
    explanation: "يساعد فيتامين D على امتصاص الكالسيوم وتقوية العظام والأسنان.",
  },
  {
    id: "q5",
    kind: "choice",
    concept: "الأملاح المعدنية",
    prompt: "ما الدور المهم للحديد في الجسم؟",
    options: [
      ["oxygen", "المساعدة في نقل الأكسجين في الدم"],
      ["insulation", "العزل الحراري تحت الجلد"],
      ["energy", "توفير الطاقة مباشرة"],
    ],
    accepted: ["oxygen"],
    answer: "المساعدة في نقل الأكسجين في الدم",
    explanation: "الحديد ضروري لنقل الأكسجين في الدم؛ وهو من الأملاح المعدنية.",
  },
  {
    id: "q6",
    kind: "choice",
    concept: "الألياف",
    prompt: "لماذا يفيد تناول الأطعمة الغنية بالألياف؟",
    options: [
      ["bone", "لأن الألياف تبني العظام مباشرة"],
      ["bowel", "لتسهيل حركة الأمعاء والوقاية من الإمساك"],
      ["fat", "لأنها دهون مركّزة"],
    ],
    accepted: ["bowel"],
    answer: "لتسهيل حركة الأمعاء والوقاية من الإمساك",
    explanation: "الألياف تدعم صحة الجهاز الهضمي وتساعد على حركة الأمعاء.",
  },
  {
    id: "q7",
    kind: "fill",
    concept: "الكربوهيدرات",
    prompt: "يحوّل الجسم الكربوهيدرات إلى سكريات بسيطة أهمها سكر …",
    accepted: ["الجلوكوز", "جلوكوز", "الغلوكوز", "غلوكوز"],
    answer: "الجلوكوز",
    explanation: "الجلوكوز مصدر رئيسي للطاقة التي تستخدمها الخلايا.",
  },
  {
    id: "q8",
    kind: "fill",
    concept: "الماء",
    prompt:
      "مغذٍ يساعد على تنظيم درجة الحرارة ونقل المواد، ولا يزوّد الجسم بسعرات حرارية: …",
    accepted: ["الماء", "ماء"],
    answer: "الماء",
    explanation: "الماء ضروري للوظائف الحيوية، وليس مصدرًا للسعرات الحرارية.",
  },
  {
    id: "q9",
    kind: "fill",
    concept: "التصنيف",
    prompt: "تشمل المغذّيات الصغرى … والأملاح المعدنية.",
    accepted: ["الفيتامينات", "فيتامينات"],
    answer: "الفيتامينات",
    explanation: "يحتاج الجسم إلى الفيتامينات والأملاح المعدنية بكميات قليلة.",
  },
  {
    id: "q10",
    kind: "fill",
    concept: "الأملاح المعدنية",
    prompt: "من الأملاح المعدنية التي تدخل في بناء العظام والأسنان: …",
    accepted: ["الكالسيوم", "كالسيوم"],
    answer: "الكالسيوم",
    explanation: "الكالسيوم من الأملاح المعدنية المهمة لبناء العظام والأسنان.",
  },
];
export function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
export function publicQuestions() {
  return questions.map(
    ({ accepted, answer, explanation, ...question }) => question,
  );
}
export function grade(answers = {}) {
  const details = questions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    concept: q.concept,
    submitted:
      q.options?.find(([value]) => value === answers[q.id])?.[1] ??
      String(answers[q.id] ?? "").slice(0, 300),
    correct: q.accepted.some((a) => normalize(a) === normalize(answers[q.id])),
    answer: q.answer,
    explanation: q.explanation,
  }));
  const correct = details.filter((d) => d.correct).length;
  return {
    version: "nutrients-v1",
    correct,
    total: questions.length,
    score: (correct / questions.length) * 100,
    details,
    review: [
      ...new Set(details.filter((d) => !d.correct).map((d) => d.concept)),
    ],
  };
}
export const modelReason =
  "تساعد البروتينات على إصلاح الأنسجة التالفة وبناء أنسجة جديدة، ولذلك تسهم في التئام الجروح.";
