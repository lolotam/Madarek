# مدارك — Roadmap and status

One page for every phase. `[x]` = delivered, verified by tests and live on https://madarek.walidmohamed.com unless noted. `[ ]` = not started.
Last updated 2026-09-20 at commit `17e3e00`. Detailed plans live in `docs/superpowers/plans/`, delegation records in `docs/delegation/`.

---

## Phase 0 — First slice (done)

Plan: `docs/superpowers/plans/2026-09-19-science-first-slice.md`

- [x] Family accounts: one-step signup, parent + child profiles, PIN login, sessions
- [x] Grade 8 science index (19 lessons) and the Nutrients lesson with interactive activities
- [x] Server-side quiz grading (10 questions) and saved attempts
- [x] Parent dashboard with progress and attempt history
- [x] Admin dashboard: users, publish control, audit log, encrypted service settings
- [x] Deployment on Dokploy + Cloudflare, nightly local database backup

## Phase 1a — Stage-first catalog (done · task A)

Plan: `docs/superpowers/plans/2026-09-19-stages-catalog-audio.md` · commit `2e57735`

- [x] Home grouped into primary / intermediate / secondary, all 12 grade cards
- [x] Three stage pages, grade 8 subject page (8 subjects), breadcrumbs
- [x] Availability derived from publication; upcoming cards read «في رحلتنا القادمة» and are not links
- [x] Canonical metadata and sitemap updates
- [ ] Confirm the full official grade 8 subject list for 2026–27 (8 subjects evidenced locally; a complete Ministry list was never verified)

## Phase 1b — Audio narration player (done · task B)

Commit `bb69721`

- [x] One audio engine and provider, shared top player
- [x] Floating dock: side rail on desktop, small pill on phones that expands on playback
- [x] Previous / next / replay keep the paused state until «إكمال»
- [x] Stale playback requests can no longer pause a newer segment
- [x] 35 lesson narration clips generated and approved, live
- [ ] Results clips: 8 pending + 34 missing (ElevenLabs monthly quota ran out — rerun `scripts/audio.mjs generate` next month or after upgrade)
- [ ] Listen through the narration on the live site with a real student device

## Phase 1c — Curriculum visuals (done · task C)

Commit `0c61f95`, images in `17e3e00`

- [x] Image slot registry and placeholder renderer (`src/content/image-slots.ts`, `ui/image-slot.tsx`)
- [x] Lesson cards, subject cards and the life-science header reserve stable image boxes
- [x] Accessibility checks extended to the stage routes and `/grade/8`
- [x] 14 curriculum and subject images generated and connected
- [ ] Teacher review of the three digestive-system images against the textbook

## Phase 1d — Lesson videos (done)

Plan: `docs/superpowers/plans/2026-09-19-lesson-video-carousel.md` · commits `dadb38a`, `e6ac1bc`

- [x] Admin tab to add, edit, order, publish and delete videos, with audit entries
- [x] Video carousel after the quiz; modal player, no autoplay, pauses narration
- [x] Platform guide carousel on the student and parent dashboards
- [ ] **Add real videos** — the feature is live but no video has been added yet (`/admin` → الفيديوهات)
- [ ] Optional comprehension question after a video (deferred by design)

## Phase 1e — Rewards (done)

Plan: `docs/superpowers/plans/2026-09-19-rewards-foundation.md` · commits `a9ce268`, `5fbfd06`, `efecfa0`, `88985e6`

- [x] Study day on Kuwait time; only learning counts, not logging in
- [x] Streak with rising daily coins, milestones at 7 and 30 days, freeze days
- [x] XP, levels and gendered titles; XP never drops
- [x] Quiz pays improvement only; serious-attempt bonus once per lesson per day
- [x] Per-concept mastery; append-only reward ledger, every reward paid once
- [x] Student dashboard: title, XP bar, daily task, mastery, reward history
- [x] Parent view: study days out of 14, level, concept mastery
- [ ] Tune the numbers in `src/server/rewards.mjs` after real usage
- [ ] Decide whether to backfill XP for attempts made before rewards existed (today they start at 0)

## Phase 2 — Shop and avatars (done)

Plan: `docs/superpowers/plans/2026-09-19-shop-and-avatars.md` · commits `f7352b4`, `7b6e6ec`, images in `17e3e00`

- [x] Catalogue with prices, purchases table, coin balance = earned − spent
- [x] Earned items: nutrition apron (mastery), lab goggles (level 3), streak frame (7 days)
- [x] Student-only `/shop`: try-on preview, buy with confirm, wear, save
- [x] Avatar on both dashboards; frames in CSS
- [x] 126 portraits (skin × hair/hijab × outfit) + 4 accessory badges generated and connected
- [ ] Watch whether prices feel fair once students earn real coins

## Cross-cutting — done this round

- [x] Gamification branch merged into `main` (`2c788f3`), dialogs raised above the audio dock
- [x] All gates green at `17e3e00`: 90 unit tests, type check, build, 64 browser tests
- [x] Pushed and auto-deployed; live routes and images verified

---

## Next up (not started)

### Content — the current bottleneck
- [ ] Lesson 2 «النظام الغذائي المتوازن» end to end (page, activities, question bank, narration, image) as a repeatable recipe
- [ ] Lessons 3–19 of grade 8 science, first term
- [ ] Question banks with variations, so retries and spaced review have material
- [ ] Other subjects / grades (each new textbook does not publish itself)

### Operations and safety
- [ ] Rotate the AtlasCloud API key (it was pasted into chat)
- [ ] Fix the off-server backup to MinIO (SSL 526); local nightly backup works
- [ ] Privacy policy, parent consent and a data-deletion path before inviting real families
- [ ] End-to-end check on the live site with one real family account

### Phase 2b — deeper personalisation
- [ ] Companion robot that grows with the student's title
- [ ] Personal lab: background and decor that improve with progress
- [ ] Discovery-card album collected from lessons
- [ ] Celebration animation at the end of a unit
- [ ] Journey map: each unit a region, each lesson a stop

### Phase 3 — social and competition (needs content + consent first)
- [ ] Weekly leaderboard per grade, showing nearby ranks, not only the top
- [ ] «الأكثر تحسّنًا» and «الأكثر انتظامًا» awards beside top score
- [ ] Student of the week per grade, Friday recognition
- [ ] Challenge arena: question of the week, spot-the-error, safe home experiment
- [ ] News and announcements section
- [ ] Public profiles: opt-in by a parent, nickname and avatar only
- [ ] Raffle — only if wanted later: published rules, free entry, no paid chances, and check whether a permit is required in Kuwait

### Engagement and family
- [ ] Weekly parent summary by email or WhatsApp
- [ ] Daily reminder notifications, controlled by the parent
- [ ] Family goals for siblings on one parent account
- [ ] Seasonal cosmetics for National Day and Ramadan
- [ ] First-day quest that ends with a first avatar item

### Deliberately not doing (for now)
- [ ] Real-money purchases (would need KNET, parent approval, refunds; cosmetics only if ever)
- [ ] Selling grades, ranks or extra chances to win — never
- [ ] Admin editing of the shop catalogue (items live in code)
