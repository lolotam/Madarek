import { notFound } from "next/navigation";
import { activity } from "@/server/english.mjs";
import { englishIndex } from "@/content/english-index.mjs";
import { EnglishLesson } from "@/components/english-lesson";
import "../school.css";
export function generateStaticParams() {
  return englishIndex.map((_, i) => ({ page: String(i + 1) }));
}
export const dynamicParams = false;
export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  return { title: englishIndex[Number(page) - 1]?.title ?? "English" };
}
export default async function Page({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  if (!/^(?:[1-9]|1\d|20)$/.test(page)) notFound();
  const lesson = activity(Number(page));
  if (!lesson) notFound();
  return <EnglishLesson key={page} page={Number(page)} lesson={lesson} />;
}
