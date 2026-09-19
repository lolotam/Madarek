# Grade 8 Science First Slice Implementation Plan

> Agentic execution: implement inline in the current task, with verified checkpoints. User authorized starting with grade 8, first-term science; do not import other grades now.

**Goal:** Deliver a runnable local Arabic learning platform with durable family accounts, the verified 19-lesson science index and an interactive nutrients lesson.

**Architecture:** Next.js App Router renders the public pages and role-specific dashboards. A server-only SQLite repository stores accounts, hashed sessions, child profiles, progress and immutable assessment results. Source-backed curriculum data is separate from client-rendered activities; assessment answers remain on the server until submission.

**Tech Stack:** React, TypeScript, Next.js, CSS, Framer Motion, Lucide icons, packaged Arabic fonts, Node 24 SQLite and node:test. SQLite is the local development persistence choice, not a claim of production deployment.

## File map

- `src/content/curriculum.ts`: four units, nine chapters and 19 lessons from the supplied book.
- `src/content/nutrients.ts`: explanatory content and interactive food examples.
- `src/server/questions.mjs`: deterministic quiz and grading, never imported by client components.
- `src/server/store.mjs`: database schema, authentication and access-controlled data operations.
- `src/app/api/[...action]/route.ts`: API boundary, cookie sessions, origin checks and validated requests.
- `src/components/`: shell, illustrations, lesson activities, quiz and account/dashboard interfaces.
- `src/app/`: home, science index, lesson, login and dashboards.
- `tests/core.test.mjs`: actual repository and grading tests using an in-memory database.
- `tests/browser/learning.spec.ts`: HTTP checks against a running local app with isolated test records.
- `README.md`: running instructions, account provisioning and explicit remaining integrations.

## Execution checkpoints

- [x] Create package and TypeScript configuration; install pinned versions with a lockfile.
- [x] Write failing tests for Arabic answer normalization, grading and account isolation; run `npm test` and observe failures before implementing.
- [x] Implement the tested repository with salted password hashes, hashed session tokens, role checks and ownership checks. Run `npm test` until green.
- [x] Add API endpoints with JSON limits, origin checks and server-side assessment grading. Verify that public registration never creates administrators.
- [x] Implement RTL shell, home and verified science index. Future lessons remain unavailable.
- [x] Implement concept tree, food explorer, energy and protein animation, classification practice, explanation practice and ten-question assessment.
- [x] Implement parent registration, child creation/login, progress saving and history dashboards. Confirm isolation between two families through tests.
- [x] Provide a restricted administrative overview and publication control for the first lesson; document that generic PDF-to-AI authoring and email delivery require a subsequent integration increment.
- [x] Run production build and browser checks at mobile and desktop widths; exercise quiz results and page navigation.
- [x] Record the implemented scope and integration limits in README and PRD, then open the local app for review.

## Concrete behavioral cases

```js
assert.equal(normalize('  الْمَاءُ  '), 'الماء');
assert.equal(grade({ q1: 'macro', q7: 'الجلوكوز' }).correct, 2);
assert.throws(() => store.getChild(otherParent.id, child.id));
assert.equal(store.publicUser(store.loginChild('hana', '12345678')).role, 'student');
```

## Verification commands

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run dev -- --hostname 127.0.0.1
```

Expected: meaningful grading/ownership tests pass, production build succeeds, public pages and authenticated journeys work on the loopback URL. AI-generated feedback must never be simulated as live; display the model answer when the service is unconfigured.

## References

- Local content: `docs/SCIENCE-SOURCE-MAP.md`.
- Framework setup: https://nextjs.org/docs/app/getting-started/installation
- Local database API: https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html
- Accessible motion: https://motion.dev/docs/react-motion-config
