import Image from "next/image";
import Link from "next/link";
import {
  BookMarked,
  BookOpen,
  Calculator,
  ChevronLeft,
  FlaskConical,
  Globe2,
  Home,
  Languages,
  MoonStar,
  type LucideIcon,
} from "lucide-react";
import { ImageSlot } from "@/components/ui/image-slot";
import { subjectVisual } from "@/content/curriculum-visuals";
import {
  UPCOMING_STATUS,
  gradeSubjectsIntro,
  gradeTitle,
  stageForGrade,
  subjectAvailable,
  subjectIndexHref,
  type RegisteredLesson,
  type SubjectDefinition,
} from "@/content/catalog";

const SUBJECT_ICONS: Record<string, LucideIcon> = {
  arabic: BookOpen,
  english: Languages,
  math: Calculator,
  science: FlaskConical,
  quran: BookMarked,
  islamic: MoonStar,
  "social-studies": Globe2,
  "home-economics": Home,
};

export function GradeSubjects({
  grade,
  subjects,
  lessons,
}: {
  grade: number;
  subjects: readonly SubjectDefinition[];
  lessons: readonly RegisteredLesson[];
}) {
  const stage = stageForGrade(grade);
  return (
    <section className="section container catalog-page">
      <div className="breadcrumbs">
        <Link href="/">الرئيسية</Link>
        <ChevronLeft size={14} />
        {stage ? (
          <>
            <Link href={stage.href}>{stage.title}</Link>
            <ChevronLeft size={14} />
          </>
        ) : null}
        <span>{gradeTitle(grade)}</span>
      </div>
      <div className="section-heading catalog-heading">
        <div>
          <span className="eyebrow">الفصل الدراسي الأول · ٢٠٢٦–٢٠٢٧</span>
          <h1>مواد {gradeTitle(grade)}</h1>
        </div>
        <p>{gradeSubjectsIntro(subjectAvailable(lessons, grade, "science"))}</p>
      </div>
      <div className="subject-grid">
        {subjects.map((subject) => {
          const href = subjectIndexHref(lessons, grade, subject.id);
          const Icon = SUBJECT_ICONS[subject.id] ?? BookOpen;
          const slot = subjectVisual(subject.id);
          const media = (
            <div className="subject-card-media">
              {slot?.ready ? (
                <ImageSlot slot={slot} icon={Icon} sizes="96px" />
              ) : subject.image ? (
                <Image
                  src={subject.image}
                  alt={subject.imageAlt}
                  fill
                  sizes="96px"
                  style={{ objectFit: "cover" }}
                />
              ) : slot ? (
                <ImageSlot slot={slot} icon={Icon} sizes="96px" />
              ) : (
                <Icon size={36} strokeWidth={1.4} aria-hidden="true" />
              )}
            </div>
          );
          const body = (
            <>
              {media}
              <div className="subject-card-copy">
                <h2>{subject.title}</h2>
                <p>{href ? "جاهزة للاكتشاف" : UPCOMING_STATUS}</p>
              </div>
            </>
          );
          return href ? (
            <Link
              key={subject.id}
              href={href}
              className="subject-card subject-card-available"
            >
              {body}
            </Link>
          ) : (
            <article key={subject.id} className="subject-card">
              {body}
            </article>
          );
        })}
      </div>
    </section>
  );
}
