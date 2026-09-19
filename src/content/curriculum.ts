export const sciencePath = "/grade/8/science";
export const lessonPath = "/grade/8/science/nutrients";
export type Lesson = {
  id: string;
  title: string;
  page: number;
  available?: boolean;
};
export const units = [
  {
    id: "life",
    title: "علوم الحياة",
    description: "نفهم أجسامنا… لنعتني بها.",
    color: "green",
    chapters: [
      {
        title: "الغذاء المتوازن",
        lessons: [
          { id: "nutrients", title: "المغذّيات", page: 24, available: true },
          { id: "balanced-diet", title: "النظام الغذائي المتوازن", page: 29 },
        ],
      },
      {
        title: "الجهاز الهضمي",
        lessons: [
          { id: "digestive-structure", title: "تركيب الجهاز الهضمي", page: 38 },
          {
            id: "digestive-accessories",
            title: "ملحقات الجهاز الهضمي",
            page: 43,
          },
          { id: "digestion", title: "عملية الهضم", page: 48 },
        ],
      },
      {
        title: "الجهاز التنفسي",
        lessons: [
          { id: "respiration", title: "التنفس في الإنسان", page: 60 },
          { id: "energy", title: "الحصول على الطاقة", page: 69 },
          { id: "respiratory-health", title: "صحة الجهاز التنفسي", page: 74 },
        ],
      },
    ],
  },
  {
    id: "earth",
    title: "الأرض والفضاء",
    description: "نكتشف الحكايات التي ترسم سطح الأرض.",
    color: "yellow",
    chapters: [
      {
        title: "العمليات الطبيعية وأثرها في تشكيل سطح الأرض",
        lessons: [
          {
            id: "earth-processes",
            title: "العمليات الطبيعية التي تغيّر شكل سطح الأرض",
            page: 88,
          },
          { id: "geology", title: "المظاهر الجيولوجية", page: 96 },
        ],
      },
    ],
  },
  {
    id: "physics",
    title: "المادة والطاقة — العلوم الفيزيائية",
    description: "نرى الموجات، ونفهم الصوت والضوء.",
    color: "blue",
    chapters: [
      {
        title: "الموجات",
        lessons: [
          { id: "wave-types", title: "طبيعة الموجات وأنواعها", page: 120 },
          { id: "wave-properties", title: "خصائص الموجات", page: 128 },
        ],
      },
      {
        title: "الصوت",
        lessons: [
          { id: "hearing", title: "الصوت والسمع", page: 140 },
          { id: "sound-properties", title: "خصائص الصوت", page: 147 },
        ],
      },
      {
        title: "الطيف الكهرومغناطيسي",
        lessons: [{ id: "spectrum", title: "الطيف الكهرومغناطيسي", page: 162 }],
      },
    ],
  },
  {
    id: "chemistry",
    title: "المادة والطاقة — العلوم الكيميائية",
    description: "أشياء صغيرة… تصنع عالمًا كبيرًا.",
    color: "red",
    chapters: [
      {
        title: "تصنيف العناصر في الجدول الدوري",
        lessons: [
          { id: "noble-gases", title: "الغازات النبيلة", page: 180 },
          { id: "metals", title: "الفلزات واللافلزات", page: 187 },
        ],
      },
      {
        title: "الروابط الكيميائية",
        lessons: [
          { id: "ionic", title: "الرابطة الأيونية", page: 198 },
          { id: "covalent", title: "الرابطة التساهمية", page: 202 },
        ],
      },
    ],
  },
] satisfies {
  id: string;
  title: string;
  description: string;
  color: string;
  chapters: { title: string; lessons: Lesson[] }[];
}[];
export const lessonCount = units.flatMap((u) =>
  u.chapters.flatMap((c) => c.lessons),
).length;
