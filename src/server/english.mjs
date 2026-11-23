import { assess, punctuationMark, rubricFor } from "./english-rubrics.mjs";
import lessons from "./english-lessons.json" with { type: "json" };
export const questions = new Map(
  lessons.flatMap((l) => l.questions.map((q) => [q.id, q])),
);
export function questionCount(page) {
  return lessons[page - 1]?.questions.length ?? 0;
}
export function activity(page) {
  const lesson = lessons[page - 1];
  if (!lesson) return null;
  return {
    ...lesson,
    questions: lesson.questions.map(({ answer, rubric, strict, ...q }) => ({
      ...q,
    })),
  };
}
const normalize = (value) =>
  value.trim().replaceAll("’", "'").replace(/\s+/g, " ");
function matchedPairs(question, answer) {
  const key = question.answer.split(",");
  return answer.split(",").map((entry, index) => entry === key[index]);
}

export function mark(q, answer) {
  if (q.kind === "match") {
    const matchResults = matchedPairs(q, answer);
    const correct = matchResults.filter(Boolean).length;
    const total = matchResults.length;
    return {
      score: Math.round((correct * 100) / total),
      source: "key",
      feedback:
        correct === total
          ? "ممتاز! كل الوصلات صحيحة."
          : `وصلت ${correct.toLocaleString("ar-u-nu-arab")} من ${total.toLocaleString("ar-u-nu-arab")} صح. عدّل الوصلات المتقطّعة.`,
      matchResults,
    };
  }
  const targets = q.answer.split("|").map(normalize),
    value = normalize(answer);
  const plain = (s) => s.toLowerCase().replace(/[.!?]+$/, "");
  if (q.task === "punctuate") {
    const detail = punctuationMark(q, answer);
    if (detail)
      return {
        score: detail.score,
        source: "key",
        detail,
        feedback:
          detail.score === 100
            ? "إجابة صحيحة!"
            : "راجع الحروف الكبيرة وعلامات الترقيم في التصحيح.",
      };
  }
  const exact = targets.some((t) =>
    q.strict || q.task === "writing" ? value === t : plain(value) === plain(t),
  );
  if (exact) {
    const detail =
      q.kind === "write"
        ? assess(
            q,
            rubricFor(q).map((c) => c.max),
            value,
          )
        : null;
    return { score: 100, source: "key", detail, feedback: "إجابة صحيحة!" };
  }
  if (q.kind === "choice" || (!q.rubric && !q.strict))
    return {
      score: 0,
      source: "key",
      feedback: "جرّب مرة تانية. الإجابة هي " + targets[0],
    };
  return {
    score: null,
    source: "review",
    feedback: "إجابتك محفوظة وفي انتظار المراجعة.",
  };
}
export function englishStore(db, { requireRole, fail }) {
  db.exec(`CREATE TABLE IF NOT EXISTS english_attempts (
    id INTEGER PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nonce TEXT NOT NULL, qid TEXT NOT NULL, answer TEXT NOT NULL, score INTEGER CHECK(score BETWEEN 0 AND 100),
    source TEXT NOT NULL, feedback TEXT NOT NULL, model TEXT, created_at INTEGER NOT NULL, UNIQUE(user_id,nonce));
    CREATE INDEX IF NOT EXISTS english_history ON english_attempts(user_id,id);`);
  const columns = db
    .prepare("PRAGMA table_info(english_attempts)")
    .all()
    .map((c) => c.name);
  if (!columns.includes("detail"))
    db.exec("ALTER TABLE english_attempts ADD COLUMN detail TEXT");
  if (!columns.includes("generation"))
    db.exec(
      "ALTER TABLE english_attempts ADD COLUMN generation INTEGER NOT NULL DEFAULT 0",
    );
  function result(r) {
    if (!r) return r;
    const question = questions.get(r.qid);
    const match = question?.kind === "match";
    return {
      ...r,
      correct: r.score == null ? null : r.score === 100,
      earned: r.score == null ? null : r.score / 100,
      possible: 1,
      detail: r.detail ? JSON.parse(r.detail) : null,
      prompt: question?.prompt,
      ...(match && {
        matchResults: matchedPairs(question, r.answer),
        answerText: r.answer
          .split(",")
          .map(
            (right, left) =>
              question.matches.left[left] +
              " — " +
              question.matches.right[Number(right)],
          )
          .join(" / "),
      }),
    };
  }
  const row = (id) =>
    result(db.prepare("SELECT * FROM english_attempts WHERE id=?").get(id));
  const history = (uid) =>
    db
      .prepare(
        "SELECT * FROM english_attempts WHERE user_id=? ORDER BY id DESC",
      )
      .all(uid)
      .map(result);
  const selected = () =>
    db.prepare("SELECT value FROM settings WHERE key='english.model'").get()
      ?.value || "";
  function questionForAnswer(qid, answer) {
    const question = questions.get(qid);
    if (
      !question ||
      typeof answer !== "string" ||
      !answer.trim() ||
      answer.length > 500 ||
      (question.kind === "choice" && !question.options.includes(answer))
    )
      fail("تحقّق من الإجابة.");
    if (question.kind === "match") {
      const choices = answer.split(",");
      const total = question.matches.right.length;
      if (
        choices.length !== total ||
        new Set(choices).size !== total ||
        choices.some(
          (choice) => !/^[0-9]$/.test(choice) || Number(choice) >= total,
        )
      )
        fail("كمّل كل الوصلات قبل إرسال الإجابة.");
    }
    return question;
  }
  return {
    history,
    selected,
    preview({ qid, answer }) {
      const grade = mark(questionForAnswer(qid, answer), answer);
      return {
        ...grade,
        preview: true,
        earned: grade.score === null ? null : grade.score / 100,
        possible: 1,
        feedback:
          grade.score === null
            ? "سجّل الدخول كطالب لتقييم إجابة الكتابة."
            : grade.feedback,
      };
    },
    submit(uid, { qid, answer, nonce }) {
      requireRole(uid, ["student"]);
      const q = questionForAnswer(qid, answer);
      if (typeof nonce !== "string" || !/^[a-z0-9-]{12,80}$/i.test(nonce))
        fail("تحقّق من الإجابة.");
      const model = selected(),
        m = mark(q, answer);
      const send = model && q.kind === "write";
      const created = db
        .prepare(
          `INSERT INTO english_attempts(user_id,nonce,qid,answer,score,source,feedback,model,created_at,detail)
        VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,nonce) DO NOTHING`,
        )
        .run(
          uid,
          nonce,
          qid,
          answer,
          send ? null : m.score,
          send ? "waiting" : m.source,
          send ? "الإجابة محفوظة وجارٍ تقييمها." : m.feedback,
          send ? model : null,
          Date.now(),
          !send && m.detail ? JSON.stringify(m.detail) : null,
        );
      const r = result(
        db
          .prepare("SELECT * FROM english_attempts WHERE user_id=? AND nonce=?")
          .get(uid, nonce),
      );
      if (r.qid !== qid || r.answer !== answer)
        fail("المحاولة مستخدمة لإجابة أخرى.", 409);
      return { attempt: r, created: !!created.changes };
    },
    finish(attempt, score, source, feedback, detail = null) {
      db.prepare(
        "UPDATE english_attempts SET score=?,source=?,feedback=?,detail=? WHERE id=? AND generation=? AND source='waiting'",
      ).run(
        score,
        source,
        feedback,
        detail ? JSON.stringify(detail) : null,
        attempt.id,
        attempt.generation,
      );
      return row(attempt.id);
    },
    review(admin, id, score) {
      requireRole(admin, ["admin"]);
      if (!Number.isInteger(score) || score < 0 || score > 100 || !row(id))
        fail("اختر محاولة ودرجة بين ٠ و١٠٠.");
      db.prepare(
        "UPDATE english_attempts SET score=?,detail=NULL,source='teacher',feedback='راجعت المدرّسة الإجابة.' WHERE id=?",
      ).run(score, id);
      return row(id);
    },
    retry(admin, id) {
      requireRole(admin, ["admin"]);
      const r = row(id),
        model = selected();
      if (!r || !model || questions.get(r.qid)?.kind !== "write")
        fail("اختار موديل ومحاولة كتابة.");
      db.prepare(
        "UPDATE english_attempts SET score=NULL,detail=NULL,generation=generation+1,source='waiting',model=?,feedback='جارٍ التقييم.' WHERE id=?",
      ).run(model, id);
      return row(id);
    },
    list(admin) {
      requireRole(admin, ["admin"]);
      return db
        .prepare(
          "SELECT a.*,u.name FROM english_attempts a JOIN users u ON u.id=a.user_id ORDER BY a.id DESC",
        )
        .all()
        .map(result);
    },
    setModel(admin, model) {
      requireRole(admin, ["admin"]);
      db.prepare(
        "INSERT OR REPLACE INTO settings(key,value) VALUES('english.model',?)",
      ).run(model);
    },
  };
}
