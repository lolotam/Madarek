# حالة النسخة المحلية الأولى

التاريخ: 2026-09-19. نطاق هذا التسليم: علوم الصف الثامن، الفصل الدراسي الأول 2026–2027، مع تفعيل درس المغذّيات فقط.

## منفذ ومتاح

| الجزء             | الحالة                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| الرئيسية          | هيرو ورسوم علمية أصلية بالكود، كروت الصفوف، كاروسيل وتقديم متابعة الأسرة                                   |
| فهرس العلوم       | 4 وحدات، 9 فصول، 19 درسًا من فهرس الكتاب المرفوع                                                           |
| درس المغذّيات     | شجرة تصنيف، استكشاف أربعة أطعمة، تجربة خطوات الطاقة والبناء، وتغطية جميع مجموعات المغذّيات والماء والألياف |
| التدريب والاختبار | اختاري وعلّلي، و10 أسئلة نهائية اختيار وأكملي، تفسير النتائج وإعادة المحاولة                               |
| الحسابات          | تسجيل ولي أمر، إضافة طفل، دخول مستقل، رمز قابل لإعادة التعيين                                              |
| الحفظ             | قاعدة SQLite على الخادم تحفظ المقاطع وإجابات علّلي ومحاولات الاختبار                                       |
| المتابعة          | لوحة الطالب ولوحة الأسرة مع تفاصيل الإجابات وآخر وأفضل درجة وموضوعات المراجعة                              |
| الإدارة           | إنشاء مدير عبر أمر محلي، إحصاءات، نشر وإلغاء نشر الدرس الأول                                               |

## التحقق المنفذ

- `npm.cmd run build`: نجح بناء الإنتاج والتحقق من TypeScript.
- `npm.cmd test`: نجحت 9 اختبارات، تشمل التصحيح وعزل الأسر والصلاحيات وإبطال الجلسات وإعادة فتح قاعدة البيانات وسلامة بيانات المتابعة.
- Playwright: نجح سيناريو الصفحات والتفاعلات على العروض 360 و768 و1440 و844 بكسل دون تمرير أفقي.
- Playwright: نجحت رحلة تسجيل ولي الأمر وإضافة الطفل وخروج ولي الأمر ودخول الطفل وإكمال المقاطع وتدريب علّلي والإجابة عن الاختبار بدرجة 100٪، ثم إعادة الدخول ومراجعة ولي الأمر للإجابات المحفوظة.
- تم التحقق من رفض طلب تعديل قادم من Origin مختلف ومنع ولي الأمر من نشر الدرس.
- Axe: نجح الفحص الآلي بمعايير WCAG A/AA المحددة في الاختبار على الرئيسية والفهرس والدرس والتسجيل، بعد انتظار اكتمال حركات ظهور المحتوى. هذا ليس تدقيقًا بشريًا شاملًا لإمكانية الوصول.
- مراجعة بصرية فعلية للواجهة على الكمبيوتر والموبايل، وإصلاح موضع الرسم على الشاشة الضيقة.
- قاعدة الاختبارات منفصلة عن قاعدة التطبيق. قاعدة التطبيق كانت بلا حسابات أو محاولات وهمية عند التسليم؛ يبدأ وليد بإنشاء حسابه الحقيقي محليًا.

خلال التحقق أُصلحت تسمية حقل كلمة المرور، وفحص Origin عندما يحوّل Next عنوان loopback داخليًا إلى localhost، وتحويل صفوف SQLite إلى كائنات عادية قبل تمريرها لواجهة React، وتباين النصوص والأرقام.

## ما يزال غير منفذ

- ربط مزود الذكاء الاصطناعي لتوليد المسودات والتغذية الراجعة لعلّلي. المعروض الآن هو النموذج التعليمي الثابت مع تصريح واضح بذلك.
- محرر دروس عام ورفع PDF والصور من لوحة الإدارة.
- تحقق بريد ولي الأمر واستعادة كلمة مروره بالبريد.
- ضوابط الإطلاق العام، سياسة الخصوصية وإجراءات حذف البيانات والنسخ الاحتياطي وسجل تعديلات الإدارة وخدمة الاستضافة.
- بقية الدروس والمواد والصفوف. وجود ملفات لها على القرص لا يعني استيعابها أو نشرها.

هذه نسخة محلية قابلة للتجربة وليست إعلانًا عن اكتمال جميع متطلبات PRD. أوامر التشغيل وإعداد حساب الإدارة في `README.md`.

## تحديث 2026-09-19: الأسرة والإدارة والشرح الصوتي

نُفّذت هذه الأجزاء بتفويض لوكلاء Cursor (موديل `cursor-grok-4.6-high-fast`)، كلٌّ في فرع مستقل. روجعت الفروقات، وأُعيد تشغيل كل الفحوص قبل كل دمج.

| الجزء                       | الحالة                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| إصلاحات                     | انتظار قفل SQLite وفتح القاعدة عند أول استخدام، فلا يلمسها البناء؛ رفض إجابات اختبار غير صالحة برمز 400 بدل 500                                  |
| تسجيل الأسرة                | خطوة واحدة لولي الأمر وحتى ستة أبناء (اسم، صف، جنس، اسم مستخدم، رمز) في معاملة واحدة؛ ترحيل الأعمدة في مكانها                                    |
| لوحة الإدارة `/admin`       | المستخدمون والأسر (تعديل، إعادة تعيين، تعطيل، إنشاء، حذف)؛ إعدادات ElevenLabs بمفتاح مشفّر يُكتب ولا يُعرض؛ المحتوى؛ سجل العمليات                |
| نصوص الشرح                  | 77 مقطعًا مصريًا بصيغة جمع عامة، دون أسماء أطفال أو حروف لاتينية أو أرقام، بحقائق من الدرس والأسئلة فقط؛ روجعت علميًا وصُحّح التباس «فيتامين دي» |
| توليد الصوت                 | `npm run audio -- plan/generate/review/list`: عدّ الحروف، وحد إلزامي، وتأكيد، ونسخ ذرية بحالة مراجعة، وإعادة توليد المرفوض دون المساس بالمعتمد   |
| تقديم الصوت                 | مانيفست ومقاطع معتمدة فقط، HTTP Range وETag، ومقاطع الإجابات بتصريح يصدر بعد التصحيح                                                             |
| المشغّل                     | الصفحة والجزء والنتيجة، والتكرار والسرعة والبحث، وإطار Framer Motion يتبع العنصر المشروح ويكشف حالته، والتفاعل اليدوي يوقف الصوت                 |
| مراجعة الصوت `/admin/audio` | استماع مع تظليل التزامن، واعتماد أو رفض بسبب                                                                                                     |

آخر فحص على الفرع الرئيسي: نجحت 50 اختبار Node و26 اختبار Playwright (منها تشغيل حقيقي لمقطع عبر الخادم والمشغّل دون محاكاة)، والبناء وTypeScript.

ما زال معلقًا:

- توليد المكتبة الصوتية الفعلية ومراجعتها سمعيًا. يلزم لذلك:
  - إضافة الصوت المختار إلى حساب ElevenLabs؛
  - تحديد `ELEVENLABS_MAX_CHARACTERS`؛
  - مفتاح بصلاحيات كافية.
- صياغة الموقع بحسب جنس الطفل.
- الصور الجديدة مواضع مؤقتة يُولّدها المالك لاحقًا.

## Rewards (Phase 1)

- Study day = midnight Asia/Kuwait. Only learning actions count (lesson section, practice, quiz submission), not logging in.
- Daily reward: 20 XP + 10–50 coins (capped at day 5). Milestones at 7 and 30 days. Every 7th day earns a freeze (max 2) that covers one missed day.
- Quiz: XP = best score × 10 (max 1,000 per lesson); retakes pay only the improvement. Serious attempt (all answered): +20 XP once per lesson per day.
- XP sets level and title and never decreases; coins are kept for the Phase 2 shop; mastery per concept is separate from points.
- All grants go through `reward_ledger` with `UNIQUE(user_id, source, source_key)`, so every reward is paid at most once and is computed on the server.
- Numbers live in `src/server/rewards.mjs` and are provisional until real usage data exists.

## Shop and avatars (Phase 2)

- Coin balance = earned − spent. Purchases go into `purchases`, never `reward_ledger`, so XP and titles never drop.
- Students buy paid items once and wear any owned layer; earned items unlock from Nutrients mastery (`outfit-nutrition`), level 3 (`acc-goggles`), or a 7-day best streak (`frame-streak`) and cannot be bought.
- Default avatar: `base-2`, `hair-short`, `outfit-casual`, `acc-none`, `frame-violet`. Saving requires every layer to be an owned item of that layer.
- `/shop` is student-only. Parents see the child's avatar read-only on the family dashboard.
- Avatar art is a full look portrait for every `base × hair × outfit` combination (126 files, `look-${base}-${hair}-${outfit}`, 448×448 in `public/images/avatar/looks/`) plus a 192×192 accessory badge for glasses, headphones, backpack, and goggles. `acc-none` has no badge. Frames stay CSS. Shop catalogue, prices, unlocks, and saved config `{base,hair,outfit,accessory,frame}` are unchanged. Slots are `ready: true` in `src/content/avatar-slots.ts`. Request list: `docs/delegation/2026-09-19-avatar-image-requests.md`.
