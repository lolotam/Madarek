import test from "node:test";
import assert from "node:assert/strict";
import {
  STAGES,
  GRADE_8_SUBJECTS,
  UPCOMING_STATUS,
  registeredLessons,
  subjectAvailable,
  gradeAvailable,
  gradeCardHref,
  subjectIndexHref,
  gradeSubjectsIntro,
} from "../src/content/catalog.ts";

test("stages group twelve grades as 5/4/3 with stable ids", () => {
  assert.deepEqual(
    STAGES.map((stage) => [stage.id, stage.grades.length, ...stage.grades]),
    [
      ["primary", 5, 1, 2, 3, 4, 5],
      ["intermediate", 4, 6, 7, 8, 9],
      ["secondary", 3, 10, 11, 12],
    ],
  );
  assert.equal(
    STAGES.reduce((total, stage) => total + stage.grades.length, 0),
    12,
  );
});

test("grade eight subjects come from evidenced sources, including home economics and quran", () => {
  assert.deepEqual(
    GRADE_8_SUBJECTS.map((subject) => [subject.id, subject.title]),
    [
      ["arabic", "اللغة العربية"],
      ["english", "اللغة الإنجليزية"],
      ["math", "الرياضيات"],
      ["science", "العلوم"],
      ["quran", "القرآن الكريم"],
      ["islamic", "التربية الإسلامية"],
      ["social-studies", "الدراسات الاجتماعية"],
      ["home-economics", "الاقتصاد المنزلي"],
    ],
  );
  assert.equal(GRADE_8_SUBJECTS.length, 8);
  assert.equal(
    GRADE_8_SUBJECTS.some((subject) => /ECONMIC|اقتصاد منزلي خاطئ|الاقنصاد/i.test(subject.title)),
    false,
  );
  assert.equal(UPCOMING_STATUS, "في رحلتنا القادمة");
  assert.equal(
    gradeSubjectsIntro(true),
    "اختاري مادة وابدئي رحلة جديدة من الاكتشاف. العلوم متاحة الآن، وباقي المواد في رحلتنا القادمة.",
  );
  assert.equal(
    gradeSubjectsIntro(false),
    "اختاري مادة وابدئي رحلة جديدة من الاكتشاف.",
  );
  assert.equal(
    GRADE_8_SUBJECTS.every(
      (subject) =>
        !/Task C|مؤقتة|مرجعية|منفّذ|مرفوع/i.test(subject.imageAlt),
    ),
    true,
  );
});

test("availability is derived only from registered published lessons", () => {
  const unpublished = registeredLessons(false);
  assert.equal(unpublished.length, 1);
  assert.equal(unpublished[0].lessonId, "nutrients");
  assert.equal(unpublished[0].published, false);
  assert.equal(subjectAvailable(unpublished, 8, "science"), false);
  assert.equal(gradeAvailable(unpublished, 8), false);
  assert.equal(gradeCardHref(unpublished, 8, "home"), null);
  assert.equal(subjectIndexHref(unpublished, 8, "science"), null);

  const published = registeredLessons(true);
  assert.equal(subjectAvailable(published, 8, "science"), true);
  assert.equal(subjectAvailable(published, 8, "arabic"), false);
  assert.equal(gradeAvailable(published, 8), true);
  assert.equal(gradeAvailable(published, 5), false);
  assert.equal(gradeCardHref(published, 8, "home"), "/stage/intermediate#grade-8");
  assert.equal(gradeCardHref(published, 8, "stage"), "/grade/8");
  assert.equal(subjectIndexHref(published, 8, "science"), "/grade/8/science");
});

test("a local PDF path is not a registered lesson and does not unlock cards", () => {
  const pdfOnly = [
    {
      grade: 8,
      subjectId: "home-economics",
      lessonId: "uploaded-pdf",
      href: "GRADE-8/FIRST-TERM/ECONMIC/الاقنصاد المنزلي.pdf",
      published: false,
    },
  ];
  assert.equal(subjectAvailable(pdfOnly, 8, "home-economics"), false);
  assert.equal(gradeAvailable(pdfOnly, 8), false);
  const afterPublisherRegistersRoute = [
    ...pdfOnly,
    {
      grade: 8,
      subjectId: "home-economics",
      lessonId: "kitchen-safety",
      href: "/grade/8/home-economics/kitchen-safety",
      published: true,
    },
  ];
  assert.equal(subjectAvailable(afterPublisherRegistersRoute, 8, "home-economics"), true);
  assert.equal(gradeAvailable(afterPublisherRegistersRoute, 8), true);
  assert.equal(
    subjectIndexHref(afterPublisherRegistersRoute, 8, "home-economics"),
    "/grade/8/home-economics",
  );
});
