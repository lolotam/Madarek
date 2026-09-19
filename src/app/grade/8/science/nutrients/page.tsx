import Link from "next/link";
import { Lesson } from "@/components/lesson";
import { store } from "@/server/db";
export const dynamic = "force-dynamic";
export const metadata = { title: "المغذّيات — اكتشفي ما يحتاجه جسمك" };
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
