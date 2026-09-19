import Link from "next/link";
import { ArrowLeft, ArrowUpLeft, BookOpen } from "lucide-react";
import {
  UPCOMING_STATUS,
  easternGrade,
  gradeCardHref,
  gradeTitle,
  type RegisteredLesson,
  type StageDefinition,
} from "@/content/catalog";

export function GradeCards({
  stage,
  lessons,
  context,
}: {
  stage: StageDefinition;
  lessons: readonly RegisteredLesson[];
  context: "home" | "stage";
}) {
  return (
    <div className={`grade-grid grade-grid-${stage.id}`}>
      {stage.grades.map((grade) => {
        const href = gradeCardHref(lessons, grade, context);
        const body = (
          <>
            <div className="grade-top">
              {href ? (
                <span className="pill green">
                  <span className="status-dot" /> متاح الآن
                </span>
              ) : (
                <span className="pill muted">{UPCOMING_STATUS}</span>
              )}
              {href ? <ArrowUpLeft size={24} /> : <BookOpen size={23} />}
            </div>
            <span className="grade-number">{easternGrade(grade)}</span>
            <h3>{gradeTitle(grade)}</h3>
            <p>
              {href
                ? "الفصل الدراسي الأول · ٢٠٢٦–٢٠٢٧"
                : "مساحة جديدة للتعلّم، قريبًا."}
            </p>
            <div className="grade-bottom">
              {href ? (
                <>
                  <span>ابدئي الاكتشاف</span>
                  <ArrowLeft size={20} />
                </>
              ) : (
                <span>{UPCOMING_STATUS}</span>
              )}
            </div>
          </>
        );
        const className = href
          ? "grade-card grade-active"
          : "grade-card grade-future";
        const attrs = {
          id: `grade-${grade}`,
          "data-grade": String(grade),
          "data-stage": stage.id,
        };
        return href ? (
          <Link key={grade} href={href} className={className} {...attrs}>
            {body}
          </Link>
        ) : (
          <article key={grade} className={className} {...attrs}>
            {body}
          </article>
        );
      })}
    </div>
  );
}
