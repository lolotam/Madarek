# Madarek Stages, Curriculum Visuals and Audio Dock Implementation Plan

> **For agentic workers:** Execute the checkbox tasks sequentially through the user-selected `cursor-delegate` skill and live model ID `cursor-grok-4.6-high-fast`. The user's explicit execution choice overrides generic worker-selection prompts. Cursor must leave edits uncommitted for the orchestrator's review.

**Status: delivered 2026-09-19.** Task A stage catalog (`2e57735`), Task B audio dock and transport (`bb69721`), Task C curriculum visuals (`0c61f95`; images connected in `17e3e00`). See `docs/ROADMAP.md`.

**Goal:** Implement the approved stage-first navigation, reference-based science artwork, and persistent audio controls described in the companion specification.

**Architecture:** A shared typed catalog provides stage/grade/subject definitions and derives availability from registered, published lessons. Server pages read publication state and pass serializable catalog data to presentation components. One existing AudioProvider owns playback; a floating dock is another view of that state, with explicit segment navigation and paused-state preservation.

**Tech Stack:** Next.js 16.3.5 App Router, React 19.3, TypeScript, Framer Motion 13.4, existing CSS tokens, next/image, Node 24 SQLite, Playwright/Chrome, node:test.

**Spec:** `docs/superpowers/specs/2026-09-19-stages-catalog-audio.md` (S1–S5 are acceptance authority).

## Baseline and prerequisites

- Read AGENTS.md and the relevant installed docs under node_modules/next/dist/docs before changing routes, metadata, images or client/server boundaries. Dynamic route params use this installed version's documented API.
- Read ui-styling and ui-ux-pro-max from C:/Users/waleed Mohamd/.agents/skills. Keep the established palette, local Arabic font, authentication and quiz behavior.
- Baseline tracked tree is clean at dispatch preparation; three existing untracked screenshots in docs belong to earlier work. Preserve them.
- The current homepage exists but only has grades 2/5/8 and links grade 8 directly to science. It needs expansion, not replacement with an unrelated template.
- `store.isPublished()` currently controls nutrients publication. `units` contains 19 lessons; only nutrients has `available: true`.
- `previous()` currently restarts the current segment after 1.5 seconds; this explicitly conflicts with the approved previous-step behavior.
- Current screenshot or fixture playback is not evidence of real approved narration availability. Verify actual manifests separately; do not generate or approve audio.

## Task A — Stage-first catalog and navigation

**Files:** create `src/content/catalog.ts`, `src/components/grade-cards.tsx`, `src/components/stage-page.tsx`, `src/components/grade-subjects.tsx`, `src/app/stage/[stage]/page.tsx`, `src/app/grade/[grade]/page.tsx`, `tests/browser/catalog-navigation.spec.ts`. Modify `src/components/home.tsx`, `src/app/page.tsx`, `src/components/shell.tsx`, `src/components/curriculum.tsx`, `src/components/lesson.tsx` breadcrumbs, `src/app/sitemap.ts`, `src/app/globals.css`. Avoid refactoring lesson content.

- [x] A1. Inspect the local grade-8 subject books, read the ECONMIC cover, and record evidence in `docs/CATALOG-SOURCES.md`. Check an official Kuwait Ministry source for completeness before calling the subject list complete. If unavailable, document the unverified list and do not invent confirmed subjects.
- [x] A2. Add one typed catalog. Define stages using stable IDs `primary`, `intermediate`, `secondary`; labels and grade ranges from the spec. Each subject has `{ id, title, image, imageAlt }`. Each registered lesson has `{ grade, subjectId, lessonId, href, published }`. Use this shared availability rule everywhere:

```ts
export type RegisteredLesson = {
  grade: number; subjectId: string; lessonId: string;
  href: string; published: boolean;
};
export function subjectAvailable(
  lessons: readonly RegisteredLesson[], grade: number, subjectId: string,
) {
  return lessons.some(l => l.grade === grade && l.subjectId === subjectId && l.published);
}
export function gradeAvailable(lessons: readonly RegisteredLesson[], grade: number) {
  return lessons.some(l => l.grade === grade && l.published);
}
```

The initial registered lesson is nutrients and receives publication from the server. Never import the database into a client component. A future publisher must register a real implemented route, not just a title or file upload.

- [x] A3. Build grade cards shared by homepage and stage pages. Add `data-grade` and `data-stage` for stable semantic browser assertions. Choose href by context: home active card `/stage/intermediate#grade-8`; stage active card `/grade/8`. Unavailable cards are articles with visible status. Stage headings are independent links. Keep all 12 cards visible without requiring carousel interaction.
- [x] A4. Implement stage and grade routes with validated params, `notFound()` for unsupported routes, server-derived publication state and canonical metadata. Grade 8 shows subjects; stage pages show their respective grade cards and breadcrumbs. Keep old science and nutrients routes unchanged. Update sitemap with all three stages and available grade pages.
- [x] A5. Replace only the homepage grade area, update primary CTA, and update breadcrumbs on science/lesson. Keep existing search normalization and learning activities. Add responsive CSS, accessible focus and reduced motion.
- [x] A6. Add and run navigation tests, including this core route contract:

```ts
test('stage-first grade eight journey', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#grades [data-grade]')).toHaveCount(12);
  await page.locator('#grades [data-grade="8"]').click();
  await expect(page).toHaveURL(/\/stage\/intermediate#grade-8$/);
  await page.locator('[data-grade="8"]').click();
  await expect(page).toHaveURL(/\/grade\/8$/);
  await page.getByRole('link', { name: /العلوم/ }).click();
  await expect(page).toHaveURL(/\/grade\/8\/science$/);
  await page.locator('a.lesson-card').click();
  await expect(page).toHaveURL(/\/grade\/8\/science\/nutrients$/);
});
```

Also assert 5/4/3 stage grouping, disabled cards lack anchors, direct unsupported route returns 404, and catalog availability changes together for a published/unpublished fixture. Do not change real user publication settings to run tests.

## Task B — Audio transport and floating dock

**Files:** modify `src/components/audio/audio-provider.tsx`, `src/components/audio/player-bar.tsx`, `src/components/lesson.tsx`, `src/app/globals.css`; create `src/components/audio/floating-audio-dock.tsx`, `tests/browser/audio-dock.spec.ts`. Reuse existing fixture setup from audio-e2e/audio-player specs; do not edit real audio files or APIs unless a demonstrated bug requires it.

- [x] B1. Extend AudioApi with `replaySegment`, `segmentIndex`, `segmentCount`, `canPrevious`, `canNext`. Index is zero-based internally, display index + 1; count 0 when no queue. Keep the active queue and state in the provider, not the dock.
- [x] B2. Unify manual navigation using an internal operation with an explicit desired transport state. Preserve the user's paused state before source replacement; invalidate old play promises/event tokens; pause the old element, set source/index/time, synchronise cues, then call play only when the captured intent is playing. Never briefly autoplay then pause as a substitute for paused loading.

```ts
// Operation contract (adapt callback names to existing provider):
type TransportIntent = 'playing' | 'paused';
// moveTo(index, intent) is the sole source-changing manual operation.
// previous: moveTo(currentIndex - 1, currentIntent), only if index > 0.
// next: moveTo(currentIndex + 1, currentIntent), only below count - 1.
// replaySegment: moveTo(currentIndex, currentIntent).
// restarting the WHOLE queue remains the existing restart() operation.
```

Use `statusRef` for current intent to avoid stale closures. If pause arrives while media is loading, invalidate pending autoplay and keep paused intent. Update first cue/target at time 0 as soon as the new segment is selected. Preserve auto-advance repeat logic and protected-results authorization.

- [x] B3. Create a fixed-right desktop dock and compact bottom-right mobile dock inside the same provider as PlayerBar. Include named Arabic controls, progress index, minimize/expand, busy/empty/error states. Use `aria-label="التحكم الصوتي العائم"` region; scope browser selectors to that region because main-player button labels may match. Keep 44px touch targets, reserve layout space, and avoid hiding quiz submit/navigation.
- [x] B4. Make main-player Previous/Next use the same provider capabilities; distinguish replay-current from restart-all. Do not change current speed/repeat selection when using either player. Hide dead controls when no clips are ready.
- [x] B5. Add deterministic three-segment fixtures or mocked manifests using the existing real MP3 fixture. Give segments distinct IDs/URLs and targets; assert both selected index/source and actual `audio.paused`, not just button labels. Required sequence: play segment 2 → seek beyond 1.5s → pause → previous → assert segment 1/time 0/paused → resume → assert playing → replay current → assert same segment/time reset. Also test rapid previous/next/pause during loading, first/last bounds, part queue, repeat, highlight update, error, not_ready, and protected-answer exclusion.
- [x] B6. Scroll to quiz at 390px and 1440px; assert dock is in viewport, controls work, only one audio engine exists, and quiz actions can be clicked without forced clicks. Run the existing audio suite and lesson feedback regressions.

## Task C — Textbook-derived artwork and integration

**Files:** create `public/images/curriculum/` assets and `src/content/curriculum-visuals.ts`; modify `src/components/curriculum.tsx`, `src/components/grade-subjects.tsx`, `src/app/globals.css`, `docs/GENERATED-IMAGES.md`. Tests in catalog-navigation or a focused curriculum-visuals spec.

- [x] C1. Read `docs/SCIENCE-SOURCE-MAP.md`; locate and visually inspect source JPGs under `GRADE-8/FIRST-TERM/SCIENCE/علوم/`. Printed page 24 is nutrients; 29 balanced diet; 38 structure; 43 accessories; 48 digestion. Filename/page offsets must be visually verified rather than assumed.
- [x] C2. Generate and save six local assets: `nutrients.png`, `balanced-diet.png`, `digestive-structure.png`, `digestive-accessories.png`, `digestion.png`, `life-header.png`. Use the built-in image-generation tool with local reference paths if available to this runner. The parent orchestrator owns image generation if Cursor lacks that capability; report the exact missing assets and continue independent code work. Never substitute icons and call Task C complete.

Shared prompt direction: "Use the attached Kuwaiti grade-8 science textbook page as the factual visual reference. Create a realistic educational still-life or clean three-dimensional classroom anatomical model, age-appropriate, anatomically consistent with the reference, ivory studio background with restrained azure/violet/amber accents. No text, no labels, no watermark, no disturbing tissue detail. One clear central concept, legible at card scale."

Per-asset additions: nutrients = foods representing the textbook's major nutrient groups; balanced diet = varied balanced meal matching the book's food grouping; structure = full digestive tract classroom model; accessories = salivary glands, liver, gallbladder and pancreas in correct context; digestion = food journey through simplified anatomically ordered organs. For header: landscape 4:1 composition, all rich imagery on LEFT 55%, RIGHT 45% quiet light negative space for live Arabic heading.

Reference verification by the orchestrator on 2026-09-19: visually opened `علوم-24.jpg`, `علوم-29.jpg`, `علوم-38.jpg`, `علوم-43.jpg`, and `علوم-48.jpg` under `GRADE-8/FIRST-TERM/SCIENCE/علوم/`; their printed numbers and lesson headings match 24/29/38/43/48. Page43 includes salivary glands as well as the abdominal accessory organs. These are confirmed starting references, not generated deliverables. The header can combine 29/38/43 as references.

- [x] C3. Review outputs against references, reject incorrect anatomy, record actual tool/model when exposed and each source path/prompt. Create subject-card images appropriate to verified subjects, reusing existing relevant generated imagery only when transparently recorded. Every subject must have meaningful imagery; a temporary icon is explicitly interim.
- [x] C4. Add a visual lookup keyed by lesson ID. Render via next/image with reserved aspect ratio and appropriate sizes; other lesson IDs get topic-specific Lucide icons. HTML titles remain outside images. Add subtle hover/focus animation and reduced-motion CSS. The life unit header keeps its ID/navigation anchor and correct heading hierarchy.
- [x] C5. Check five unique lesson assets and header load (naturalWidth > 0), reference log exists, titles readable on mobile, no layout shift or horizontal scroll. Manually inspect desktop/mobile screenshots; document actual results, not just generated-file existence.

## Task D — Independent review and acceptance

- [x] D1. Cursor runs scoped gates for each lane, fixes failures, and reports exact commands/counts. Build before Playwright because the configured webServer runs `next start`.

```powershell
npm.cmd test
npm.cmd run build
npx.cmd playwright test tests/browser/catalog-navigation.spec.ts tests/browser/audio-dock.spec.ts tests/browser/audio-player.spec.ts tests/browser/audio-e2e.spec.ts tests/browser/audio-targets.spec.ts tests/browser/narration-targets.spec.ts tests/browser/deployed-improvements.spec.ts tests/browser/learning.spec.ts tests/browser/lesson-feedback.spec.ts tests/browser/accessibility.spec.ts
```

- [x] D2. Orchestrator independently reads diffs and reruns affected gates. Tests use the dedicated `.data/browser-qa.sqlite` and `.data/audio-e2e`, never the production DB/audio library. Do not kill unrelated port-3000 processes; use configured port 3001 or E2E_PORT.
- [x] D3. Verify all S5 acceptance items, especially stage-first routing, publication consistency and paused backward navigation. Mark unavailable generation capability as a real incomplete dependency. No fabricated tests, screenshots, subject evidence or generated assets.
- [x] D4. Save implementation report with executed/static/unverified distinctions, asset provenance and actual model used. Only orchestrator may commit reviewed changes. Do not push or deploy as part of the delegated runs.

## Dependency order and handoff

A establishes the catalog and pages. B is functionally independent but is run sequentially to avoid shared lesson/CSS writes. C integrates visuals after A, and may wait for the orchestrator's image tool. D covers the combined result. No simultaneous writers to shared files. Each brief references this plan and the spec; no user interview is required for decisions already confirmed above.
