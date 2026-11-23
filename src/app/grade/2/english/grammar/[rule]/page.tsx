import { notFound } from "next/navigation";
import { EnglishLesson } from "@/components/english-lesson";
import { GrammarGuide } from "@/components/english-grammar";
import { grammarRules } from "@/content/english-grammar";
import { activity } from "@/server/english.mjs";
import "../../school.css";

type Props = { params: Promise<{ rule: string }> };
export function generateStaticParams() {
  return grammarRules.map((rule) => ({ rule: rule.id }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: Props) {
  const { rule } = await params;
  return {
    title:
      grammarRules.find((item) => item.id === rule)?.title ?? "شرح القواعد",
  };
}

export default async function GrammarRule({ params }: Props) {
  const { rule } = await params;
  const guide = grammarRules.find((item) => item.id === rule);
  if (!guide) notFound();
  const lesson = activity(guide.page);
  if (!lesson) notFound();
  return (
    <>
      <GrammarGuide rule={guide} />
      <EnglishLesson page={guide.page} lesson={lesson} grammar />
    </>
  );
}
