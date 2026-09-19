"use client";
import { useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  Apple,
  ArrowLeft,
  Atom,
  BookOpen,
  ChevronLeft,
  Clock3,
  Droplets,
  Flame,
  FlaskConical,
  Globe2,
  HeartPulse,
  Hexagon,
  Leaf,
  Link2,
  Mountain,
  Salad,
  Search,
  Sparkles,
  Stethoscope,
  Sun,
  Utensils,
  Volume2,
  Waves,
  Wind,
  X,
  type LucideIcon,
} from "lucide-react";
import { units, lessonCount, lessonPath, Lesson } from "@/content/curriculum";
import { ImageSlot } from "@/components/ui/image-slot";
import { lessonVisual, lifeHeaderVisual } from "@/content/curriculum-visuals";
const icons = [Leaf, Globe2, Waves, Atom];
const LESSON_ICONS: Record<string, LucideIcon> = {
  nutrients: Apple,
  "balanced-diet": Salad,
  "digestive-structure": Stethoscope,
  "digestive-accessories": Droplets,
  digestion: Utensils,
  respiration: Wind,
  energy: Flame,
  "respiratory-health": HeartPulse,
  "earth-processes": Mountain,
  geology: Globe2,
  "wave-types": Waves,
  "wave-properties": Sparkles,
  hearing: Volume2,
  "sound-properties": Volume2,
  spectrum: Sun,
  "noble-gases": Sparkles,
  metals: Hexagon,
  ionic: Atom,
  covalent: Link2,
};
// Search spelling differs from textbook spelling: ignore tashkeel and tatweel,
// and accept the common variants of alif and ya without altering displayed text.
function searchText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}
export function Curriculum({ published }: { published: boolean }) {
  const [query, setQuery] = useState("");
  const words = searchText(query).split(" ").filter(Boolean);
  const matches = (lesson: Lesson) =>
    words.every((word) => searchText(lesson.title).includes(word));
  const matchingUnits = units.map((unit) =>
    unit.chapters.some((chapter) => chapter.lessons.some(matches)),
  );
  const matchCount = units.reduce(
    (total, unit) =>
      total +
      unit.chapters.reduce(
        (count, chapter) => count + chapter.lessons.filter(matches).length,
        0,
      ),
    0,
  );
  return (
    <>
      <section className="subject-hero">
        <div className="container">
          <div className="breadcrumbs">
            <Link href="/">الرئيسية</Link>
            <ChevronLeft size={14} />
            <Link href="/stage/intermediate">المرحلة المتوسطة</Link>
            <ChevronLeft size={14} />
            <Link href="/grade/8">الصف الثامن</Link>
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
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحثي عن درس…"
              aria-label="ابحثي عن درس"
              aria-describedby="lesson-search-status"
            />
            {query && (
              <button
                type="button"
                className="search-clear"
                aria-label="مسح البحث"
                onClick={() => setQuery("")}
              >
                <X size={18} />
              </button>
            )}
          </label>
        </div>
        <p
          id="lesson-search-status"
          className="search-status"
          role="status"
          aria-live="polite"
        >
          {query.trim()
            ? `${matchCount.toLocaleString("ar-KW")} من ${lessonCount.toLocaleString("ar-KW")} درسًا يطابق بحثك`
            : "ابحثي باسم الدرس، بالتشكيل أو بدونه."}
        </p>
        <nav className="unit-nav" aria-label="وحدات المادة">
          {units.map((u, i) => {
            if (!matchingUnits[i]) return null;
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
              <header
                className={
                  "unit-header" + (u.id === "life" ? " life-unit-header" : "")
                }
              >
                {u.id === "life" ? (
                  <>
                    <div className="life-unit-copy">
                      <div>
                        <span className="eyebrow">
                          الوحدة {["الأولى", "الثانية", "الثالثة", "الرابعة"][i]}
                        </span>
                        <h2>{u.title}</h2>
                        <p>{u.description}</p>
                      </div>
                    </div>
                    <div className="life-unit-visual">
                      <ImageSlot
                        slot={lifeHeaderVisual()}
                        icon={Leaf}
                        sizes="(max-width: 767px) 100vw, 55vw"
                      />
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </header>
              {chapters.map((c) => (
                <div className="chapter" key={c.title}>
                  <h3>
                    <span />
                    {c.title}
                  </h3>
                  <div className="lesson-grid">
                    {c.lessons.map((l, lessonIndex) => {
                      const available =
                        "available" in l && l.available && published;
                      const visual = lessonVisual(l.id);
                      const LessonIcon = LESSON_ICONS[l.id] ?? BookOpen;
                      const content = (
                        <>
                          <div className="lesson-card-top">
                            <span>
                              الدرس{" "}
                              {(
                                units[i].chapters
                                  .find(
                                    (original) => original.title === c.title,
                                  )!
                                  .lessons.findIndex(
                                    (original) => original.id === l.id,
                                  ) + 1
                              ).toLocaleString("ar-KW")}
                            </span>
                            <span
                              className={
                                "pill " + (available ? "green" : "muted")
                              }
                            >
                              {available ? "جاهز للاكتشاف" : "قريبًا"}
                            </span>
                          </div>
                          <div className="lesson-card-main">
                            <div className="lesson-card-visual">
                              {visual ? (
                                <ImageSlot
                                  slot={visual}
                                  icon={LessonIcon}
                                  sizes="72px"
                                />
                              ) : (
                                <span className="lesson-card-icon" aria-hidden="true">
                                  <LessonIcon size={28} strokeWidth={1.4} />
                                </span>
                              )}
                            </div>
                            <h4>{l.title}</h4>
                          </div>
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
                          data-lesson={l.id}
                          className="lesson-card available"
                          style={{ "--card-index": lessonIndex } as CSSProperties}
                        >
                          {content}
                        </Link>
                      ) : (
                        <article
                          key={l.id}
                          data-lesson={l.id}
                          className="lesson-card upcoming"
                          aria-label={l.title + " — قريبًا"}
                          style={{ "--card-index": lessonIndex } as CSSProperties}
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
