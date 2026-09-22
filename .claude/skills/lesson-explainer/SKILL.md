---
name: lesson-explainer
description: Build a complete animated lesson for this Arabic RTL curriculum site — content file, page, Motion+SVG explainer, ordering/classification drills, question bank, generated images, browser test and verification. Use when the user asks to build, add or finish a lesson (e.g. "ابني درس النظام الغذائي المتوازن", "add the water cycle lesson", "اعمل الدرس التالي"), or points at textbook pages / reference images and asks for a lesson from them. Do not use for small edits to an existing lesson, for pure styling changes, or for anything outside src/app/grade/**.
---

# Build an animated lesson

The goal is a lesson a 13-year-old can finish alone on a phone: she reads, watches one thing move, tries it herself, gets told why, then is tested. Motion is never the carrier of meaning — text always is.

## 0. Before writing anything

1. Read `AGENTS.md`. This Next.js differs from training data; read the relevant guide in `node_modules/next/dist/docs/` before using an API you have not used in this repo.
2. Read `design-system/hana-learning/pages/platform.md`. It overrides everything else about colour, type, layout and motion.
3. Read the nutrients lesson as the reference implementation:
   - `src/app/grade/8/science/nutrients/page.tsx` — the page shell and the publication gate
   - `src/components/lesson.tsx` — section order: نفهم / نجرّب / نتدرّب / نختبر
   - `src/components/lesson-diagrams.tsx` — animated SVG journey + relationship map
   - `src/components/lesson-drills.tsx` — ordering and classification with visual correction
   - `src/content/nutrients.ts` — content shape
4. Confirm the source: which textbook pages under `GRADE-8/...`, plus any reference images the user placed in `docs/lessons/<lesson-id>/refs/`. **Never invent curriculum facts.** If the textbook does not support a claim, leave it out and say so.

## 1. Content first, components second

Put every string in `src/content/<lesson-id>.ts`. Components read it; they never hold lesson text. One source per fact: if the lab and a drill show the same steps, both import the same array (see `journeys` in `src/content/nutrients.ts`).

Question banks and grading stay server-side in `src/server/questions.mjs`. Answers must never reach the client before submission.

## 2. The four sections

| Section | What goes in it |
| --- | --- |
| `map` — نفهم | The concept structure: tree, groups, definitions |
| `explore` — نجرّب | The animated explainer + one or two exploration widgets |
| `practice` — نتدرّب | Ordering and classification drills with per-answer correction, then a written prompt |
| `quiz` — نختبر فهمنا | `<Quiz />`, graded on the server |

Each of the first three ends with the section-complete button (`completeButton` in `lesson.tsx`).

## 3. The animated explainer

- Author it as inline SVG driven by Framer Motion. No new animation library. Motion 13 already has `animate()` sequences, `useAnimate`, `scroll()` and `useScroll` — check those before proposing GSAP.
- Keyframe motion along a path from the **same control points that draw the path** (see `pointsOn` in `lesson-diagrams.tsx`). Do not rely on `offset-path`.
- RTL: the flow starts on the right and moves left.
- Colours come from the CSS variables in `src/app/globals.css`. Set SVG colour through `fill=` / `stroke=` attributes or a class — **not** through framer-motion's `style` prop, which does not reliably update when the value changes.
- `aria-hidden="true"` on the art; the captions and the caption paragraph carry the meaning.
- `useReducedMotion()`: with motion reduced, the scene renders in a readable resting state, never blank and never mid-transition.
- The animation advances only when the student presses a control. Nothing auto-plays.

## 4. The drills

- Tap-then-place, never HTML5 drag-and-drop: it must work with a finger, a mouse and a keyboard.
- Correction is immediate and has three channels: colour, icon and **a sentence saying why**. Never colour alone.
- A wrong answer never destroys the student's work — the card returns, it does not vanish.
- Reordering animates with the `layout` prop; moving is done with explicit up/down buttons that have real `aria-label`s.

## 5. Images

1. Add a slot per image to `src/content/image-slots.ts` with `ready: false`, the exact pixel box, Arabic `alt`, and a full English prompt reusing the shared direction constants.
2. Generate with the `atlascloud` MCP:
   - model `openai/gpt-image-2-developer/text-to-image`
   - `quality: "low"`, `output_format: "png"`
   - `size` from the slot's aspect: `1024x1024` square, `1536x1024` landscape, `1024x1536` portrait
   - Call `atlas_generate_image`, then poll `atlas_get_prediction`.
3. Content imagery is photorealistic — real textures, real food, no illustration, no 3D render, no text or labels in the image. Interface icons stay as lucide line icons; do not render them as photographs.
4. Save into `public/images/...`, flip the slot to `ready: true`, and record model, quality and the final prompt in `docs/GENERATED-IMAGES.md`. Never claim a model or a reference image that was not actually used.

## 6. Narration — read this before adding a target

`src/content/audio-targets.ts` is the registry that drives narration highlighting. **Every target added there needs a recorded clip, and the ElevenLabs quota is exhausted.** So: build the lesson with no new audio targets unless the user explicitly asks for narration and confirms the quota. New interactive widgets simply carry no `data-audio-target`.

If narration is in scope, add the target, then the segment under `src/server/narration/`, then run `npm run audio -- plan` before generating.

## 7. Wire it up

- Page at `src/app/grade/<grade>/<subject>/<lesson>/page.tsx`, gated by `store.isPublished()`, with `publicPageMetadata(...)`.
- Register the lesson in `src/content/catalog.ts` (`registeredLessons`) so the catalogue, availability and sitemap pick it up.
- Breadcrumbs, previous/next links and the source caption follow the nutrients page exactly.

## 8. Accessibility and layout rules that are not negotiable

- Arabic RTL, 16px minimum body text, 44px minimum touch targets, visible focus ring.
- No horizontal scroll at 360px.
- Two controls must not share an accessible name across the page. When a label repeats, extend it: `` aria-label={`${name} — اعرضي الأطعمة التي تحتويه`} ``, keeping the visible text at the start.
- Success and error states always carry text and an icon, never colour alone.

## 9. Gates — all of them, before reporting done

```bash
npx prettier --write <changed files>
npx tsc --noEmit
npm run build
npm test
npx playwright test tests/browser/<lesson>.spec.ts tests/browser/learning.spec.ts tests/browser/accessibility.spec.ts
```

Write the browser spec yourself: it covers the explainer advancing, each drill correcting a wrong answer without losing state, and 360px layout with 44px controls.

Then look at the result: start the built app on a spare port and screenshot the new sections at 1280px and 360px, plus once with `reducedMotion: "reduce"`. Read the screenshots. Colour bugs and covered elements do not show up in a passing test.

Report honestly: if a gate failed, say so with the output. If a test failure comes from someone else's uncommitted work in the tree, say that too and name the files.

## 10. Finally

Add the lesson to `docs/ROADMAP.md` with what is done and what is still open, and leave the commit to the user unless they asked for one.
