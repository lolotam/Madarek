import { notFound } from "next/navigation";
import { StagePage } from "@/components/stage-page";
import { publicPageMetadata } from "@/content/site";
import { registeredLessons, stageById, STAGES } from "@/content/catalog";
import { store } from "@/server/db";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return STAGES.map((stage) => ({ stage: stage.id }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stage: string }>;
}) {
  const { stage: stageId } = await params;
  const stage = stageById(stageId);
  if (!stage) return {};
  return publicPageMetadata(
    `${stage.title} — مدارك`,
    `${stage.description} صفوف ${stage.grades[0]}–${stage.grades[stage.grades.length - 1]} من المنهج الكويتي، الفصل الأول ٢٠٢٦–٢٠٢٧.`,
    stage.href,
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ stage: string }>;
}) {
  const { stage: stageId } = await params;
  const stage = stageById(stageId);
  if (!stage) notFound();
  return (
    <StagePage
      stage={stage}
      lessons={registeredLessons(store.isPublished())}
    />
  );
}
