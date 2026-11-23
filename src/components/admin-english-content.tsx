import { readdir } from "node:fs/promises";
import { join } from "node:path";
import Link from "next/link";
import { BookOpen, Volume2 } from "lucide-react";
import { grammarPath, grammarRules } from "@/content/english-grammar";
import { englishIndex } from "@/content/english-index.mjs";
import { questionCount } from "@/server/english.mjs";

const count = (n: number) => n.toLocaleString("ar-u-nu-arab");

export async function AdminEnglishContent() {
  const lessons = englishIndex.map((lesson, index) => ({
    ...lesson,
    number: index + 1,
    questions: questionCount(index + 1),
  }));
  const total =
    lessons.reduce((sum, lesson) => sum + lesson.questions, 0) +
    grammarRules
      .filter((rule) => rule.page > lessons.length)
      .reduce((sum, rule) => sum + questionCount(rule.page), 0);
  const files = await readdir(
    join(process.cwd(), "public", "english", "audio"),
  ).catch(() => []);
  const recordings = files.filter((file) => file.endsWith(".mp3")).length;
  return (
    <div className="panel admin-panel admin-english-content">
      <BookOpen size={30} aria-hidden />
      <h3>إنجليزي الصف الثاني</h3>
      <p>
        {count(lessons.length)} درسًا · {count(total)} سؤالًا ·{" "}
        {count(grammarRules.length)} قواعد
      </p>
      <p>
        <Volume2 size={18} aria-hidden /> {count(recordings)} مقطعًا صوتيًا
        للدروس والقواعد
      </p>
      <div className="school-question-audio">
        <Link className="button outline small" href="/grade/2/english">
          معاينة وحدة My School Day
        </Link>
        <Link className="button outline small" href={grammarPath}>
          معاينة القواعد
        </Link>
        <Link className="button outline small" href="/admin?tab=ai">
          التقييم والإجابات
        </Link>
      </div>
      <details>
        <summary>الدروس والأسئلة</summary>
        <ul>
          {lessons.map((lesson) => (
            <li key={lesson.number}>
              <Link
                className="text-link"
                href={`/grade/2/english/${lesson.number}`}
              >
                {lesson.ar}
              </Link>
              <span>{count(lesson.questions)}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
