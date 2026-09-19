import test from "node:test";
import assert from "node:assert/strict";
import { parseYouTubeId, parseDuration } from "../src/server/videos.mjs";
import { createStore } from "../src/server/store.mjs";

const id = "dQw4w9WgXcQ";

test("common YouTube link shapes resolve to the 11-character video id", () => {
  for (const url of [
    id,
    `https://www.youtube.com/watch?v=${id}&t=10s`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/live/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`,
  ])
    assert.equal(parseYouTubeId(url), id, url);
});

test("non-YouTube or malformed links are rejected", () => {
  for (const bad of [
    "",
    null,
    "https://vimeo.com/123456",
    `https://evil.example/watch?v=${id}`,
    `https://youtube.com.evil.example/watch?v=${id}`,
    "https://youtu.be/short",
    "javascript:alert(1)",
  ])
    assert.equal(parseYouTubeId(bad), null, String(bad));
});

test("durations accept m:ss and h:mm:ss and reject nonsense", () => {
  assert.equal(parseDuration("4:05"), 245);
  assert.equal(parseDuration("1:02:03"), 3723);
  assert.equal(parseDuration("90"), 90);
  assert.equal(parseDuration(""), null);
  assert.equal(parseDuration(undefined), null);
  assert.ok(Number.isNaN(parseDuration("4:75")));
  assert.ok(Number.isNaN(parseDuration("4:5")));
  assert.ok(Number.isNaN(parseDuration("abc")));
  assert.ok(Number.isNaN(parseDuration("0")));
});

const password = "Safe-password-123";
const input = {
  lessonId: "nutrients",
  url: `https://youtu.be/${id}`,
  title: "كيف نقرأ الملصق الغذائي؟",
  goal: "نتعرّف على المغذّيات في ملصق حقيقي.",
  kind: "explain",
  duration: "4:05",
  position: 1,
  published: false,
};
function adminStore() {
  const store = createStore(":memory:");
  store.registerParent({ name: "إدارة", email: "videos-admin@example.test", password });
  const admin = store.promoteAdmin("videos-admin@example.test");
  const parent = store.registerParent({
    name: "ولي الأمر",
    email: "videos-parent@example.test",
    password,
  });
  return { store, admin, parent };
}

test("only admins manage videos; students see published ones in order", () => {
  const { store, admin, parent } = adminStore();
  try {
    assert.throws(
      () => store.saveLessonVideo(parent.id, input),
      (e) => e.status === 403,
    );
    assert.throws(() => store.listLessonVideos(parent.id), (e) => e.status === 403);
    const draft = store.saveLessonVideo(admin.id, input);
    assert.deepEqual(
      [draft.youtubeId, draft.durationSeconds, draft.published],
      [id, 245, false],
    );
    assert.deepEqual(store.publishedVideos("nutrients"), []);
    store.saveLessonVideo(admin.id, {
      ...input,
      id: draft.id,
      published: true,
      position: 2,
    });
    store.saveLessonVideo(admin.id, {
      ...input,
      title: "تجربة الكشف عن النشا",
      kind: "experiment",
      position: 0,
      published: true,
    });
    assert.deepEqual(
      store.publishedVideos("nutrients").map((v) => v.title),
      ["تجربة الكشف عن النشا", "كيف نقرأ الملصق الغذائي؟"],
    );
    assert.deepEqual(store.publishedVideos("platform"), []);
    assert.equal(store.listLessonVideos(admin.id).videos.length, 2);
    store.deleteLessonVideo(admin.id, { id: draft.id });
    assert.equal(store.publishedVideos("nutrients").length, 1);
    const actions = store.listAdminAudit(admin.id).entries.map((e) => e.action);
    assert.ok(actions.includes("videos.save"));
    assert.ok(actions.includes("videos.delete"));
  } finally {
    store.close();
  }
});

test("invalid video input is rejected with a clear message", () => {
  const { store, admin } = adminStore();
  try {
    assert.throws(
      () => store.saveLessonVideo(admin.id, { ...input, url: "https://vimeo.com/1" }),
      /رابط يوتيوب/,
    );
    assert.throws(
      () => store.saveLessonVideo(admin.id, { ...input, kind: "ad" }),
      /نوع الفيديو/,
    );
    assert.throws(
      () => store.saveLessonVideo(admin.id, { ...input, lessonId: "../x" }),
      /الدرس/,
    );
    assert.throws(
      () => store.saveLessonVideo(admin.id, { ...input, duration: "4:75" }),
      /المدة/,
    );
    assert.throws(
      () => store.saveLessonVideo(admin.id, { ...input, position: -1 }),
      /الترتيب/,
    );
    assert.throws(
      () => store.saveLessonVideo(admin.id, { ...input, id: "missing" }),
      (e) => e.status === 404,
    );
    assert.throws(() => store.deleteLessonVideo(admin.id, { id: "missing" }), (e) => e.status === 404);
    assert.throws(() => store.publishedVideos("../x"), /درس/);
  } finally {
    store.close();
  }
});
