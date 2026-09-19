"use client";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpLeft,
  BookOpen,
  FlaskConical,
  Brain,
  Check,
  Compass,
  GraduationCap,
  Leaf,
  Microscope,
  Sparkles,
  Users,
} from "lucide-react";
import { ScienceScene, PlateArt } from "./illustrations";
import { lessonPath, sciencePath } from "@/content/curriculum";
const stories = [
  {
    eyebrow: "٠١ / نفهم الصورة الكبيرة",
    title: "المعلومة تصبح أوضح، حين نراها.",
    text: "شجرات مفاهيم وإنفوجرافيك تربط الأفكار ببعضها، وتحوّل صفحات الكتاب إلى حكاية سهلة الفهم.",
    icon: Brain,
    color: "green",
  },
  {
    eyebrow: "٠٢ / نجرّب بأنفسنا",
    title: "ماذا يحدث لو جرّبتِ؟",
    text: "اختاري طعامًا، تتبّعي رحلة الطاقة، وراقبي كيف تتغيّر الرسوم مع كل خطوة. تعلّم بالمشاركة.",
    icon: FlaskConical,
    color: "blue",
  },
  {
    eyebrow: "٠٣ / نكتشف ما تعلّمناه",
    title: "كل إجابة، فرصة لفهمٍ أعمق.",
    text: "تدرّبي دون ضغط، ثم اختبري فهمك. ستعرفين سبب الإجابة وما تحتاجين إلى مراجعته.",
    icon: Check,
    color: "red",
  },
];
export function Home() {
  const [slide, setSlide] = useState(0);
  const story = stories[slide];
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="eyebrow">
              <span className="tiny-flag">
                <i />
                <i />
                <i />
              </span>{" "}
              المنهج الكويتي، بروح الاكتشاف
            </span>
            <h1>
              فضول اليوم.
              <br />
              <span className="hand-underline">اكتشافات الغد.</span>
              <Sparkles className="heading-spark" />
            </h1>
            <p>
              هنا تتحوّل «لماذا؟» إلى «فهمت!»
              <br />
              دروس نراها، وتجارب نشارك فيها، وخطوات صغيرة
              <br className="desktop-only" /> تصنع ثقةً كبيرة في التعلّم.
            </p>
            <div className="button-row">
              <Link href={sciencePath} className="button primary">
                استكشفي دروس العلوم <ArrowLeft size={19} />
              </Link>
              <a href="#how" className="text-link">
                تعرّفي على التجربة <ArrowUpLeft size={18} />
              </a>
            </div>
            <div className="hero-footnotes">
              <span>
                <Check size={15} /> شرح عربي مبسّط
              </span>
              <span>
                <Check size={15} /> تعلّم تفاعلي
              </span>
              <span>
                <Check size={15} /> متابعة لولي الأمر
              </span>
            </div>
          </motion.div>
        </div>
        <ScienceScene />
      </section>
      <div className="discovery-strip">
        <div className="container">
          <span>
            <Compass /> نفهم بفضول
          </span>
          <i />
          <span>
            <FlaskConical /> نتعلّم بالتجربة
          </span>
          <i />
          <span>
            <Brain /> نربط الأفكار
          </span>
          <i />
          <span>
            <Sparkles /> نتقدّم بثقة
          </span>
        </div>
      </div>
      <section className="section container" id="grades">
        <div className="section-heading">
          <div>
            <span className="eyebrow">لكل مرحلة، حكاية جديدة</span>
            <h2>رحلتك تبدأ من صفّك.</h2>
          </div>
          <p>
            نبدأ بالعلوم للصف الثامن،
            <br />
            ونفتح آفاقًا جديدة مع إضافة المحتوى.
          </p>
        </div>
        <div className="grade-grid">
          <Link href={sciencePath} className="grade-card grade-active">
            <div className="grade-top">
              <span className="pill green">
                <span className="status-dot" /> متاح الآن
              </span>
              <ArrowUpLeft size={24} />
            </div>
            <span className="grade-number">٨</span>
            <h3>الصف الثامن</h3>
            <p>العلوم · الفصل الدراسي الأول</p>
            <div className="grade-bottom">
              <span>ابدئي الاكتشاف</span>
              <ArrowLeft size={20} />
            </div>
            <AtomDoodle />
          </Link>
          <div className="grade-card grade-future">
            <div className="grade-top">
              <span className="pill muted">في رحلتنا القادمة</span>
              <BookOpen size={23} />
            </div>
            <span className="grade-number">٥</span>
            <h3>الصف الخامس</h3>
            <p>مساحة جديدة للتعلّم، قريبًا.</p>
            <div className="grade-bottom">
              <span>المحتوى لم يُضف بعد</span>
              <Compass size={19} />
            </div>
          </div>
          <div className="grade-card grade-future yellow-card">
            <div className="grade-top">
              <span className="pill muted">في رحلتنا القادمة</span>
              <GraduationCap size={25} />
            </div>
            <span className="grade-number">٢</span>
            <h3>الصف الثاني</h3>
            <p>اكتشافات صغيرة، لبدايات كبيرة.</p>
            <div className="grade-bottom">
              <span>المحتوى لم يُضف بعد</span>
              <Sparkles size={19} />
            </div>
          </div>
        </div>
      </section>
      <section className="section lesson-feature-wrap">
        <div className="container lesson-feature">
          <div className="feature-art">
            <span className="feature-sticker">درسنا الأول</span>
            <PlateArt />
            <div className="floating-caption">
              <Leaf size={18} /> ماذا تخبرك وجبتك عن جسمك؟
            </div>
          </div>
          <div className="feature-copy">
            <span className="eyebrow">علوم الحياة / الغذاء المتوازن</span>
            <h2>
              في طبقك الصغير،
              <br />
              عالمٌ كبير من العلوم.
            </h2>
            <p>
              من أين تأتي طاقتك؟ وكيف ينمو جسمك؟ اكتشفي المغذّيات من خلال أطعمة
              تعرفينها، وتجارب تتحكّمين بها.
            </p>
            <div className="feature-tags">
              <span>شجرة مفاهيم</span>
              <span>تجارب تفاعلية</span>
              <span>اختبار من ١٠ أسئلة</span>
            </div>
            <Link className="button primary" href={lessonPath}>
              لنكتشف المغذّيات <ArrowLeft size={19} />
            </Link>
          </div>
        </div>
      </section>
      <section id="how" className="section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">أكثر من قراءة وحفظ</span>
            <h2>تعلّم يترك أثرًا.</h2>
          </div>
          <div className="carousel-controls">
            <button
              className="icon-button"
              aria-label="الفكرة السابقة"
              onClick={() => setSlide((slide + 2) % 3)}
            >
              <ArrowRight size={20} />
            </button>
            <button
              className="icon-button"
              aria-label="الفكرة التالية"
              onClick={() => setSlide((slide + 1) % 3)}
            >
              <ArrowLeft size={20} />
            </button>
          </div>
        </div>
        <div
          className="learning-carousel"
          aria-roledescription="عارض أفكار التعلّم"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={slide}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="carousel-inner"
            >
              <div className={"carousel-visual " + story.color}>
                <story.icon size={90} strokeWidth={1.2} />
                <span className="orbit-dot" />
                <span className="visual-label">اكتشفي بطريقتك</span>
              </div>
              <div aria-live="polite">
                <span className="eyebrow">{story.eyebrow}</span>
                <h3>{story.title}</h3>
                <p>{story.text}</p>
                <div className="carousel-dots">
                  {stories.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setSlide(i)}
                      aria-label={s.eyebrow}
                      aria-pressed={i === slide}
                    >
                      <span className={i === slide ? "selected" : ""} />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
      <section className="container parent-banner">
        <div className="parent-illustration">
          <Users size={46} />
          <span>
            <Check size={18} />
          </span>
        </div>
        <div>
          <span className="eyebrow">معًا، خطوة بخطوة</span>
          <h2>أنتِ تكتشفين… وأسرتك تتابع تقدّمك.</h2>
          <p>
            حساب لكل طفل، وتقدّم محفوظ، وصورة أوضح لولي الأمر عن نقاط القوة وما
            يحتاج إلى مراجعة.
          </p>
        </div>
        <Link href="/login?mode=register" className="button outline">
          إنشاء حساب ولي أمر <ArrowUpLeft size={18} />
        </Link>
      </section>
    </>
  );
}
function AtomDoodle() {
  return (
    <div className="grade-doodle" aria-hidden="true">
      <Microscope size={94} strokeWidth={1.1} />
    </div>
  );
}
