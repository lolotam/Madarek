# Platform override — user requirements take precedence

Applies to home, curriculum, lesson, auth and dashboards.

- Direction: Arabic RTL, Noto Sans Arabic variable, locally bundled; no English-only font recommendation.
- Visual direction: premium school notebook; restrained rounded cards, editorial whitespace and warm paper. Use realistic generated images for real-world subjects and examples (food, materials and experiments). Retain clear diagrams for scientific relationships and concept trees.
- Image generation preference (user update, 2026-09-19): always use realistic generated imagery for real-world examples. The user requests “Image 2.5”; this specific model identifier is not selectable in the currently exposed image generation tool. Do not claim that model was used without verification. Review generated educational imagery for scientific accuracy; keep Arabic labels as accessible HTML. The user approved applying this to the current home and nutrients lesson: science hero, food plate and four interactive food examples. Store assets in public/images with prompts and provenance in docs/GENERATED-IMAGES.md. Preserve concept trees, process diagrams and interface icons as accessible UI.
- Brand: temporary wordmark «مدارك» with «مساحة للاكتشاف»; editable before public launch.
- Colors (user update, 2026-09-19): Amber Gold #ffbe0b, Blaze Orange #fb5607, Neon Pink #ff006e, Blue Violet #8338ec, Azure Blue #3a86ff. These five exact accent colors supersede the earlier green/red/yellow/blue palette and the generated master recommendation.
- Color roles: violet primary actions; azure information; pink highlights; orange discovery accents; amber emphasis. Paper #fffbf5, ink #241b35, white cards and light accent tints. Darker text variants ensure readable text; white labels on violet, dark labels on orange/pink/amber. National flag and recognizable food illustrations retain natural colors.
- Tokens: CSS variables in src/app/globals.css are the source of truth; SVG illustrations inherit them. Existing content color keys map to the updated palette.
- Type: 16px body minimum, 1.9 Arabic body line height; fluid 40–68px hero heading, 28–40px section headings.
- Layout: 1184px maximum width, 24px/48px gutters; 4/8px rhythm. No horizontal overflow at 360px.
- Controls: 44px minimum, visible 3px focus ring, native semantic elements or Radix tabs. Error/success always include text and icons.
- Motion: 200–300ms micro-interactions; Framer Motion reducedMotion=user. Educational animations user-triggered, never required for understanding.
- Components: Tailwind layout utilities, tokenized CSS and reusable native controls; Radix tabs for keyboard-accessible mode switching.
- No fabricated testimonials, placeholder student counts, decorative emoji icons or disabled links styled as available lessons.
