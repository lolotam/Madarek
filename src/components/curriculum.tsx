"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  FlaskConical,
  Leaf,
  Globe2,
  Waves,
  Atom,
  Search,
  Clock3,
  ChevronLeft,
} from "lucide-react";
import { units, lessonCount, lessonPath, Lesson } from "@/content/curriculum";
const icons = [Leaf, Globe2, Waves, Atom];
export function Curriculum({ published }: { published: boolean }) {
  const [query, setQuery] = useState("");
  const matches = (lesson: Lesson) => lesson.title.includes(query.trim());
  return (
    <>
      <section className="subject-hero">
        <div className="container">
          <div className="breadcrumbs">
            <Link href="/">الرئيسية</Link>
            <ChevronLeft size={14} />
            <span>الصف الثامن</span>
            <ChevronLeft size={14} />
            <span>العلوم</span>
          </div>
          <div className="subject-heading">
            <div>
              <span className="eyebrow">٢٠٢٦–٢٠٢٧ · الفصل الدراسي الأول</span>
              <h1>
                العلوم.
                <br />
                <span>نافذتك إلى العالم.</span>
              </h1>
              <p>
                من أسرار جسمك إلى موجات الضوء.
                <br />
                اكتشفي المنهج، درسًا بعد درس.
              </p>
            </div>
            <div className="subject-emblem" aria-hidden="true">
              <FlaskConical size={96} strokeWidth={1.1} />
              <span className="emblem-star">✧</span>
              <i>SCIENCE / 08</i>
            </div>
          </div>
          <div className="subject-stats">
            <span>
              <b>٠٤</b> وحدات تعليمية
            </span>
            <span>
              <b>{lessonCount.toLocaleString("ar-KW")}</b> درسًا في الفهرس
            </span>
            <span>
              <b>{published ? "٠١" : "٠٠"}</b> درس متاح الآن
            </span>
            <span>
              <BookOpen size={20} /> مطابق لفهرس الكتاب المرفوع
            </span>
          </div>
        </div>
      </section>
      <section className="container section curriculum-section">
        <div className="curriculum-toolbar">
          <div>
            <span className="eyebrow">خطوة صغيرة… معرفة جديدة</span>
            <h2>ماذا سنكتشف اليوم؟</h2>
          </div>
          <label className="search-field">
            <Search size={19} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحثي عن درس…"
              aria-label="ابحثي عن درس"
            />
          </label>
        </div>
        <nav className="unit-nav" aria-label="وحدات المادة">
          {units.map((u, i) => {
            const Icon = icons[i];
            return (
              <a key={u.id} href={"#" + u.id}>
                <Icon size={18} />
                {
                  [
                    "علوم الحياة",
                    "الأرض والفضاء",
                    "العلوم الفيزيائية",
                    "العلوم الكيميائية",
                  ][i]
                }
              </a>
            );
          })}
        </nav>
        {units.map((u, i) => {
          const chapters = u.chapters
            .map((c) => ({ ...c, lessons: c.lessons.filter(matches) }))
            .filter((c) => c.lessons.length);
          const Icon = icons[i];
          if (!chapters.length) return null;
          return (
            <section id={u.id} key={u.id} className={"unit-block " + u.color}>
              <header className="unit-header">
                <span className="unit-icon">
                  <Icon size={28} />
                </span>
                <div>
                  <span className="eyebrow">
                    الوحدة {["الأولى", "الثانية", "الثالثة", "الرابعة"][i]}
                  </span>
                  <h2>{u.title}</h2>
                  <p>{u.description}</p>
                </div>
              </header>
              {chapters.map((c) => (
                <div className="chapter" key={c.title}>
                  <h3>
                    <span />
                    {c.title}
                  </h3>
                  <div className="lesson-grid">
                    {c.lessons.map((l, j) => {
                      const available =
                        "available" in l && l.available && published;
                      const content = (
                        <>
                          <div className="lesson-card-top">
                            <span>
                              الدرس{" "}
                              {units[i].chapters
                                .find((original) => original.title === c.title)!
                                .lessons.findIndex(
                                  (original) => original.id === l.id,
                                ) + 1}
                            </span>
                            <span
                              className={
                                "pill " + (available ? "green" : "muted")
                              }
                            >
                              {available ? "جاهز للاكتشاف" : "قريبًا"}
                            </span>
                          </div>
                          <h4>{l.title}</h4>
                          <div className="lesson-card-bottom">
                            <span>
                              <BookOpen size={15} /> صفحة{" "}
                              {l.page.toLocaleString("ar-KW")}
                            </span>
                            {available ? (
                              <ArrowLeft size={21} />
                            ) : (
                              <Clock3 size={18} />
                            )}
                          </div>
                        </>
                      );
                      return available ? (
                        <Link
                          href={lessonPath}
                          key={l.id}
                          className="lesson-card available"
                        >
                          {content}
                        </Link>
                      ) : (
                        <article
                          key={l.id}
                          className="lesson-card upcoming"
                          aria-label={l.title + " — قريبًا"}
                        >
                          {content}
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          );
        })}
        {!units.some((u) =>
          u.chapters.some((c) => c.lessons.some(matches)),
        ) && (
          <div className="empty-state">
            <Search size={36} />
            <h3>لم نجد درسًا بهذا الاسم</h3>
            <p>جرّبي كلمة أقصر، مثل «الجهاز» أو «الموجات».</p>
            <button className="button outline" onClick={() => setQuery("")}>
              عرض جميع الدروس
            </button>
          </div>
        )}
        <p className="source-caption">
          المصدر: كتاب العلوم للصف الثامن، الطبعة الثانية ٢٠٢٦–٢٠٢٧، قسما الفصل
          الأول. أرقام الصفحات هي الأرقام المطبوعة في الكتاب.
        </p>
      </section>
    </>
  );
}
