# Lesson Video Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Status: delivered 2026-09-19** in commits `dadb38a` and `e6ac1bc` (mobile fix `88985e6`). No videos have been added by the owner yet. See `docs/ROADMAP.md`.

**Goal:** Let an admin attach YouTube videos to a lesson (or to a general "how to use Madarek" guide) and show them to students as a carousel after the quiz, opening in a modal player that never autoplays and pauses the lesson narration.

**Architecture:** A pure `src/server/videos.mjs` parses YouTube links and durations. `src/server/store.mjs` gets a `lesson_videos` table plus admin-only save/delete/list methods (audited like every other admin change) and a public `publishedVideos(lessonId)`. The existing catch-all API route exposes them. A reusable `VideoCarousel` client component renders cards and a `ModalDialog` with a `youtube-nocookie.com` embed; the lesson page wraps it so opening a video calls the narration player's `pause()`.

**Tech Stack:** Next.js 16 (existing `src/app/api/[...action]/route.ts`), React 19, TypeScript, `node:sqlite`, `node:test`, Playwright, Radix Dialog via the existing `ModalDialog`, Radix Tabs in the admin, lucide-react, plain CSS.

**Independent of the rewards plan:** this plan touches `store.mjs` and `route.ts` in different places and uses `Date.now()`, so the two plans can be executed in either order. Videos pay **no** XP — rewards come from learning activity, not from leaving a video playing.

---

## Behaviour spec

- Admin fields per video: lesson (any curriculum lesson id or `platform` for general guides), YouTube URL, title (≤120), goal (≤240), kind (`explain` شرح إضافي · `experiment` تجربة · `review` مراجعة · `guide` دليل الاستخدام), optional duration `m:ss` / `h:mm:ss`, position 0–999, published yes/no.
- Accepted URL shapes: bare 11-char id, `youtube.com/watch?v=`, `m.youtube.com`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/`, `youtube-nocookie.com/embed/`. Anything else is rejected.
- Students see only published videos for that lesson, ordered by position then creation time. No videos → the section does not render at all.
- Card: thumbnail, kind pill, title, goal, duration. Click → modal with the player; no `autoplay`; `rel=0`; close button; closing unmounts the iframe (reopening starts over).
- Lesson flow: explanation & activities → quiz → **videos** → next lesson.
- General guides (`platform`) appear at the bottom of the student and parent dashboards.
- Every save/delete writes `videos.save` / `videos.delete` to the admin audit log.

## File map

- Create `src/server/videos.mjs` — `parseYouTubeId`, `parseDuration`, `VIDEO_KINDS`.
- Modify `src/server/store.mjs` — `lesson_videos` table; `listLessonVideos`, `saveLessonVideo`, `deleteLessonVideo`, `publishedVideos`.
- Modify `src/app/api/[...action]/route.ts` — `GET videos`, `GET admin/videos`, `POST admin/videos/save`, `POST admin/videos/delete`.
- Modify `src/components/ui/modal-dialog.tsx` — optional `className`.
- Create `src/components/video-carousel.tsx` — cards + modal player.
- Modify `src/components/lesson.tsx` — carousel after the quiz, pausing narration.
- Modify `src/components/dashboard.tsx` — platform guide carousel.
- Create `src/components/admin-videos.tsx` — admin tab.
- Modify `src/components/admin.tsx` and `src/app/admin/page.tsx` — new tab, audit labels, initial data.
- Modify `src/app/globals.css` — carousel, modal and admin styles.
- Create `tests/videos.test.mjs`, `tests/browser/videos.spec.ts`.

---

### Task 0: Baseline

- [x] **Step 1:** Run `npm ci` (skip if `node_modules` already exists in this worktree).
- [x] **Step 2:** Run `npm test`. Expected: all PASS. Stop and report if red.

---

### Task 1: Parse YouTube links and durations

**Files:**
- Create: `src/server/videos.mjs`
- Test: `tests/videos.test.mjs`

- [x] **Step 1: Write the failing tests**

`tests/videos.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { parseYouTubeId, parseDuration } from "../src/server/videos.mjs";

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
```

- [x] **Step 2: Run to verify failure**

Run: `node --test tests/videos.test.mjs`
Expected: FAIL — cannot find `src/server/videos.mjs`.

- [x] **Step 3: Implement**

`src/server/videos.mjs`:

```js
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set(["youtube.com", "youtube-nocookie.com"]);

export const VIDEO_KINDS = ["explain", "experiment", "review", "guide"];

/** The YouTube video id in a link the admin pasted, or null. */
export function parseYouTubeId(input) {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (VIDEO_ID.test(value)) return value;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^(www|m)\./, "");
  let id = null;
  if (host === "youtu.be") id = url.pathname.slice(1);
  else if (HOSTS.has(host))
    id =
      url.pathname === "/watch"
        ? url.searchParams.get("v")
        : (url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] ?? null);
  return id && VIDEO_ID.test(id) ? id : null;
}

/** Seconds from "m:ss", "h:mm:ss" or plain seconds; null when empty, NaN when invalid. */
export function parseDuration(value) {
  if (value == null || String(value).trim() === "") return null;
  const parts = String(value).trim().split(":");
  const valid =
    parts.length <= 3 &&
    /^\d{1,3}$/.test(parts[0]) &&
    parts.slice(1).every((p) => /^[0-5]\d$/.test(p));
  if (!valid) return NaN;
  const seconds = parts.reduce((total, p) => total * 60 + Number(p), 0);
  return seconds > 0 && seconds <= 6 * 3600 ? seconds : NaN;
}
```

- [x] **Step 4: Run to verify pass**

Run: `node --test tests/videos.test.mjs`
Expected: PASS (3 tests).

- [x] **Step 5: Commit**

```bash
git add src/server/videos.mjs tests/videos.test.mjs
git commit -m "Parse YouTube links and video durations for lesson videos" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Store — lesson_videos table and admin-only methods

**Files:**
- Modify: `src/server/store.mjs` (imports; schema string; new methods in `api`, e.g. after `recordAudioReview`)
- Test: `tests/videos.test.mjs` (append)

- [x] **Step 1: Append the failing tests**

Add `import { createStore } from "../src/server/store.mjs";` to the imports, then append:

```js
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
```

- [x] **Step 2: Run to verify failure**

Run: `node --test tests/videos.test.mjs`
Expected: FAIL — `store.saveLessonVideo is not a function`.

- [x] **Step 3: Implement**

In `src/server/store.mjs` add the import:

```js
import { parseYouTubeId, parseDuration, VIDEO_KINDS } from "./videos.mjs";
```

In the `db.exec(...)` schema string, just before `INSERT OR IGNORE INTO settings`, add:

```sql
    CREATE TABLE IF NOT EXISTS lesson_videos(id TEXT PRIMARY KEY,lesson_id TEXT NOT NULL,youtube_id TEXT NOT NULL,title TEXT NOT NULL,goal TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('explain','experiment','review','guide')),duration_seconds INTEGER,position INTEGER NOT NULL DEFAULT 0,published INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
```

Above `const api = {`, add the helpers:

```js
  const LESSON_KEY = /^[a-z][a-z0-9-]{1,59}$/;
  const videoRow = (r) => ({
    id: r.id,
    lessonId: r.lesson_id,
    youtubeId: r.youtube_id,
    title: r.title,
    goal: r.goal,
    kind: r.kind,
    durationSeconds: r.duration_seconds ?? null,
    position: r.position,
    published: Boolean(r.published),
    updatedAt: r.updated_at,
  });
  const videoById = (id) =>
    typeof id === "string"
      ? db.prepare("SELECT * FROM lesson_videos WHERE id=?").get(id)
      : undefined;
```

Inside `api`, after `recordAudioReview`, add:

```js
    listLessonVideos(adminId) {
      requireRole(adminId, ["admin"]);
      return {
        videos: db
          .prepare(
            "SELECT * FROM lesson_videos ORDER BY lesson_id,position,created_at",
          )
          .all()
          .map(videoRow),
      };
    },
    publishedVideos(lessonId) {
      if (typeof lessonId !== "string" || !LESSON_KEY.test(lessonId))
        fail("درس غير معروف.");
      return db
        .prepare(
          "SELECT * FROM lesson_videos WHERE lesson_id=? AND published=1 ORDER BY position,created_at",
        )
        .all(lessonId)
        .map(videoRow);
    },
    saveLessonVideo(adminId, input) {
      requireRole(adminId, ["admin"]);
      if (!input || typeof input !== "object") fail("بيانات غير صحيحة.");
      if (typeof input.lessonId !== "string" || !LESSON_KEY.test(input.lessonId))
        fail("اختاري الدرس المرتبط بالفيديو.");
      const youtubeId = parseYouTubeId(input.url);
      if (!youtubeId) fail("أدخلي رابط يوتيوب صحيحًا.");
      const title = field(input.title, 120),
        goal = field(input.goal, 240);
      if (!VIDEO_KINDS.includes(input.kind)) fail("اختاري نوع الفيديو.");
      const duration = parseDuration(input.duration);
      if (Number.isNaN(duration)) fail("اكتبي المدة بصيغة دقائق:ثوانٍ مثل 4:05.");
      const position = Number(input.position ?? 0);
      if (!Number.isInteger(position) || position < 0 || position > 999)
        fail("الترتيب رقم من 0 إلى 999.");
      const published = input.published === true ? 1 : 0;
      const stamp = Date.now();
      let id = input.id;
      if (id != null) {
        if (!videoById(id)) fail("الفيديو غير موجود.", 404);
        db.prepare(
          "UPDATE lesson_videos SET lesson_id=?,youtube_id=?,title=?,goal=?,kind=?,duration_seconds=?,position=?,published=?,updated_at=? WHERE id=?",
        ).run(
          input.lessonId,
          youtubeId,
          title,
          goal,
          input.kind,
          duration,
          position,
          published,
          stamp,
          id,
        );
      } else {
        id = randomUUID();
        db.prepare(
          "INSERT INTO lesson_videos(id,lesson_id,youtube_id,title,goal,kind,duration_seconds,position,published,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        ).run(
          id,
          input.lessonId,
          youtubeId,
          title,
          goal,
          input.kind,
          duration,
          position,
          published,
          stamp,
          stamp,
        );
      }
      writeAudit(adminId, "videos.save", null, {
        id,
        lessonId: input.lessonId,
        published: Boolean(published),
      });
      return videoRow(videoById(id));
    },
    deleteLessonVideo(adminId, input) {
      requireRole(adminId, ["admin"]);
      const id = input && typeof input === "object" ? input.id : null;
      if (!videoById(id)) fail("الفيديو غير موجود.", 404);
      db.prepare("DELETE FROM lesson_videos WHERE id=?").run(id);
      writeAudit(adminId, "videos.delete", null, { id });
      return { ok: true };
    },
```

- [x] **Step 4: Run all unit tests**

Run: `npm test`
Expected: all PASS (videos suite: 5 tests).

- [x] **Step 5: Commit**

```bash
git add src/server/store.mjs tests/videos.test.mjs
git commit -m "Store lesson videos with admin-only, audited save and delete" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: API endpoints

**Files:**
- Modify: `src/app/api/[...action]/route.ts`

This uses the existing catch-all route, so no new Next.js file conventions are involved. If you find yourself creating a new route file instead, read `node_modules/next/dist/docs/` first (see `AGENTS.md`).

- [x] **Step 1: GET handlers**

In `GET`, directly after the `if (action === "quiz") ...` statement, add:

```ts
    if (action === "videos")
      return response({
        videos: store.publishedVideos(
          req.nextUrl.searchParams.get("lesson") || "",
        ),
      });
```

Inside the `if (action.startsWith("admin/")) { ... }` block, after `admin/audit`, add:

```ts
      if (action === "admin/videos")
        return response(store.listLessonVideos(user.id));
```

- [x] **Step 2: POST handlers**

In `POST`, after `if (action === "admin/settings") ...`, add:

```ts
    if (action === "admin/videos/save")
      return response(store.saveLessonVideo(user.id, body));
    if (action === "admin/videos/delete")
      return response(store.deleteLessonVideo(user.id, body));
```

- [x] **Step 3: Type-check and smoke-test**

Run: `npx tsc --noEmit` → no errors.
Run `npm run build` then `npm run start`, and in a second terminal: `curl -s "http://localhost:3000/api/videos?lesson=nutrients"`
Expected: `{"videos":[]}`. And `curl -s "http://localhost:3000/api/videos?lesson=../x"` → `{"error":"درس غير معروف."}` with status 400. Stop the server.

- [x] **Step 4: Commit**

```bash
git add "src/app/api/[...action]/route.ts"
git commit -m "Expose lesson videos publicly and to admins through the API" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Video carousel component

**Files:**
- Modify: `src/components/ui/modal-dialog.tsx`
- Create: `src/components/video-carousel.tsx`
- Modify: `src/app/globals.css` (append)

- [x] **Step 1: Let `ModalDialog` take a class**

In `src/components/ui/modal-dialog.tsx`, add `className?: string;` to the props type, destructure `className`, and change the content element's class:

```tsx
              <motion.div
                className={"admin-dialog" + (className ? " " + className : "")}
```

- [x] **Step 2: Create the carousel**

`src/components/video-carousel.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { Clock, PlayCircle } from "lucide-react";
import { api } from "./providers";
import { ModalDialog } from "./ui/modal-dialog";

export type LessonVideo = {
  id: string;
  youtubeId: string;
  title: string;
  goal: string;
  kind: "explain" | "experiment" | "review" | "guide";
  durationSeconds: number | null;
};

export const videoKindLabel: Record<LessonVideo["kind"], string> = {
  explain: "شرح إضافي",
  experiment: "تجربة",
  review: "مراجعة",
  guide: "دليل الاستخدام",
};

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600),
    m = Math.floor((seconds % 3600) / 60),
    s = String(seconds % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export function VideoCarousel({
  lessonId,
  title,
  intro,
  onOpen,
}: {
  lessonId: string;
  title: string;
  intro?: string;
  onOpen?: () => void;
}) {
  const [videos, setVideos] = useState<LessonVideo[]>([]);
  const [active, setActive] = useState<LessonVideo | null>(null);
  useEffect(() => {
    api("videos?lesson=" + encodeURIComponent(lessonId))
      .then((d) => setVideos(d.videos))
      .catch(() => setVideos([]));
  }, [lessonId]);
  if (!videos.length) return null;
  const headingId = "videos-" + lessonId;
  return (
    <section className="video-shelf" aria-labelledby={headingId}>
      <h2 id={headingId}>{title}</h2>
      {intro && <p className="section-intro">{intro}</p>}
      <ul className="video-track">
        {videos.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              className="video-card"
              onClick={() => {
                onOpen?.();
                setActive(v);
              }}
            >
              <span className="video-thumb">
                <img
                  src={`https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`}
                  alt=""
                  loading="lazy"
                  width={480}
                  height={360}
                />
                <PlayCircle size={46} aria-hidden />
              </span>
              <span className="pill blue">{videoKindLabel[v.kind]}</span>
              <b>{v.title}</b>
              <span className="video-goal">{v.goal}</span>
              {v.durationSeconds ? (
                <span className="video-duration">
                  <Clock size={14} aria-hidden />{" "}
                  <bdi>{formatDuration(v.durationSeconds)}</bdi>
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      <ModalDialog
        open={active !== null}
        onOpenChange={(open) => {
          if (!open) setActive(null);
        }}
        title={active?.title ?? ""}
        description={active?.goal}
        className="video-dialog"
      >
        {active && (
          <div className="video-frame">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${active.youtubeId}?rel=0&playsinline=1`}
              title={active.title}
              allow="encrypted-media; picture-in-picture; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        )}
      </ModalDialog>
    </section>
  );
}
```

- [x] **Step 3: Append styles**

Append to `src/app/globals.css`:

```css
/* Lesson video carousel */
.video-shelf {
  margin-top: 48px;
  min-width: 0;
}
.video-track {
  list-style: none;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(240px, 300px);
  gap: 16px;
  margin: 16px 0 0;
  padding: 0 0 10px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
}
.video-track > li {
  scroll-snap-align: start;
}
.video-card {
  all: unset;
  box-sizing: border-box;
  display: grid;
  gap: 8px;
  width: 100%;
  height: 100%;
  align-content: start;
  cursor: pointer;
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 12px;
}
.video-card:hover {
  border-color: var(--violet);
}
.video-card:focus-visible {
  outline: 3px solid var(--violet);
  outline-offset: 2px;
}
.video-card .pill {
  justify-self: start;
}
.video-thumb {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 12px;
  background: var(--violet-soft);
}
.video-thumb img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.video-thumb svg {
  position: relative;
  color: var(--white);
  filter: drop-shadow(0 2px 6px #0006);
}
.video-goal,
.video-duration {
  font-size: 13px;
  color: var(--muted);
}
.video-duration {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.admin-dialog.video-dialog {
  width: min(920px, calc(100vw - 32px));
}
.video-frame {
  aspect-ratio: 16 / 9;
  width: 100%;
  margin-top: 12px;
  overflow: hidden;
  border-radius: 12px;
  background: #000;
}
.video-frame iframe {
  width: 100%;
  height: 100%;
  border: 0;
}
```

- [x] **Step 4: Type-check**

Run: `npx tsc --noEmit` → no errors.

- [x] **Step 5: Commit**

```bash
git add src/components/ui/modal-dialog.tsx src/components/video-carousel.tsx src/app/globals.css
git commit -m "Add a video carousel with a modal YouTube player that never autoplays" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Place the carousel in the lesson and on the dashboards

**Files:**
- Modify: `src/components/lesson.tsx`
- Modify: `src/components/dashboard.tsx`

- [x] **Step 1: Lesson — after the quiz, pausing narration**

In `src/components/lesson.tsx`:
- Change the audio import to `import { AudioProvider, useAudio } from "./audio/audio-provider";`
- Add `import { VideoCarousel } from "./video-carousel";`
- Add this component at the bottom of the file:

```tsx
function LessonVideos() {
  // Rendered inside <AudioProvider>, so opening a video can stop narration.
  const { pause } = useAudio();
  return (
    <VideoCarousel
      lessonId="nutrients"
      title="فيديوهات تساعدك تفهمين أكثر"
      intro="بعد الاختبار، اختاري فيديو لتثبيت ما تعلّمتِه. يتوقف الشرح الصوتي تلقائيًا عند فتح الفيديو."
      onOpen={pause}
    />
  );
}
```

- Render `<LessonVideos />` directly after the closing `</section>` of `<section id="quiz" …>` and before `<div className="lesson-navigation">`.

- [x] **Step 2: Dashboards — general guides**

In `src/components/dashboard.tsx` add `import { VideoCarousel } from "./video-carousel";` and:
- As the last child of the `user.role === "parent"` fragment: `<VideoCarousel lessonId="platform" title="دليل استخدام مدارك" />`
- As the last child of the `user.role === "student"` fragment (after `<History …/>`): `<VideoCarousel lessonId="platform" title="كيف تستخدمين مدارك؟" />`

- [x] **Step 3: Type-check**

Run: `npx tsc --noEmit` → no errors.

- [x] **Step 4: Commit**

```bash
git add src/components/lesson.tsx src/components/dashboard.tsx
git commit -m "Show lesson videos after the quiz and platform guides on the dashboards" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Admin "Videos" tab

**Files:**
- Create: `src/components/admin-videos.tsx`
- Modify: `src/components/admin.tsx` (icon import; `ACTION_LABEL` ~line 88; `AdminDashboard` props and tabs ~lines 153–240)
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/globals.css` (append)

- [x] **Step 1: Create the tab component**

`src/components/admin-videos.tsx`:

```tsx
"use client";
import { FormEvent, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "./providers";
import { units } from "@/content/curriculum";
import { formatDuration, videoKindLabel, type LessonVideo } from "./video-carousel";

export type AdminVideo = LessonVideo & {
  lessonId: string;
  position: number;
  published: boolean;
  updatedAt: number;
};
export type VideoList = { videos: AdminVideo[] };

const LESSON_OPTIONS = [
  { id: "platform", title: "دليل استخدام المنصة (عام)" },
  ...units
    .flatMap((u) => u.chapters.flatMap((c) => c.lessons))
    .map((l) => ({
      id: l.id,
      title: l.title + (l.available ? "" : " · غير متاح بعد"),
    })),
];
const lessonTitle = (id: string) =>
  LESSON_OPTIONS.find((l) => l.id === id)?.title ?? id;

export function VideosTab({ initial }: { initial: VideoList }) {
  const [videos, setVideos] = useState(initial.videos);
  const [editing, setEditing] = useState<AdminVideo | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function reload() {
    setVideos((await api("admin/videos")).videos);
  }
  function startForm(video: AdminVideo | null) {
    setEditing(video);
    setFormKey((k) => k + 1);
    setConfirmId(null);
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const form = new FormData(e.currentTarget);
    try {
      await api("admin/videos/save", {
        ...(editing ? { id: editing.id } : {}),
        lessonId: form.get("lessonId"),
        url: form.get("url"),
        title: form.get("title"),
        goal: form.get("goal"),
        kind: form.get("kind"),
        duration: form.get("duration"),
        position: Number(form.get("position") || 0),
        published: form.get("published") === "on",
      });
      setNotice(editing ? "حُفظت تعديلات الفيديو." : "أُضيف الفيديو.");
      startForm(null);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("admin/videos/delete", { id });
      setConfirmId(null);
      if (editing?.id === id) startForm(null);
      setNotice("حُذف الفيديو.");
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-videos">
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="feedback success" role="status">
          {notice}
        </p>
      )}
      <form key={formKey} className="panel video-form" onSubmit={save}>
        <h3>{editing ? "تعديل فيديو" : "إضافة فيديو"}</h3>
        <label className="field">
          <span>الدرس المرتبط</span>
          <select name="lessonId" defaultValue={editing?.lessonId ?? "nutrients"}>
            {LESSON_OPTIONS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>رابط يوتيوب</span>
          <input
            name="url"
            dir="ltr"
            required
            defaultValue={editing ? `https://youtu.be/${editing.youtubeId}` : ""}
          />
        </label>
        <label className="field">
          <span>العنوان</span>
          <input name="title" required maxLength={120} defaultValue={editing?.title} />
        </label>
        <label className="field">
          <span>الهدف من الفيديو</span>
          <input name="goal" required maxLength={240} defaultValue={editing?.goal} />
        </label>
        <label className="field">
          <span>النوع</span>
          <select name="kind" defaultValue={editing?.kind ?? "explain"}>
            {Object.entries(videoKindLabel).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>المدة (دقائق:ثوانٍ)</span>
          <input
            name="duration"
            dir="ltr"
            placeholder="4:05"
            defaultValue={
              editing?.durationSeconds ? formatDuration(editing.durationSeconds) : ""
            }
          />
        </label>
        <label className="field">
          <span>الترتيب داخل الشريط</span>
          <input
            name="position"
            type="number"
            min={0}
            max={999}
            defaultValue={editing?.position ?? 0}
          />
        </label>
        <label className="check-field">
          <input
            name="published"
            type="checkbox"
            defaultChecked={editing?.published ?? false}
          />
          <span>منشور للطلاب</span>
        </label>
        <div className="video-form-actions">
          <button className="button primary" disabled={busy}>
            {editing ? (
              "حفظ التعديلات"
            ) : (
              <>
                <Plus size={18} /> إضافة الفيديو
              </>
            )}
          </button>
          {editing && (
            <button
              type="button"
              className="button outline"
              onClick={() => startForm(null)}
            >
              إلغاء التعديل
            </button>
          )}
        </div>
      </form>
      <section className="panel">
        <h3>الفيديوهات ({videos.length.toLocaleString("ar-KW")})</h3>
        {!videos.length ? (
          <p className="muted-text">لا توجد فيديوهات بعد.</p>
        ) : (
          <ul className="video-admin-list">
            {videos.map((v) => (
              <li key={v.id}>
                <div>
                  <b>{v.title}</b>
                  <small>
                    {lessonTitle(v.lessonId)} · {videoKindLabel[v.kind]} · الترتيب{" "}
                    {v.position.toLocaleString("ar-KW")}
                  </small>
                </div>
                <span className={"pill " + (v.published ? "green" : "yellow")}>
                  {v.published ? "منشور" : "مسودة"}
                </span>
                <button
                  type="button"
                  className="button outline small"
                  onClick={() => startForm(v)}
                >
                  <Pencil size={16} /> تعديل
                </button>
                <button
                  type="button"
                  className="button outline small"
                  disabled={busy}
                  onClick={() => remove(v.id)}
                >
                  <Trash2 size={16} />{" "}
                  {confirmId === v.id ? "تأكيد الحذف" : "حذف"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

- [x] **Step 2: Wire the tab into the admin dashboard**

In `src/components/admin.tsx`:
- Add `Clapperboard` to the lucide import list.
- Add `import { VideosTab, type VideoList } from "./admin-videos";`
- Add to `ACTION_LABEL`: `"videos.save": "حفظ فيديو",` and `"videos.delete": "حذف فيديو",`
- Add `initialVideos` to `AdminDashboard`'s destructured props and to its props type (`initialVideos: VideoList;`).
- Add a trigger after the `content` trigger:

```tsx
          <Tabs.Trigger value="videos">
            {tab === "videos" ? (
              <motion.span
                className="admin-tab-ink"
                layoutId={reduceMotion ? undefined : "admin-tab-ink"}
              />
            ) : null}
            <Clapperboard size={18} /> الفيديوهات
          </Tabs.Trigger>
```

- Add the panel after the `content` panel:

```tsx
        <Tabs.Content value="videos">
          <h2 className="sr-only">الفيديوهات</h2>
          <VideosTab initial={initialVideos} />
        </Tabs.Content>
```

In `src/app/admin/page.tsx`, load and pass the data:

```tsx
  const videos = store.listLessonVideos(user.id);
```

and add `initialVideos={videos as Props["initialVideos"]}` to `<AdminDashboard …/>`.

- [x] **Step 3: Append admin styles**

Append to `src/app/globals.css`:

```css
/* Admin — videos tab */
.video-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.video-form > h3,
.video-form-actions {
  grid-column: 1 / -1;
}
.video-form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.check-field {
  display: flex;
  align-items: center;
  gap: 8px;
}
.video-admin-list {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: grid;
}
.video-admin-list li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}
.video-admin-list li > div {
  display: grid;
  gap: 2px;
  flex: 1 1 220px;
}
.video-admin-list small {
  color: var(--muted);
}
@media (max-width: 640px) {
  .video-form {
    grid-template-columns: 1fr;
  }
}
```

- [x] **Step 4: Type-check**

Run: `npx tsc --noEmit` → no errors.

- [x] **Step 5: Commit**

```bash
git add src/components/admin-videos.tsx src/components/admin.tsx src/app/admin/page.tsx src/app/globals.css
git commit -m "Add an admin tab to add, edit, order, publish and delete lesson videos" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Browser test and full verification

**Files:**
- Create: `tests/browser/videos.spec.ts`

- [x] **Step 1: Write the end-to-end test**

`tests/browser/videos.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { createStore } from "../../src/server/store.mjs";

const password = "valid-password-123";

async function signInAdmin(page: import("@playwright/test").Page) {
  const email = `video-admin-${Date.now()}@example.test`;
  const register = await page.request.post("/api/register", {
    data: { name: "مديرة الفيديو", email, password, children: [] },
  });
  expect(register.ok()).toBeTruthy();
  const store = createStore(resolve(".data/browser-qa.sqlite"));
  try {
    store.promoteAdmin(email);
  } finally {
    store.close();
  }
  const login = await page.request.post("/api/login", {
    data: { email, password },
  });
  expect(login.ok()).toBeTruthy();
}

test("an admin adds a lesson video and it opens after the quiz without autoplay", async ({
  page,
}) => {
  await signInAdmin(page);
  const title = `فيديو اختبار ${Date.now()}`;
  const save = await page.request.post("/api/admin/videos/save", {
    data: {
      lessonId: "nutrients",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title,
      goal: "نراجع المغذّيات بمثال من المطبخ.",
      kind: "review",
      duration: "3:20",
      position: 0,
      published: true,
    },
  });
  expect(save.ok()).toBeTruthy();
  const video = await save.json();
  try {
    await page.goto("/grade/8/science/nutrients");
    const card = page.getByRole("button", { name: new RegExp(title) });
    await card.scrollIntoViewIfNeeded();
    await card.click();
    const dialog = page.getByRole("dialog", { name: title });
    await expect(dialog).toBeVisible();
    const frame = dialog.locator("iframe");
    await expect(frame).toHaveAttribute(
      "src",
      /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/,
    );
    await expect(frame).not.toHaveAttribute("src", /autoplay=1/);
    await dialog.getByRole("button", { name: "إغلاق" }).click();
    await expect(dialog).toBeHidden();

    await page.goto("/admin");
    await page.getByRole("tab", { name: /الفيديوهات/ }).click();
    await expect(page.getByText(title)).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await page.request.post("/api/admin/videos/delete", {
      data: { id: video.id },
    });
  }
});
```

- [x] **Step 2: Build and run the browser suites**

Run: `npm run build`
Expected: succeeds.
Run: `npx playwright test tests/browser/videos.spec.ts tests/browser/admin.spec.ts tests/browser/learning.spec.ts tests/browser/accessibility.spec.ts`
Expected: PASS. Fix any axe finding in the markup rather than excluding rules.

- [x] **Step 3: Check the phone layout by eye**

Run `npm run start`, add one published video from the admin tab, open the lesson at 360 px wide. The carousel scrolls sideways inside its own strip, the page itself does not scroll horizontally, and the modal player fits the screen.

- [x] **Step 4: Commit**

```bash
git add tests/browser/videos.spec.ts
git commit -m "Add browser test for adding and playing a lesson video" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Deliberately not in this plan

- An optional comprehension question after a video (and its reward) — follow-up once the rewards plan has landed.
- Fetching titles, durations or thumbnails from the YouTube API — the admin types them; no API key needed.
- Self-hosted video files — YouTube only for now.
- Blocking YouTube's own end-screen suggestions — `rel=0` limits them to the same channel; prefer videos from Madarek's own channel.
