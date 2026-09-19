import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { GradeCards } from "@/components/grade-cards";
import {
  type RegisteredLesson,
  type StageDefinition,
} from "@/content/catalog";

export function StagePage({
  stage,
  lessons,
}: {
  stage: StageDefinition;
  lessons: readonly RegisteredLesson[];
}) {
  return (
    <section className="section container catalog-page">
      <div className="breadcrumbs">
        <Link href="/">الرئيسية</Link>
        <ChevronLeft size={14} />
        <span>{stage.title}</span>
      </div>
      <div className="section-heading catalog-heading">
        <div>
          <span className="eyebrow">الفصل الدراسي الأول · ٢٠٢٦–٢٠٢٧</span>
          <h1>{stage.title}</h1>
        </div>
        <p>{stage.description}</p>
      </div>
      <h2 className="catalog-subheading">صفوف المرحلة</h2>
      <GradeCards stage={stage} lessons={lessons} context="stage" />
    </section>
  );
}
