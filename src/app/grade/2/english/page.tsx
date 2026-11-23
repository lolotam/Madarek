import Link from "next/link";
import { GrammarCards, QuestionBadge } from "@/components/english-grammar";
import { grammarPath } from "@/content/english-grammar";
import { questionCount } from "@/server/english.mjs";
import { englishIndex } from "@/content/english-index.mjs";
import "./school.css";
export const metadata = { title: "My School Day | إنجليزي الصف الثاني" };
export default function EnglishIndex() {
  return (
    <section className="container school section">
      <div className="breadcrumbs">
        <Link href="/grade/2">الصف الثاني</Link> / اللغة الإنجليزية
      </div>
      <div className="school-cover">
        <div>
          <p>اللغة الإنجليزية · الوحدة الأولى</p>
          <h1 lang="en" dir="ltr">
            My School Day
          </h1>
          <p>من أول الصبح لآخر حصة، احكِ يومك بالإنجليزي.</p>
          <Link className="button primary" href="/grade/2/english/1">
            ابدأ الوحدة
          </Link>
        </div>
        <div className="cover-book" aria-hidden="true">
          <span>📒</span>
          <span>✏️</span>
        </div>
      </div>
      <div className="school-section-title">
        <h2>شرح القواعد</h2>
        <Link className="text-link" href={grammarPath}>
          افتح قسم القواعد
        </Link>
      </div>
      <GrammarCards />
      <h2 className="school-section-title">دروس الوحدة</h2>
      <div className="school-index">
        {englishIndex.map((l, i) => (
          <Link href={"/grade/2/english/" + (i + 1)} key={l.title}>
            <QuestionBadge count={questionCount(i + 1)} />
            <span className="school-icon" aria-hidden="true">
              {l.icon}
            </span>
            <span>
              <small>درس {(i + 1).toLocaleString("ar-u-nu-arab")}</small>
              <strong>{l.ar}</strong>
              <span lang="en">{l.title}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
