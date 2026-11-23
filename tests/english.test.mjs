import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/server/store.mjs";
import { sceneDocument } from "../src/content/english-scene.mjs";
import { activity, englishJourney, questions } from "../src/server/english.mjs";

test("all 20 English lessons have diagrams and keep the key on the server", () => {
  for (let page = 1; page <= 20; page++) {
    const lesson = activity(page);
    assert.equal(
      lesson.questions.length,
      page === 15 ? 55 : page === 14 ? 13 : 10,
    );
    for (const q of lesson.questions) {
      assert.match(sceneDocument(q.scene, q.id), /data-composition-id/);
      assert.ok(!("answer" in q));
      assert.ok(questions.has(q.id));
    }
  }
});

test("the English journey awards the best score once per saved question", () => {
  const answers = activity(1).questions.map(({ id }, index) => ({
    qid: id,
    score: index ? 100 : null,
  }));
  const [first, second, ...later] = englishJourney(
    answers.concat(
      { qid: "1-1", score: 80 },
      { qid: "1-1", score: 60 },
      { qid: "2-1", score: null },
    ),
  );
  assert.deepEqual(first, {
    page: 1,
    possible: 10,
    answered: 10,
    scored: 10,
    points: 9.8,
    complete: true,
  });
  assert.deepEqual(second, {
    page: 2,
    possible: 10,
    answered: 1,
    scored: 0,
    points: 0,
    complete: false,
  });
  assert.equal(later.length, 18);
});
test("username login, English attempts, partial credit, retries and family isolation", () => {
  const db = createStore(":memory:");
  try {
    const first = db.registerFamily({
      name: "Parent",
      username: "parent-one",
      password: "parent-pass-12",
      children: [
        {
          name: "Student",
          username: "pupil-one",
          pin: "pupil-pass-12",
          grade: 2,
          gender: "male",
        },
      ],
    });
    const other = db.registerFamily({
      name: "Other",
      username: "other-family",
      password: "other-pass-12",
      children: [],
    });
    const student = db.loginChild("pupil-one", "pupil-pass-12");
    assert.equal(db.loginParent("parent-one", "parent-pass-12").id, first.id);
    const input = {
      qid: "17-1",
      answer: "i like english",
      nonce: "english-test-0001",
    };
    const initial = db.english.submit(student.id, input);
    assert.equal(initial.attempt.score, 20);
    assert.equal(db.english.submit(student.id, input).created, false);
    assert.throws(() =>
      db.english.submit(student.id, { ...input, answer: "I like English." }),
    );
    assert.equal(
      db.english.submit(student.id, {
        ...input,
        answer: "I like English.",
        nonce: "english-test-0002",
      }).attempt.score,
      100,
    );
    assert.equal(db.snapshot(first.id).children[0].englishAttempts.length, 2);
    assert.deepEqual(db.snapshot(other.id).children, []);
    assert.throws(() => db.english.review(student.id, initial.attempt.id, 80));
    const admin = db.promoteAdmin("other-family");
    db.english.setModel(admin.id, "test-model");
    const submitted = db.english.submit(student.id, {
      qid: "19-1",
      answer: "I play in the morning.",
      nonce: "english-test-0003",
    }).attempt;
    assert.equal(submitted.source, "waiting");
    assert.equal(submitted.score, null);
    db.english.review(admin.id, submitted.id, 88);
    assert.equal(db.english.finish(submitted, 10, "ai", "hint").score, 88);
    assert.equal(db.english.list(admin.id).length, 3);
  } finally {
    db.close();
  }
});

test("matching validates a complete one-to-one answer and gives partial credit", () => {
  const db = createStore(":memory:");
  try {
    const qid = "4-3";
    const question = questions.get(qid);
    const key = question.answer.split(",");
    const check = (answer) => db.english.preview({ qid, answer });
    assert.equal(activity(4).questions[2].matches.right.length, 3);
    assert.ok(!("answer" in activity(4).questions[2]));
    assert.equal(check(key.join(",")).score, 100);
    const wrong = [key[0], key[2], key[1]].join(",");
    assert.equal(check(wrong).score, 33);
    assert.deepEqual(check(wrong).matchResults, [true, false, false]);
    for (const invalid of ["0,0,1", "1,-1,0", "0,1", "2,0,3"])
      assert.throws(() => check(invalid));
    assert.equal(activity(21).questions.length, 15);
  } finally {
    db.close();
  }
});

test("spelling records a Whisper transcript and protects playback", async () => {
  const { spellingAnswer } =
    await import("../src/server/english-transcription.mjs");
  assert.equal(spellingAnswer("S-H-O-E-S."), "shoes");
  assert.equal(spellingAnswer("Ess aitch oh pee ess."), "shops");
  const db = createStore(":memory:");
  try {
    const parent = db.registerFamily({
      name: "Parent",
      username: "family-spell",
      password: "password-long-enough",
      children: [
        {
          name: "A",
          username: "spelling-child",
          pin: "123456",
          grade: 2,
          gender: "male",
        },
        {
          name: "B",
          username: "other-child",
          pin: "123456",
          grade: 2,
          gender: "male",
        },
      ],
    });
    const child = db.loginChild("spelling-child", "123456");
    const other = db.loginChild("other-child", "123456");
    const wav = Buffer.from("recorded sound");
    const request = { qid: "9-1", answer: "shoes", nonce: "spelling-audio-01" };
    const voice = { transcript: "S-H-O-E-S.", wav };
    const otherLesson = db.english.submit(child.id, {
      qid: "4-1",
      answer: "In the lab",
      nonce: "english-other-lesson",
    }).attempt;
    const otherPupil = db.english.submit(other.id, request).attempt;
    const recorded = db.english.submitRecording(child.id, request, voice);
    assert.equal(recorded.score, 100);
    assert.equal(recorded.source, "whisper");
    assert.equal(
      db.english.history(child.id)[0].recording.transcript,
      "S-H-O-E-S.",
    );
    assert.equal(
      db.english.submitRecording(child.id, request, voice).id,
      recorded.id,
    );
    assert.deepEqual(
      Buffer.from(db.english.recording(parent.id, recorded.id).wav),
      wav,
    );
    assert.equal(db.english.recording(other.id, recorded.id), undefined);
    assert.throws(() =>
      db.english.submitRecording(child.id, { ...request, qid: "4-1" }, voice),
    );
    assert.throws(() => db.english.resetLesson(parent.id, 9));
    assert.throws(() => db.english.resetLesson(child.id, 100));
    assert.deepEqual(db.english.resetLesson(child.id, 9), { ok: true });
    assert.equal(db.english.recording(parent.id, recorded.id), undefined);
    assert.deepEqual(
      db.english.history(child.id).map(({ id }) => id),
      [otherLesson.id],
    );
    assert.deepEqual(
      db.english.history(other.id).map(({ id }) => id),
      [otherPupil.id],
    );
    assert.throws(() => db.english.finish(recorded, 100, "ai", ""), {
      status: 409,
    });
    const replacement = db.english.submitRecording(child.id, request, voice);
    assert.ok(replacement.id > recorded.id);
  } finally {
    db.close();
  }
});

test("model scores require typed, bounded rubric points and a correction", async () => {
  const { validateMark } = await import("../src/server/english-model.ts");
  const { assess, rubricFor } =
    await import("../src/server/english-rubrics.mjs");
  const criteria = rubricFor(questions.get("19-3"));
  const mark = {
    points: { meaning: 40, grammar: 20, mechanics: 15 },
    feedback: "راجع الفعل.",
    correction: "The child eats breakfast.",
  };
  assert.equal(validateMark(mark, criteria), mark);
  assert.equal(
    assess(
      questions.get("19-3"),
      criteria.map((c) => mark.points[c.key]),
      mark.correction,
    ).score,
    75,
  );
  for (const points of [
    { ...mark.points, meaning: 41 },
    { ...mark.points, grammar: "20" },
    { meaning: 5 },
    { ...mark.points, extra: 1 },
  ])
    assert.throws(() => validateMark({ ...mark, points }, criteria));
  assert.throws(() => validateMark({ ...mark, correction: "" }, criteria));
  assert.throws(() => validateMark({ ...mark, score: 99 }, criteria));
});

test("authenticated catalogue follows every cursor and requests hidden models", async () => {
  const { codex } = await import("../src/server/english-codex.mjs");
  const cursors = [];
  const client = {
    connected: async () => true,
    call: async (method, p) => {
      assert.equal(method, "model/list");
      assert.equal(p.includeHidden, true);
      cursors.push(p.cursor);
      return {
        data: [
          {
            model: p.cursor ? "b" : "a",
            displayName: "Name",
            hidden: !!p.cursor,
          },
        ],
        nextCursor: p.cursor ? null : "next",
      };
    },
  };
  assert.deepEqual(
    (await codex.models.call(client)).map((x) => x.id),
    ["a", "b"],
  );
  assert.deepEqual(cursors, [null, "next"]);
  await assert.rejects(
    codex.models.call({ ...client, connected: async () => false }),
  );
});
