# Avatar portrait and badge image requests — generated 2026-09-19

Date: 2026-09-19. Layer stacking is impossible with a text-to-image model: each generated “layer” contained a whole person. Shop rules are unchanged (`src/server/shop.mjs`, store, API, prices, unlocks, saved config `{base,hair,outfit,accessory,frame}`). Rendering uses a full look portrait plus an optional accessory badge.

Provenance matches the Task C curriculum set: AtlasCloud model `openai/gpt-image-2-developer/text-to-image`, quality low, text-to-image only (no reference images attached).

**Do not generate frame PNGs.** Frames stay CSS. `acc-none` has no badge.

## Looks (126)

A look exists for every `base × hair × outfit` combination:

- base ∈ {`base-1`, `base-2`, `base-3`}
- hair ∈ {`hair-short`, `hair-curly`, `hair-long`, `hijab-violet`, `hijab-azure`, `hair-bun`, `hijab-stars`}
- outfit ∈ {`outfit-casual`, `outfit-lab-coat`, `outfit-doctor`, `outfit-explorer`, `outfit-astronaut`, `outfit-nutrition`}

Look id: `look-${base}-${hair}-${outfit}` (example: `look-base-2-hair-short-outfit-casual`).

- Output: `public/images/avatar/looks/<lookId>.png`
- Size: 448 × 448, opaque
- Composition: head-and-shoulders student portrait on flat `#F2EAFF`
- Usage: filled circle in `src/components/avatar/avatar.tsx` (`object-fit: cover`); shop try-on preview for base / hair / outfit items
- Slots: `LOOK_SLOTS` in `src/content/avatar-slots.ts` (`ready: true`)

Shared look direction:

> Friendly semi-realistic illustrated head-and-shoulders student portrait, front-facing, opaque 448x448 PNG, flat #F2EAFF background. Palette accents #ffbe0b #fb5607 #ff006e #8338ec #3a86ff. No text, no logos.

## Badges (4)

Transparent sticker badges, not full-body layers:

| id | Output | Size | Alt |
| --- | --- | --- | --- |
| acc-glasses | `public/images/avatar/badges/acc-glasses.png` | 192×192 transparent | نظارة |
| acc-headphones | `public/images/avatar/badges/acc-headphones.png` | 192×192 transparent | سماعات |
| acc-backpack | `public/images/avatar/badges/acc-backpack.png` | 192×192 transparent | حقيبة ظهر |
| acc-goggles | `public/images/avatar/badges/acc-goggles.png` | 192×192 transparent | نظارة المختبر الواقية |

The badge is a small circular sticker (~34% of avatar width) pinned to the bottom-left of the circle, outside `.avatar-inner` so the portrait clip does not crop it.

Slots: `BADGE_SLOTS` in `src/content/avatar-slots.ts` (`ready: true`). `badgeSlot("acc-none")` is undefined.

## Connecting assets

Drop each PNG at the path above. Records are already `ready: true`; `lookSlot(base, hair, outfit)` and `badgeSlot(accessoryId)` resolve them. Until a look file is present the avatar falls back to the student’s initial.
