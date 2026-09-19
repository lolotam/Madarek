"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  CheckCircle2,
  Leaf,
  Lightbulb,
  Network,
  FlaskConical,
  PencilLine,
  Trophy,
  ArrowRight,
} from "lucide-react";
import {
  ConceptTree,
  FoodExplorer,
  EnergyLab,
  Practice,
} from "./lesson-activities";
import { Quiz } from "./quiz";
import { PlateArt } from "./illustrations";
import { api, useSession } from "./providers";
import { sciencePath } from "@/content/curriculum";
import {
  fiberNoteTarget,
  learningGoalsTarget,
  lessonHeroTarget,
  lessonSummaryTarget,
  sectionExploreTarget,
  sectionMapTarget,
  sectionPracticeTarget,
  sectionQuizTarget,
} from "@/content/audio-targets";
const steps = [
  { id: "map", name: "نفهم", icon: Network },
  { id: "explore", name: "نجرّب", icon: FlaskConical },
  { id: "practice", name: "نتدرّب", icon: PencilLine },
  { id: "quiz", name: "نختبر فهمنا", icon: Trophy },
];
export function Lesson() {
  const { user } = useSession();
  const [sections, setSections] = useState<string[]>([]),
    [message, setMessage] = useState(""),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    setSections([]);
    if (user?.role === "student")
      api("dashboard")
        .then((d) => setSections(d.progress.sections))
        .catch(() =>
          setMessage(
            "تعذّر تحميل التقدّم. يمكنك إعادة المحاولة عند حفظ المقطع.",
          ),
        );
  }, [user]);
  async function complete(section: string) {
    if (user?.role !== "student") {
      setMessage(
        "لحفظ تقدّمك، سجّلي الدخول بحساب الطالب. يمكنك متابعة الشرح الآن.",
      );
      return;
    }
    setSaving(true);
    try {
      const data = await api("progress", { section });
      setSections(data.sections);
      setMessage("حُفظ تقدّمك. خطوة رائعة!");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  const completeButton = (id: string) => (
    <div className="complete-row">
      <button
        disabled={saving}
        onClick={() => complete(id)}
        className={
          "button small " + (sections.includes(id) ? "soft" : "outline")
        }
      >
        <CheckCircle2 size={18} />
        {sections.includes(id)
          ? "أنجزتِ هذا المقطع"
          : saving
            ? "جارٍ الحفظ…"
            : "فهمت، أنجزت هذا المقطع"}
      </button>
    </div>
  );
  return (
    <>
      <section className="lesson-hero" data-audio-target={lessonHeroTarget.id}>
        <div className="container">
          <div className="breadcrumbs">
            <Link href="/">الرئيسية</Link>
            <ChevronLeft size={14} />
            <Link href={sciencePath}>علوم الصف الثامن</Link>
            <ChevronLeft size={14} />
            <span>المغذّيات</span>
          </div>
          <div className="lesson-hero-grid">
            <div>
              <span className="pill green">
                <Leaf size={16} /> علوم الحياة · الغذاء المتوازن
              </span>
              <h1>
                المغذّيات<span className="title-dot">.</span>
              </h1>
              <p className="lesson-lead">
                كيف يساعد طعامك جسمك
                <br />
                على النمو والحركة والاكتشاف؟
              </p>
              <div className="lesson-meta">
                <span>
                  <BookOpen size={17} /> الصفحات ٢٤–٢٨
                </span>
                <span>
                  <FlaskConical size={17} /> تعلّم وتجربة
                </span>
                <span>
                  <Trophy size={17} /> ١٠ أسئلة
                </span>
              </div>
            </div>
            <div className="lesson-plate">
              <PlateArt preload />
              <span className="plate-label">طبق واحد، أدوار كثيرة!</span>
            </div>
          </div>
        </div>
      </section>
      <nav className="lesson-nav" aria-label="مقاطع الدرس">
        <div className="container">
          {steps.map((s) => (
            <a key={s.id} href={"#" + s.id}>
              <s.icon size={19} />
              {s.name}
              {sections.includes(s.id) && <CheckCircle2 size={15} />}
            </a>
          ))}
          <span className="lesson-nav-note">خطوة بخطوة، على راحتك</span>
        </div>
      </nav>
      <div className="container lesson-body">
        <aside
          className="learning-goals"
          data-audio-target={learningGoalsTarget.id}
        >
          <span className="goal-icon">
            <Lightbulb size={26} />
          </span>
          <div>
            <h2>في نهاية رحلتنا، ستستطيعين…</h2>
            <p>
              تصنيف المغذّيات، وربط كل نوع بوظيفته، واكتشاف مصادره في أطعمة
              حياتك اليومية.
            </p>
          </div>
        </aside>
        {message && (
          <div className="save-message" role="status">
            {message}
            <button onClick={() => setMessage("")} aria-label="إغلاق التنبيه">
              ×
            </button>
          </div>
        )}
        <section
          id="map"
          className="lesson-section"
          data-audio-target={sectionMapTarget.id}
        >
          <SectionHeading
            number="٠١"
            label="نفهم الصورة الكبيرة"
            title="جسمك فريق… والمغذّيات أعضاؤه."
          />
          <p className="section-intro">
            المغذّيات مواد كيميائية توجد في الأطعمة، يحتاج إليها الجسم للنمو
            والحصول على الطاقة والمحافظة على الصحة. لنرَ كيف تتعاون.
          </p>
          <ConceptTree />
          {completeButton("map")}
        </section>
        <section
          id="explore"
          className="lesson-section"
          data-audio-target={sectionExploreTarget.id}
        >
          <SectionHeading
            number="٠٢"
            label="مختبرك الصغير"
            title="المعلومة تصبح حيّة حين تجرّبين."
          />
          <h3 className="activity-title">أ. ماذا يوجد في طعامك؟</h3>
          <p>اختاري طعامًا لتكتشفي بعض مغذّياته ووظائفها.</p>
          <FoodExplorer />
          <h3 className="activity-title">ب. من الطعام… إلى ما يفعله الجسم</h3>
          <p>تحكّمي في الخطوات وراقبي العلاقة بين المغذّي ووظيفته.</p>
          <EnergyLab />
          <div className="fiber-note" data-audio-target={fiberNoteTarget.id}>
            <Leaf size={29} />
            <div>
              <h3>ولا ننسى الألياف!</h3>
              <p>
                توجد في الحبوب الكاملة والخضراوات والفواكه والبقوليات. تساعد على
                حركة الأمعاء والوقاية من الإمساك، وتدعم صحة الجهاز الهضمي.
              </p>
            </div>
          </div>
          {completeButton("explore")}
        </section>
        <section
          id="practice"
          className="lesson-section"
          data-audio-target={sectionPracticeTarget.id}
        >
          <SectionHeading
            number="٠٣"
            label="نجرّب دون ضغط"
            title="فكّري، أجيبي، وتعلّمي من المحاولة."
          />
          <Practice />
          {completeButton("practice")}
        </section>
        <section
          className="lesson-summary"
          data-audio-target={lessonSummaryTarget.id}
        >
          <div>
            <span className="eyebrow">خلاصة في دقيقة</span>
            <h2>
              ست أفكار
              <br />
              تبقى معك.
            </h2>
          </div>
          <ul>
            <li>
              <b>الكربوهيدرات</b>
              <span>طاقة للخلايا</span>
            </li>
            <li>
              <b>البروتينات</b>
              <span>بناء وإصلاح</span>
            </li>
            <li>
              <b>الدهون</b>
              <span>طاقة مركّزة وحماية</span>
            </li>
            <li>
              <b>الماء</b>
              <span>نقل وتنظيم</span>
            </li>
            <li>
              <b>الفيتامينات</b>
              <span>دعم الوظائف الحيوية</span>
            </li>
            <li>
              <b>الأملاح المعدنية</b>
              <span>عظام ودم ووظائف أخرى</span>
            </li>
          </ul>
        </section>
        <section
          id="quiz"
          className="lesson-section"
          data-audio-target={sectionQuizTarget.id}
        >
          <SectionHeading
            number="٠٤"
            label="حان وقت الاكتشاف"
            title="ماذا تعلّمتِ اليوم؟"
          />
          <p className="section-intro">
            اختبار من اختيار متعدد وأكملي. لكل سؤال درجة، وستظهر التفسيرات بعد
            التسليم. هذا اختبار للفهم، لا سباق مع الوقت.
          </p>
          <Quiz
            onComplete={() =>
              setSections((previous) => [...new Set([...previous, "quiz"])])
            }
          />
        </section>
        <div className="lesson-navigation">
          <div>
            <span className="eyebrow">هذه بداية الرحلة</span>
            <span className="muted-text">
              <ArrowRight size={16} /> لا يوجد درس سابق
            </span>
          </div>
          <Link className="button outline" href={sciencePath}>
            العودة إلى الفهرس <BookOpen size={18} />
          </Link>
          <div>
            <span className="eyebrow">الدرس التالي · قريبًا</span>
            <b>
              النظام الغذائي المتوازن <ArrowLeft size={17} />
            </b>
          </div>
        </div>
        <p className="source-caption">
          أُعدّ الشرح بالاستناد إلى كتاب العلوم المرفوع للصف الثامن، الفصل الأول
          ٢٠٢٦–٢٠٢٧، ص ٢٤–٢٨. الرسوم نماذج تعليمية مبسّطة.
        </p>
      </div>
    </>
  );
}
function SectionHeading({
  number,
  label,
  title,
}: {
  number: string;
  label: string;
  title: string;
}) {
  return (
    <div className="lesson-section-heading">
      <span className="section-number">{number}</span>
      <div>
        <span className="eyebrow">{label}</span>
        <h2>{title}</h2>
      </div>
    </div>
  );
}
