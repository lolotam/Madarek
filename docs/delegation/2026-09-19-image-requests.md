# Task C image requests — generated 2026-09-19

Date: 2026-09-19. All fourteen PNGs are on disk and the matching records in `src/content/image-slots.ts` are `ready: true`. The UI renders them through `src/components/ui/image-slot.tsx`.

They were generated with the AtlasCloud model `openai/gpt-image-2-developer/text-to-image`, quality low, **text-to-image only**. The textbook pages were **not** attached as image references; prompts described their content. Square images were resized to slot size. `life-header` was generated at 2560×1088 and cropped to 1600×400.

Do not edit original textbook files. Do not rasterize Arabic titles into the images. Do not relabel existing files in `public/images/` (`science-discovery.png`, `nutrients-plate.png`, `food-*.png`) as Task C assets. Digestive-anatomy images should still be reviewed against the book by a teacher.

Shared still-life / classroom-model direction for the six curriculum slots (used as prompt text, not as an attached reference):

> Use the attached Kuwaiti grade-8 science textbook page as the factual visual reference. Create a realistic educational still-life or clean three-dimensional classroom anatomical model, age-appropriate, anatomically consistent with the reference, ivory studio background with restrained azure #3a86ff / violet #8338ec / amber #ffbe0b accents. No text, no labels, no watermark, no disturbing tissue detail. One clear central concept, legible at card scale.

Orchestrator visual check on 2026-09-19 (starting references, not attached at generation): `علوم-24.jpg`, `علوم-29.jpg`, `علوم-38.jpg`, `علوم-43.jpg`, `علوم-48.jpg` under `GRADE-8/FIRST-TERM/SCIENCE/علوم/` match printed pages 24 / 29 / 38 / 43 / 48. Page 43 includes salivary glands and the abdominal accessory organs.

## Curriculum slots

### nutrients

- Reference: `GRADE-8/FIRST-TERM/SCIENCE/علوم/علوم-24.jpg`
- Output: `public/images/curriculum/nutrients.png` (`/images/curriculum/nutrients.png`)
- Size: 800 × 800
- Alt: أطعمة تمثّل مجموعات المغذّيات الرئيسة
- Usage: science lesson card المغذّيات
- Prompt: shared direction plus foods representing the textbook's major nutrient groups (grains, protein foods, vegetables, fruit, milk, a little oil). Not a copy of the burger photo. Not a medical chart.

### balanced-diet

- Reference: `GRADE-8/FIRST-TERM/SCIENCE/علوم/علوم-29.jpg`
- Output: `public/images/curriculum/balanced-diet.png`
- Size: 800 × 800
- Alt: وجبة متنوعة تمثّل الغذاء المتوازن
- Usage: science lesson card النظام الغذائي المتوازن
- Prompt: shared direction plus a varied balanced meal matching the book's grouping (protein, eggs, green vegetables, fruit, nuts, a grain).

### digestive-structure

- Reference: `GRADE-8/FIRST-TERM/SCIENCE/علوم/علوم-38.jpg`
- Output: `public/images/curriculum/digestive-structure.png`
- Size: 800 × 800
- Alt: نموذج صفي لجهاز هضمي كامل
- Usage: science lesson card تركيب الجهاز الهضمي
- Prompt: shared direction plus a full digestive-tract classroom model in the textbook arrangement. Educational model only, not a medical reference. **Teacher review against the book is still required.**

### digestive-accessories

- Reference: `GRADE-8/FIRST-TERM/SCIENCE/علوم/علوم-43.jpg`
- Output: `public/images/curriculum/digestive-accessories.png`
- Size: 800 × 800
- Alt: الغدد اللعابية والكبد والمرارة والبنكرياس في سياقها
- Usage: science lesson card ملحقات الجهاز الهضمي
- Prompt: shared direction plus salivary glands with liver, gallbladder and pancreas in the page-43 context. Do not reverse left/right relative to the figure. **Teacher review against the book is still required.**

### digestion

- Reference: `GRADE-8/FIRST-TERM/SCIENCE/علوم/علوم-48.jpg`
- Output: `public/images/curriculum/digestion.png`
- Size: 800 × 800
- Alt: مسار مبسّط للطعام عبر أعضاء الهضم
- Usage: science lesson card عملية الهضم
- Prompt: shared direction plus a food journey through simplified anatomically ordered organs matching the stomach-centered textbook figure. **Teacher review against the book is still required.**

### life-header

- References: `GRADE-8/FIRST-TERM/SCIENCE/علوم/علوم-29.jpg`, `علوم-38.jpg`, `علوم-43.jpg`
- Output: `public/images/curriculum/life-header.png`
- Size: 1600 × 400 (4:1), cropped from a 2560 × 1088 generation
- Alt: تصوير عن الغذاء والجسم لوحدة علوم الحياة
- Usage: left pane of the علوم الحياة unit header; live HTML title stays on the right
- Prompt: shared direction plus landscape 4:1, rich imagery on LEFT 55% (foods beside a clean digestive model), RIGHT 45% quiet ivory negative space. No text inside the image. Display crop uses `object-position: left` so the rich side fills the left pane.

## Subject-card slots

Square 768 × 768 still-lifes. No people, no text, no logos. The live العلوم card now uses `science.png`; `/images/science-discovery.png` remains on the homepage only.

| id | Output | Alt | Reference |
| --- | --- | --- | --- |
| arabic | `public/images/subjects/arabic.png` | دفتر خط عربي وقلم على طاولة هادئة | `GRADE-8/FIRST-TERM/ARABIC/كتاب ثامن عربي قسم أول ٢٠٢٧.pdf` |
| english | `public/images/subjects/english.png` | كتاب قراءة إنجليزي مفتوح بجانب أقلام ملوّنة | `GRADE-8/FIRST-TERM/ENGLISH/كتاب ثامن إنجليزي ستيودنتس ٢٠٢٧.pdf` |
| math | `public/images/subjects/math.png` | أدوات هندسة ومكعبات على دفتر مربعات | `GRADE-8/FIRST-TERM/MATH/MATH STUDENT BOOK.pdf` |
| science | `public/images/subjects/science.png` | مجهر وقارورة ونبتة على طاولة علوم | `GRADE-8/FIRST-TERM/SCIENCE/علوم.pdf` and `GRADE-8/FIRST-TERM/SCIENCE/علوم/علوم-1.jpg` |
| quran | `public/images/subjects/quran.png` | مصحف مغلق على حامل خشبي هادئ | `GRADE-8/FIRST-TERM/ISLAMIC/كتاب ثامن قرآن ٢٠٢٧.pdf` |
| islamic | `public/images/subjects/islamic.png` | سبحة وكتاب مغلق على قماش هادئ | `GRADE-8/FIRST-TERM/ISLAMIC/كتاب ثامن إسلامية ٢٠٢٧.pdf` |
| social-studies | `public/images/subjects/social-studies.png` | مجسم كرة أرضية وبوصلة على مكتب دراسة | `GRADE-8/FIRST-TERM/SOCIAL STUDIES/ثامن_اجتماعيات_حل_الكتاب_للفصل_الاول_2025.pdf` (2025 solution booklet; no 2026–2027 student cover inspected). First map prompt returned no image; regenerated as a small plain classroom desk globe with no printed names beside a brass compass and a closed notebook on a wooden desk. |
| home-economics | `public/images/subjects/home-economics.png` | أدوات مطبخ بسيطة على منديل كتّان | `GRADE-8/FIRST-TERM/ECONMIC/الاقنصاد المنزلي.pdf` |

Full English prompts, including the shared direction, live on each record in `src/content/image-slots.ts`.
