import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container empty-state">
      <span className="eyebrow">لنعد إلى الطريق</span>
      <h1>هذه الصفحة غير موجودة</h1>
      <p>يمكنك متابعة الاكتشاف من فهرس العلوم.</p>
      <Link href="/grade/8/science" className="button primary">
        استكشفي الدروس
      </Link>
    </div>
  );
}
