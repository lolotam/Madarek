export type ImageSlot = {
  id: string;
  path: string;
  width: number;
  height: number;
  alt: string;
  prompt: string;
  usage: string;
  ready: boolean;
};

const SHARED_DIRECTION =
  "Use the attached Kuwaiti grade-8 science textbook page as the factual visual reference. Create a realistic educational still-life or clean three-dimensional classroom anatomical model, age-appropriate, anatomically consistent with the reference, ivory studio background with restrained azure #3a86ff / violet #8338ec / amber #ffbe0b accents. No text, no labels, no watermark, no disturbing tissue detail. One clear central concept, legible at card scale.";

const SUBJECT_DIRECTION =
  "Create a photorealistic educational still-life for an Arabic middle-school subject card. Ivory studio background, restrained azure #3a86ff / violet #8338ec / amber #ffbe0b accents, no people. No text, no labels, no watermark, no logos. Square composition, subject fully visible with breathing room for a 96px crop.";

export const IMAGE_SLOTS: readonly ImageSlot[] = [
  {
    id: "nutrients",
    path: "/images/curriculum/nutrients.png",
    width: 800,
    height: 800,
    alt: "أطعمة تمثّل مجموعات المغذّيات الرئيسة",
    prompt: `${SHARED_DIRECTION} Local textbook reference: GRADE-8/FIRST-TERM/SCIENCE/علوم/علوم-24.jpg (printed page 24, الدرس الأوّل المغذّيات / Nutrients). Foods representing the textbook's major nutrient groups: grains, protein foods, vegetables, fruit, milk, and a small amount of oil. Overhead or three-quarter still-life, natural edible textures, not a junk-food copy of the burger photo and not a medical chart.`,
    usage: "Science catalog lesson card for المغذّيات on /grade/8/science",
    ready: false,
  },
  {
    id: "balanced-diet",
    path: "/images/curriculum/balanced-diet.png",
    width: 800,
    height: 800,
    alt: "وجبة متنوعة تمثّل الغذاء المتوازن",
    prompt: `${SHARED_DIRECTION} Local textbook reference: GRADE-8/FIRST-TERM/SCIENCE/علوم/علوم-29.jpg (printed page 29, الدرس الثاني النظام الغذائي المتوازن / Balanced Diet). Varied balanced meal matching the book's food grouping: fish or similar protein, eggs, green vegetables, fruit, nuts, and a grain. Fresh natural colors on ivory linen. No calorie numbers and no food-pyramid diagram.`,
    usage: "Science catalog lesson card for النظام الغذائي المتوازن on /grade/8/science",
    ready: false,
  },
  {
    id: "digestive-structure",
    path: "/images/curriculum/digestive-structure.png",
    width: 800,
    height: 800,
    alt: "نموذج صفي لجهاز هضمي كامل",
    prompt: `${SHARED_DIRECTION} Local textbook reference: GRADE-8/FIRST-TERM/SCIENCE/علوم/علوم-38.jpg (printed page 38, تركيب الجهاز الهضمي / Structure of the Digestive System). Full digestive tract as a clean classroom anatomical model: mouth, esophagus, stomach, small intestine, large intestine, rectum, with liver and pancreas in the same arrangement as the textbook figure. Plastic teaching-model look, not a surgical photograph. This is an educational model, not a medical reference.`,
    usage: "Science catalog lesson card for تركيب الجهاز الهضمي on /grade/8/science",
    ready: false,
  },
  {
    id: "digestive-accessories",
    path: "/images/curriculum/digestive-accessories.png",
    width: 800,
    height: 800,
    alt: "الغدد اللعابية والكبد والمرارة والبنكرياس في سياقها",
    prompt: `${SHARED_DIRECTION} Local textbook reference: GRADE-8/FIRST-TERM/SCIENCE/علوم/علوم-43.jpg (printed page 43, ملحقات الجهاز الهضمي / Digestive System Accessories). Salivary glands beside the mouth, plus liver, gallbladder and pancreas in correct abdominal context as on that page. Classroom anatomical model, age-appropriate, no gore. Do not invent extra organs or reverse left/right relative to the textbook figure. Educational model only, not a medical reference.`,
    usage: "Science catalog lesson card for ملحقات الجهاز الهضمي on /grade/8/science",
    ready: false,
  },
  {
    id: "digestion",
    path: "/images/curriculum/digestion.png",
    width: 800,
    height: 800,
    alt: "مسار مبسّط للطعام عبر أعضاء الهضم",
    prompt: `${SHARED_DIRECTION} Local textbook reference: GRADE-8/FIRST-TERM/SCIENCE/علوم/علوم-48.jpg (printed page 48, عملية الهضم / Digestion Process). Food journey through simplified anatomically ordered organs: mouth to esophagus to stomach with softened food, then intestines, matching the textbook's stomach-centered figure. Clean classroom model, no disturbing tissue detail, no labels. Educational model only, not a medical reference.`,
    usage: "Science catalog lesson card for عملية الهضم on /grade/8/science",
    ready: false,
  },
  {
    id: "life-header",
    path: "/images/curriculum/life-header.png",
    width: 1600,
    height: 400,
    alt: "تصوير عن الغذاء والجسم لوحدة علوم الحياة",
    prompt: `${SHARED_DIRECTION} Local textbook references: GRADE-8/FIRST-TERM/SCIENCE/علوم/علوم-29.jpg, GRADE-8/FIRST-TERM/SCIENCE/علوم/علوم-38.jpg, and GRADE-8/FIRST-TERM/SCIENCE/علوم/علوم-43.jpg. Landscape 4:1 composition. All rich imagery on LEFT 55%: balanced foods beside a clean classroom digestive model. RIGHT 45% quiet light ivory negative space for a live HTML Arabic heading. No text, no labels, no watermark inside the image.`,
    usage: "Life-science unit header on /grade/8/science, left pane only; live HTML title stays on the right",
    ready: false,
  },
  {
    id: "arabic",
    path: "/images/subjects/arabic.png",
    width: 768,
    height: 768,
    alt: "دفتر خط عربي وقلم على طاولة هادئة",
    prompt: `${SUBJECT_DIRECTION} Local textbook reference: GRADE-8/FIRST-TERM/ARABIC/كتاب ثامن عربي قسم أول ٢٠٢٧.pdf. Scene: an open unlined Arabic calligraphy notebook with a fountain pen and a small inkwell on warm ivory paper. No readable letters.`,
    usage: "Grade 8 subject card for اللغة العربية on /grade/8",
    ready: false,
  },
  {
    id: "english",
    path: "/images/subjects/english.png",
    width: 768,
    height: 768,
    alt: "كتاب قراءة إنجليزي مفتوح بجانب أقلام ملوّنة",
    prompt: `${SUBJECT_DIRECTION} Local textbook reference: GRADE-8/FIRST-TERM/ENGLISH/كتاب ثامن إنجليزي ستيودنتس ٢٠٢٧.pdf (Pearl of Kuwait student book). Scene: a closed cloth-bound reader and a blank open exercise book with colored pencils. No readable English or Arabic lettering.`,
    usage: "Grade 8 subject card for اللغة الإنجليزية on /grade/8",
    ready: false,
  },
  {
    id: "math",
    path: "/images/subjects/math.png",
    width: 768,
    height: 768,
    alt: "أدوات هندسة ومكعبات على دفتر مربعات",
    prompt: `${SUBJECT_DIRECTION} Local textbook reference: GRADE-8/FIRST-TERM/MATH/MATH STUDENT BOOK.pdf. Scene: a geometry set, a few wooden cubes, and a blank grid notebook. No numerals, no formulas, no textbook cover reproduction.`,
    usage: "Grade 8 subject card for الرياضيات on /grade/8",
    ready: false,
  },
  {
    id: "science",
    path: "/images/subjects/science.png",
    width: 768,
    height: 768,
    alt: "مجهر وقارورة ونبتة على طاولة علوم",
    prompt: `${SUBJECT_DIRECTION} Local textbook references: GRADE-8/FIRST-TERM/SCIENCE/علوم.pdf and GRADE-8/FIRST-TERM/SCIENCE/علوم/علوم-1.jpg. Scene: a compact white microscope, a flask of clear water, and a small seedling. Do not copy public/images/science-discovery.png; this is a new subject-card frame for later use.`,
    usage: "Reserved subject-card slot for العلوم; the live card still uses the existing /images/science-discovery.png until this file is ready",
    ready: false,
  },
  {
    id: "quran",
    path: "/images/subjects/quran.png",
    width: 768,
    height: 768,
    alt: "مصحف مغلق على حامل خشبي هادئ",
    prompt: `${SUBJECT_DIRECTION} Local textbook reference: GRADE-8/FIRST-TERM/ISLAMIC/كتاب ثامن قرآن ٢٠٢٧.pdf. Scene: a closed plain mushaf on a small wooden stand with soft daylight. No calligraphy, no verse text, no ornamental scripture.`,
    usage: "Grade 8 subject card for القرآن الكريم on /grade/8",
    ready: false,
  },
  {
    id: "islamic",
    path: "/images/subjects/islamic.png",
    width: 768,
    height: 768,
    alt: "سبحة وكتاب مغلق على قماش هادئ",
    prompt: `${SUBJECT_DIRECTION} Local textbook reference: GRADE-8/FIRST-TERM/ISLAMIC/كتاب ثامن إسلامية ٢٠٢٧.pdf. Scene: a closed cloth-bound book, prayer beads, and a small lantern on ivory linen. No scripture, no logos, no mosque illustration with text.`,
    usage: "Grade 8 subject card for التربية الإسلامية on /grade/8",
    ready: false,
  },
  {
    id: "social-studies",
    path: "/images/subjects/social-studies.png",
    width: 768,
    height: 768,
    alt: "خريطة صامتة وبوصلة على مكتب دراسة",
    prompt: `${SUBJECT_DIRECTION} Local folder reference: GRADE-8/FIRST-TERM/SOCIAL STUDIES/ثامن_اجتماعيات_حل_الكتاب_للفصل_الاول_2025.pdf (2025 solution booklet; no 2026-2027 student cover was inspected). Scene: a blank untitled desk map of land and water with a brass compass. No country names, no labels.`,
    usage: "Grade 8 subject card for الدراسات الاجتماعية on /grade/8",
    ready: false,
  },
  {
    id: "home-economics",
    path: "/images/subjects/home-economics.png",
    width: 768,
    height: 768,
    alt: "أدوات مطبخ بسيطة على منديل كتّان",
    prompt: `${SUBJECT_DIRECTION} Local textbook reference: GRADE-8/FIRST-TERM/ECONMIC/الاقنصاد المنزلي.pdf (folder name ECONMIC is a misspelling; cover title is الاقتصاد المنزلي). Scene: a wooden spoon, a small mixing bowl, and folded linen on a pale stone counter. No brand marks, no recipes, no text.`,
    usage: "Grade 8 subject card for الاقتصاد المنزلي on /grade/8",
    ready: false,
  },
];

export function getImageSlot(id: string): ImageSlot {
  const slot = IMAGE_SLOTS.find((entry) => entry.id === id);
  if (!slot) throw new Error(`Unknown image slot: ${id}`);
  return slot;
}

const LESSON_VISUAL_IDS = new Set([
  "nutrients",
  "balanced-diet",
  "digestive-structure",
  "digestive-accessories",
  "digestion",
]);

export function lessonVisual(lessonId: string): ImageSlot | undefined {
  if (!LESSON_VISUAL_IDS.has(lessonId)) return undefined;
  return getImageSlot(lessonId);
}

export function subjectVisual(subjectId: string): ImageSlot | undefined {
  const slot = IMAGE_SLOTS.find(
    (entry) =>
      entry.id === subjectId && entry.path.startsWith("/images/subjects/"),
  );
  return slot;
}

export function lifeHeaderVisual(): ImageSlot {
  return getImageSlot("life-header");
}
