export type StageId = "primary" | "intermediate" | "secondary";

export type RegisteredLesson = {
  grade: number;
  subjectId: string;
  lessonId: string;
  href: string;
  published: boolean;
};

export type SubjectDefinition = {
  id: string;
  title: string;
  image: string;
  imageAlt: string;
};

export type StageDefinition = {
  id: StageId;
  title: string;
  description: string;
  href: string;
  grades: readonly number[];
};

export const UPCOMING_STATUS = "في رحلتنا القادمة";

export const STAGES: readonly StageDefinition[] = [
  {
    id: "primary",
    title: "المرحلة الابتدائية",
    description: "خطوات أولى في حب السؤال والاكتشاف.",
    href: "/stage/primary",
    grades: [1, 2, 3, 4, 5],
  },
  {
    id: "intermediate",
    title: "المرحلة المتوسطة",
    description: "نفهم عالمنا بفضول أعمق، صفًا بعد صف.",
    href: "/stage/intermediate",
    grades: [6, 7, 8, 9],
  },
  {
    id: "secondary",
    title: "المرحلة الثانوية",
    description: "نبني أساسًا لمسار التعلّم القادم.",
    href: "/stage/secondary",
    grades: [10, 11, 12],
  },
];

const GRADE_TITLES: Record<number, string> = {
  1: "الصف الأول",
  2: "الصف الثاني",
  3: "الصف الثالث",
  4: "الصف الرابع",
  5: "الصف الخامس",
  6: "الصف السادس",
  7: "الصف السابع",
  8: "الصف الثامن",
  9: "الصف التاسع",
  10: "الصف العاشر",
  11: "الصف الحادي عشر",
  12: "الصف الثاني عشر",
};

const EASTERN_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export const GRADE_8_SUBJECTS: readonly SubjectDefinition[] = [
  {
    id: "arabic",
    title: "اللغة العربية",
    image: "",
    imageAlt: "اللغة العربية",
  },
  {
    id: "english",
    title: "اللغة الإنجليزية",
    image: "",
    imageAlt: "اللغة الإنجليزية",
  },
  {
    id: "math",
    title: "الرياضيات",
    image: "",
    imageAlt: "الرياضيات",
  },
  {
    id: "science",
    title: "العلوم",
    image: "/images/science-discovery.png",
    imageAlt: "مجهر وقارورة ماء ملوّن ونبتة صغيرة ودفتر على طاولة علوم",
  },
  {
    id: "quran",
    title: "القرآن الكريم",
    image: "",
    imageAlt: "القرآن الكريم",
  },
  {
    id: "islamic",
    title: "التربية الإسلامية",
    image: "",
    imageAlt: "التربية الإسلامية",
  },
  {
    id: "social-studies",
    title: "الدراسات الاجتماعية",
    image: "",
    imageAlt: "الدراسات الاجتماعية",
  },
  {
    id: "home-economics",
    title: "الاقتصاد المنزلي",
    image: "",
    imageAlt: "الاقتصاد المنزلي",
  },
];

const NUTRIENTS_LESSON = {
  grade: 8,
  subjectId: "science",
  lessonId: "nutrients",
  href: "/grade/8/science/nutrients",
} as const;

export function registeredLessons(published: boolean): RegisteredLesson[] {
  return [{ ...NUTRIENTS_LESSON, published }];
}

export function subjectAvailable(
  lessons: readonly RegisteredLesson[],
  grade: number,
  subjectId: string,
) {
  return lessons.some(
    (lesson) =>
      lesson.grade === grade &&
      lesson.subjectId === subjectId &&
      lesson.published,
  );
}

export function gradeAvailable(
  lessons: readonly RegisteredLesson[],
  grade: number,
) {
  return lessons.some((lesson) => lesson.grade === grade && lesson.published);
}

export function stageById(id: string) {
  return STAGES.find((stage) => stage.id === id);
}

export function stageForGrade(grade: number) {
  return STAGES.find((stage) => stage.grades.includes(grade));
}

export function gradeTitle(grade: number) {
  return GRADE_TITLES[grade] ?? `الصف ${grade}`;
}

export function easternGrade(grade: number) {
  return String(grade).replace(/\d/g, (digit) => EASTERN_DIGITS[Number(digit)]);
}

export function gradeCardHref(
  lessons: readonly RegisteredLesson[],
  grade: number,
  context: "home" | "stage",
) {
  if (!gradeAvailable(lessons, grade)) return null;
  if (context === "home") {
    const stage = stageForGrade(grade);
    return stage ? `${stage.href}#grade-${grade}` : null;
  }
  return `/grade/${grade}`;
}

export function subjectIndexHref(
  lessons: readonly RegisteredLesson[],
  grade: number,
  subjectId: string,
) {
  const lesson = lessons.find(
    (entry) =>
      entry.grade === grade &&
      entry.subjectId === subjectId &&
      entry.published,
  );
  if (!lesson) return null;
  const segments = lesson.href.split("/").filter(Boolean);
  if (segments.length < 2) return lesson.href;
  segments.pop();
  return `/${segments.join("/")}`;
}

export function gradeSubjectsIntro(scienceAvailable: boolean) {
  return scienceAvailable
    ? "اختاري مادة وابدئي رحلة جديدة من الاكتشاف. العلوم متاحة الآن، وباقي المواد في رحلتنا القادمة."
    : "اختاري مادة وابدئي رحلة جديدة من الاكتشاف.";
}

export function subjectsForGrade(grade: number) {
  return grade === 8 ? GRADE_8_SUBJECTS : [];
}

export function isImplementedGradePage(grade: number) {
  return grade === 8;
}

export function parseGradeParam(value: string) {
  if (!/^[1-9]\d?$/.test(value)) return null;
  const grade = Number(value);
  return isImplementedGradePage(grade) ? grade : null;
}
