export const nutrients = [
  {
    id: "carbs",
    name: "الكربوهيدرات",
    group: "major",
    color: "yellow",
    tag: "وقود الحركة",
    function:
      "يحوّل الجسم الكربوهيدرات إلى سكريات بسيطة، أهمها الجلوكوز، الذي تستخدمه الخلايا مصدرًا رئيسيًا للطاقة.",
    examples: "الخبز، الأرز، البطاطا والحبوب.",
    note: "الخبز الأسمر والشوفان يوفّران أيضًا الألياف الغذائية.",
    icon: "wheat",
  },
  {
    id: "protein",
    name: "البروتينات",
    group: "major",
    color: "red",
    tag: "البناء والإصلاح",
    function:
      "تسهم في بناء العضلات وإصلاح الأنسجة التالفة والتئام الجروح، وتدعم المناعة ووظائف الجسم الحيوية.",
    examples: "اللحوم والبيض ومنتجات الحليب، والبقوليات والمكسرات.",
    note: "للبروتينات مصادر حيوانية ومصادر نباتية.",
    icon: "blocks",
  },
  {
    id: "fat",
    name: "الدهون",
    group: "major",
    color: "blue",
    tag: "طاقة وحماية",
    function:
      "مصدر مركّز للطاقة. تدخل في تكوين أغشية الخلايا، وتساعد على العزل الحراري وامتصاص بعض الفيتامينات.",
    examples: "زيت الزيتون، المكسرات والأسماك.",
    note: "تساعد على امتصاص الفيتامينات A وD وE وK، وتُتناول باعتدال.",
    icon: "drop",
  },
  {
    id: "water",
    name: "الماء",
    group: "major",
    color: "blue",
    tag: "نقل وتنظيم",
    function:
      "يساعد على تنظيم درجة حرارة الجسم ونقل المواد والتخلّص من الفضلات. يحتاجه الجسم بكميات منتظمة.",
    examples: "ماء الشرب والماء الموجود في الأطعمة.",
    note: "الماء مغذٍ أساسي، لكنه لا يزوّد الجسم بالسعرات الحرارية.",
    icon: "water",
  },
  {
    id: "vitamins",
    name: "الفيتامينات",
    group: "minor",
    color: "green",
    tag: "دعم الوظائف الحيوية",
    function:
      "يحتاج إليها الجسم بكميات قليلة. يساعد فيتامين D على امتصاص الكالسيوم، ويسهم C في دعم المناعة والتئام الجروح.",
    examples: "الفواكه والخضراوات والحليب وأطعمة أخرى متنوعة.",
    note: "قليلة في الكمية لا تعني قليلة في الأهمية.",
    icon: "leaf",
  },
  {
    id: "minerals",
    name: "الأملاح المعدنية",
    group: "minor",
    color: "red",
    tag: "عظام ودم",
    function:
      "يدخل الكالسيوم في بناء العظام والأسنان، والحديد ضروري لنقل الأكسجين في الدم.",
    examples: "الحليب والخضراوات واللحوم وأطعمة أخرى متنوعة.",
    note: "نحتاج أنواعًا مختلفة من الأملاح المعدنية لوظائف مختلفة.",
    icon: "bone",
  },
];
export const foods = [
  {
    id: "oats",
    image: "/images/food-oats.png",
    imageAlt: "رقائق شوفان في وعاء مع ملعقة خشبية",
    name: "الشوفان",
    icon: "wheat",
    main: "الكربوهيدرات",
    also: "الألياف والبروتينات",
    color: "yellow",
    description:
      "توفّر الكربوهيدرات الطاقة، وتدعم الألياف حركة الأمعاء. الحبة الواحدة تجمع أكثر من مغذٍ.",
  },
  {
    id: "lentils",
    image: "/images/food-lentils.png",
    imageAlt: "عدس أحمر مجروش في وعاء",
    name: "العدس",
    icon: "beans",
    main: "البروتينات النباتية",
    also: "الكربوهيدرات والألياف",
    color: "red",
    description:
      "البروتين لا يأتي من اللحوم فقط! البقوليات، ومنها العدس، من مصادره النباتية.",
  },
  {
    id: "oil",
    image: "/images/food-oil.png",
    imageAlt: "زيت زيتون ذهبي في قارورة زجاجية مع حبات زيتون",
    name: "زيت الزيتون",
    icon: "drop",
    main: "الدهون",
    also: "تساعد الدهون على امتصاص فيتامينات ذائبة فيها",
    color: "green",
    description:
      "تدخل الدهون في أغشية الخلايا وتوفّر طاقة مركّزة. نحتاجها باعتدال ضمن غذاء متوازن.",
  },
  {
    id: "milk",
    image: "/images/food-milk.png",
    imageAlt: "كوب وزجاجة من الحليب الأبيض",
    name: "الحليب",
    icon: "milk",
    main: "الكالسيوم والبروتينات",
    also: "الماء والكربوهيدرات ومغذّيات أخرى",
    color: "blue",
    description:
      "الكالسيوم يدخل في بناء العظام والأسنان، والبروتين يسهم في البناء وإصلاح الأنسجة.",
  },
];

/**
 * The two journeys shown in the lesson lab and re-ordered in the drills.
 * Wording follows the textbook pages 24–28; keep the lab and the drill on one
 * source so a reworded step can never drift between them.
 */
export const journeys = {
  energy: {
    name: "رحلة الطاقة",
    subject: "الكربوهيدرات",
    accent: "amber",
    steps: [
      {
        name: "الكربوهيدرات",
        text: "نبدأ بطعام يحتوي كربوهيدرات، مثل الخبز أو الأرز.",
        icon: "wheat",
      },
      {
        name: "الجلوكوز",
        text: "يحوّل الجسم الكربوهيدرات إلى سكريات بسيطة، أهمها الجلوكوز.",
        icon: "blocks",
      },
      {
        name: "طاقة للخلايا",
        text: "تستخدم الخلايا الجلوكوز للحصول على الطاقة اللازمة لأداء وظائفها.",
        icon: "leaf",
      },
    ],
  },
  repair: {
    name: "البناء والإصلاح",
    subject: "البروتينات",
    accent: "violet",
    steps: [
      {
        name: "مصدر للبروتين",
        text: "يمكن أن يأتي البروتين من البيض أو الحليب أو البقوليات مثل العدس.",
        icon: "beans",
      },
      {
        name: "البناء والإصلاح",
        text: "يستخدم الجسم مكوّنات البروتينات لبناء العضلات وإصلاح الأنسجة التالفة.",
        icon: "blocks",
      },
      {
        name: "دعم التئام الجروح",
        text: "هذا يفسّر أهمية البروتينات في التئام الجروح والنمو.",
        icon: "leaf",
      },
    ],
  },
} as const;

/**
 * Food → nutrient relations drawn in the relationship map. Every link is taken
 * from the `foods` entries above, so the map never claims more than the lesson.
 * kind: "main" = the nutrient the food is known for, "also" = present as well,
 * "helps" = the food does not supply it but helps the body use it.
 */
export type FoodLinkKind = "main" | "also" | "helps";
export const foodLinks: {
  food: string;
  nutrient: string;
  kind: FoodLinkKind;
}[] = [
  { food: "oats", nutrient: "carbs", kind: "main" },
  { food: "oats", nutrient: "protein", kind: "also" },
  { food: "lentils", nutrient: "protein", kind: "main" },
  { food: "lentils", nutrient: "carbs", kind: "also" },
  { food: "oil", nutrient: "fat", kind: "main" },
  { food: "oil", nutrient: "vitamins", kind: "helps" },
  { food: "milk", nutrient: "minerals", kind: "main" },
  { food: "milk", nutrient: "protein", kind: "main" },
  { food: "milk", nutrient: "water", kind: "also" },
  { food: "milk", nutrient: "carbs", kind: "also" },
];
export const linkLabels: Record<FoodLinkKind, string> = {
  main: "المغذّي الأساسي فيه",
  also: "موجود فيه أيضًا",
  helps: "يساعد الجسم على امتصاصه",
};

/**
 * Which journey a food's main nutrient starts. Olive oil is deliberately not
 * mapped: the energy journey in this lesson is carbohydrate → glucose → cells,
 * and fat does not travel that path, so the lesson says so instead of pretending.
 */
export const foodJourney: Record<
  string,
  { mode: keyof typeof journeys; lead: string } | { mode: null; lead: string }
> = {
  oats: {
    mode: "energy",
    lead: "الكربوهيدرات في الشوفان تبدأ رحلة الطاقة.",
  },
  lentils: {
    mode: "repair",
    lead: "البروتين في العدس يبدأ رحلة البناء والإصلاح.",
  },
  milk: {
    mode: "repair",
    lead: "البروتين في الحليب يبدأ رحلة البناء والإصلاح.",
  },
  oil: {
    mode: null,
    lead: "الدهون مصدر مركّز للطاقة، لكن رحلتها في الجسم تختلف عن رحلة الكربوهيدرات.",
  },
};
