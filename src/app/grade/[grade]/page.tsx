import { notFound } from "next/navigation";
import { GradeSubjects } from "@/components/grade-subjects";
import { publicPageMetadata } from "@/content/site";
import {
  gradeTitle,
  parseGradeParam,
  registeredLessons,
  subjectsForGrade,
} from "@/content/catalog";
import { store } from "@/server/db";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return [{ grade: "8" }];
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ grade: string }>;
}) {
  const { grade: raw } = await params;
  const grade = parseGradeParam(raw);
  if (grade == null) return {};
  const title = `مواد ${gradeTitle(grade)}`;
  return publicPageMetadata(
    `${title} — مدارك`,
    `اكتشفي ${title} للفصل الدراسي الأول ٢٠٢٦–٢٠٢٧.`,
    `/grade/${grade}`,
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ grade: string }>;
}) {
  const { grade: raw } = await params;
  const grade = parseGradeParam(raw);
  if (grade == null) notFound();
  return (
    <GradeSubjects
      grade={grade}
      subjects={subjectsForGrade(grade)}
      lessons={registeredLessons(store.isPublished())}
    />
  );
}
