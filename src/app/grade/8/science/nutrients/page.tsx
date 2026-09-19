import Link from "next/link";
import { Lesson } from "@/components/lesson";
import { store } from "@/server/db";
import { publicPageMetadata } from "@/content/site";
export const dynamic = "force-dynamic";
export function generateMetadata() {
  return {
    ...publicPageMetadata(
      "المغذّيات — اكتشفي ما يحتاجه جسمك",
      "تعرّفي على الكربوهيدرات والبروتينات والدهون والماء والفيتامينات والأملاح المعدنية بشجرة مفاهيم وأمثلة مصوّرة واختبار من عشرة أسئلة.",
      "/grade/8/science/nutrients",
      "/images/nutrients-plate.png",
    ),
    robots: { index: store.isPublished(), follow: true },
  };
}
export default function Page() {
  if (!store.isPublished())
    return (
      <div className="container empty-state">
        <h1>الدرس قيد المراجعة</h1>
        <p>سيعود قريبًا بعد مراجعة المحتوى.</p>
        <Link className="button primary" href="/grade/8/science">
          العودة إلى الفهرس
        </Link>
      </div>
    );
  return <Lesson />;
}
