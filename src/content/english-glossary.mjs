// One row per icon and meaning. Slash-separated spellings share the Arabic gloss.
const rows = `
🏫 school=مدرسة;classroom=فصل دراسي;gate=بوابة
🎒 schoolbag/backpack=شنطة المدرسة;bag=شنطة;bags=شنط;pack/packs/packing=يجهّز الشنطة;carry/carries/carrying=يحمل
📚 library=مكتبة;books=كتب;bookshelf/shelf=رف الكتب;shelves=رفوف;borrow=يستعير;lends=يُعير
📖 book=كتاب;storybook=كتاب قصص;bookmark=علامة كتاب;read/reads/reading=يقرأ;story=قصة;stories=قصص
📓 notebook=كراسة;paper=ورق;page=صفحة;lines=سطور;line=سطر;word=كلمة;words=كلمات;meaning=معنى;meanings=معاني;means=يعني
✏️ pencil=قلم رصاص;pencils=أقلام رصاص;pen=قلم;pens=أقلام;write/writes=يكتب;copy=ينسخ
📏 ruler=مسطرة;rulers=مساطر;straight=مستقيم;round=دائري;short=قصير;long=طويل
🪑 chair=كرسي;desk=مكتب;desks=مكاتب;bench=مقعد;sit/sits/sitting=يجلس;stand=يقف;table=ترابيزة
🎧 listen/listens=يسمع بانتباه;hear=يسمع;closely=بانتباه;audio=صوت;speaker=متكلم;sound=صوت;sounds=أصوات
🏀 ball=كرة;basketball=كرة السلة;sport/sports=رياضة;play/plays/playing=يلعب;played=لعب;game=لعبة;games=ألعاب;gym=صالة الرياضة;physical=بدني;education=تعليم;pe=تربية رياضية
⚽ football=كرة القدم;catch/catches/catching=يمسك;run/running=يجري;playground=ملعب;kite=طائرة ورقية
🔔 bell=جرس;ring/rings=يرنّ;break=الفسحة / استراحة;stops=يتوقف;begin/begins/start/starts/starting=يبدأ;finish/finishes=ينتهي;ends=ينتهي;leave=يغادر
📅 calendar=تقويم;day=يوم;days=أيام;week=أسبوع;weekly=أسبوعي;today=النهارده;yesterday=إمبارح;every=كل;ago=منذ;daily=يومي
📅 monday/mondays=الاثنين;tuesday/tuesdays=الثلاثاء;wednesday/wednesdays=الأربعاء;thursday=الخميس;friday/fridays=الجمعة;saturday=السبت;sunday/sundays=الأحد
⏰ time=الوقت;clock=ساعة;hour=ساعة زمنية;timetable=جدول مواعيد;early=بدري;late=متأخر;soon=قريبًا;now=دلوقتي;before=قبل;after=بعد;last=الأخير / الماضي;next=التالي
🌅 morning=الصبح;sunrise=شروق الشمس;wake=يصحى;routine=روتين يومي;habit=عادة;usually=عادةً
🌤️ afternoon=بعد الظهر;noon=الظهر;sunny=مشمس;weather=الجو;warm=دافئ;hot=ساخن
🌙 evening=المساء;night=الليل;midnight=منتصف الليل;sleep=ينام;quiet=هادئ
🛏️ bed=سرير;bedroom=غرفة النوم;pillow=مخدة;sofa=كنبة;room=غرفة
🪥 toothbrush=فرشة أسنان;brush/brushes=فرشة / يفرّش;teeth=أسنان;comb=مشط;combs=يمشط;hair=شعر;mirror=مراية
🧼 soap=صابون;bath=حمّام;bathroom=دورة المياه;wash/washes/washing=يغسل;washed=غسل;clean/cleans/cleaning=ينظّف;towel=فوطة;dry=ينشّف / ناشف;wet=مبلول;bubbles=فقاعات
🧥 uniform=زي المدرسة;uniforms=ملابس المدرسة;clothes=ملابس;dressed=مرتدي ملابسه;wear=يلبس;hat=قبعة;hats=قبعات;tie=كرافتة;gloves=قفازات;glasses=نظارة
👟 shoe=حذاء;shoes=أحذية;trainers=كوتشي;sock=جورب;socks=جوارب;feet=قدمين;foot=قدم
🍽️ meal=وجبة;meals=وجبات;breakfast=الفطار;lunch=الغدا;dinner=العشا;food=أكل;eat/eats/eating=يأكل;ate=أكل;taste=يتذوق;snack=أكلة خفيفة
🍞 bread=خبز;toast=خبز محمّص;sandwich=ساندويتش;egg=بيضة;pan=طاسة;kitchen=مطبخ;fresh=طازج
🍎 fruit=فاكهة;apple=تفاحة;apples=تفاح;banana=موزة;orange=برتقالة / برتقالي
🥛 milk=لبن;drink/drinks=يشرب / مشروب;water=مياه;waters=يسقي;cup=كوب;plate=طبق;fork=شوكة;spoon=معلقة
🏠 home=البيت;door=باب;wall=حائط;window=شباك;open/opens=يفتح;outside=برّه;inside=جوّه;out=للخارج
🌳 park=حديقة;garden=جنينة;grass=عشب;plant=نبات / يزرع;wooden=خشبي;beach=شاطئ;sea=البحر;zoo=حديقة حيوانات
🚌 bus=أوتوبيس;buses=أوتوبيسات;car=عربية;bike=عجلة;ride=يركب;driver=سائق;travel=يسافر;walk/walks/walking=يمشي;walked=مشى;wait/waits/waiting=ينتظر
✈️ plane=طيارة;pilot=طيّار;boat=قارب;ship=سفينة;far=بعيد;distance=المسافة;near=قريب;away=بعيدًا
🏗️ building=مبنى;block=قطعة مكعبات;brick=طوبة;build=يبني;box=علبة;boxes=علب;ledge=حافة بارزة;kit=عدة
🔬 science=علوم;lab=معمل;microscope=ميكروسكوب;experiment=تجربة;experiments=تجارب;look/looks=ينظر;see/sees=يرى;saw=شاف;find=يلاقي
🎨 art=الفن;draw=يرسم;paint/paints=يلوّن;painted=لوّن;picture=صورة;pictures=صور;marker=قلم تلوين;crayons=أقلام شمع;colour/color=لون
🎵 music=موسيقى;piano=بيانو;singing=غناء;film=فيلم;tv=تلفزيون;watch/watches=يتفرج;watched=اتفرّج
🍎 red=أحمر;green=أخضر;blue=أزرق;white=أبيض;black=أسود;brown=بني
🐶 animal=حيوان;dog=كلب;sheep=خروف;fish=سمكة;swims=يسبح
👩‍🏫 teacher=مدرّس / مدرّسة;teachers=مدرّسين;class=حصة / فصل;classes=حصص;lesson=درس;lessons=دروس;subject=مادة;students=طلاب;pupil=تلميذ;pupils=تلاميذ
🎓 study/studies=يدرس;studied=درس;learn=يتعلم;homework=واجب;exercise=تمرين;activity=نشاط;unit=وحدة;english=اللغة الإنجليزية;arabic=اللغة العربية;maths=رياضيات
👨‍👩‍👧 family=عيلة;mother=أم;brother=أخ;sister=أخت;cousin=ابن أو بنت العم أو الخال;child=طفل;children=أطفال;boy=ولد;girl=بنت
👥 friend=صديق;friends=أصدقاء;people=ناس;person=شخص;group=مجموعة;both=الاتنين;together=مع بعض;alone=لوحده
👤 i=أنا;you=أنت / أنتم;he=هو;she=هي;it=هو أو هي للشيء;we=إحنا;they=هم;me=إياي / لي;him=إياه / له;her=إياها / لها;us=إيانا / لنا;them=إياهم / لهم
👤 my=بتاعي;your=بتاعك;his=بتاعه;its=بتاع الشيء;our=بتاعنا;their=بتاعهم;own=الخاص به;name=اسم;named=اسمه;names=أسماء
🏷️ omar=عمر;haya=هيا;ali=علي;sara=سارة;salma=سلمى;sami=سامي;dana=دانا;mona=منى;reem=ريم;noor=نور;fahad=فهد;bader=بدر;brad=براد
❓ who=مَن؟;what=إيه؟;where=فين؟;when=إمتى؟;why=ليه؟;how=إزاي؟;which=أنهي؟;question=سؤال;ask/asks=يسأل;answer=إجابة
📍 place=مكان / يحط;position=موقع;here=هنا;there=هناك;at=عند / في;in=في;on=على;under=تحت;beside=جنب;across=عبر;left=الشمال;right=اليمين / صحيح;front=الأمام;back=الخلف / رجوع
📍 this=ده / دي;that=ده / دي لشيء بعيد;these=دول قريب;those=دول بعيد;to=إلى;from=من;by=بواسطة / بجانب;with=مع;of=من / لـ;about=عن;for=لأجل / لـ;than=من للمقارنة
🧩 and=و;or=أو;but=لكن;because=لأن;so=علشان كده;then=بعد كده;a/an=أداة قبل اسم مفرد نكرة;the=الـ;as=كما / بصفته
✅ correct/correctly=صحيح / بطريقة صحيحة;true=صح;false=غلط;yes=أيوه;no=لأ;not=مش;good=كويس;best=الأفضل;please=من فضلك;ready=جاهز;favourite=المفضل;like/likes=يحب;liked=أحبّ;enjoy=يستمتع;wants=يريد
🧩 am/is/are=يكون في المضارع;was/were=كان;do/does=يفعل / أداة سؤال;did=فعل / أداة سؤال في الماضي;have/has=عنده / يمتلك;had=كان عنده;can=يقدر;should=يُفترض / ينبغي
🧩 don't/doesn't=لا يفعل;didn't=لم يفعل;isn't/aren't=مش / ليس;won't=لن يفعل;cannot/can't=لا يقدر;i'm=أنا أكون;it's=إنه / إنها;they're=هم يكونوا
🔧 add=يزوّد;change=يغيّر;check=يراجع;complete/completes=يكمل;choose=يختار;connect=يوصل;fix/fixes/repair=يصلّح;put/puts=يحط;replace=يبدّل;sort=يصنّف;order=يرتّب / ترتيب;match/matches/matching=يوصل المتشابه;fits=يناسب
🔠 letter=حرف;letters=حروف;capital=حرف كبير;capitals=حروف كبيرة;punctuation=علامات الترقيم;punctuate=يضيف علامات الترقيم;punctuated=فيه علامات ترقيم;mark=علامة;ending=نهاية;full=كامل;stop=توقف / نقطة نهاية الجملة
🔠 sentence=جملة;sentences=جمل;phrase=عبارة;form=صيغة;forms=صيغ;verb=فعل;verbs=أفعال;pronoun=ضمير;pronouns=ضمائر;action=فعل / حركة;present=المضارع;past=الماضي;simple=بسيط
🔤 spell=يتهجّى;spelling=التهجئة;sh=صوت ش في الإنجليزي;bl=الصوتان بْ ولْ معًا;br=الصوتان بْ ورْ معًا;blend=دمج أصوات;blends=أصوات مدمجة
🔢 count=يعدّ;number=رقم;numbers=أرقام;one=واحد;two=اتنين;three=تلاتة;four=أربعة;five=خمسة;six=ستة;seven=سبعة;eight=تمانية;nine=تسعة;ten=عشرة;eleven=أحد عشر;twelve=اتناشر
🔢 first=الأول;second=الثاني;third=الثالث;fourth=الرابع;middle=الوسط;many=كتير;more=أكتر;each=كل واحد;little=صغير;big=كبير
💬 talk=يتكلم;speaks/speaking=يتحدث;tell/tells=يحكي;show/shows=يبيّن;help/helps=يساعد;give/gives=يدي;remember=يفتكر;instruction=تعليمة;mentioned=مذكور;clues=تلميحات;detective=محقق;goodbye=مع السلامة
✋ get/gets/getting=يحصل على / يصير;go/goes/going=يروح;went=راح;come/comes=يجي;take/takes=يأخذ;keeps=يحتفظ;make=يعمل;work=يشتغل / شغل;use/uses/using=يستخدم;up=فوق;happens=بيحصل
😊 face=وجه;hand=يد;hands=أيدين;smiles=يبتسم;beard=دقن;kind=نوع / طيب;object=شيء;objects=أشياء;thing=حاجة;things=حاجات;part=جزء;pair=زوج;copy=ينسخ
🏪 shop=محل;farmer=مزارع;meet/meets=يقابل;visit/visits=يزور;visited=زار;rain/raining=المطر / بتمطر;umbrella=شمسية
🔤 b=الحرف B;c=الحرف C;d=الحرف D;e=الحرف E;m=الحرف M;o=الحرف O;p=الحرف P;s=الحرف S;t=الحرف T;y=الحرف Y;ed=نهاية لكثير من أفعال الماضي;es=نهاية لبعض الكلمات والأفعال;ied=نهاية ماضٍ لبعض الأفعال التي تنتهي بـ y;ies=نهاية بتتحط بدل y في بعض الكلمات
🗺️ map=خريطة;board=سبّورة / لوحة
⏰ o'clock=بالضبط للساعة;wakes=يصحى
✍️ boxs=تهجئة فيها خطأ لكلمة علب;busis=تهجئة فيها خطأ لكلمة أوتوبيسات;childs=صيغة جمع فيها خطأ لكلمة أطفال;pencel/pensil=تهجئة فيها خطأ لكلمة قلم رصاص;teacer/teecher=تهجئة فيها خطأ لكلمة مدرّس;haves=صيغة فيها خطأ للفعل عنده;studys=صيغة فيها خطأ للفعل يدرس;washs=صيغة فيها خطأ للفعل يغسل;watchs=صيغة فيها خطأ للفعل يشاهد;bruhs=تهجئة فيها خطأ لكلمة فرشة;brash=كلمة معناها متهوّر
`;

const spritePositions = new Map([
  ["📚", 0],
  ["🏫", 1],
  ["🎒", 2],
  ["📖", 3],
  ["🎧", 4],
  ["🏀", 5],
  ["📅", 6],
  ["🔔", 7],
  ["✏️", 8],
]);
const glossary = new Map();
for (const line of rows.trim().split("\n")) {
  const space = line.indexOf(" ");
  const icon = line.slice(0, space);
  for (const entry of line.slice(space + 1).split(";")) {
    const [words, meaning] = entry.split("=");
    for (const word of words.split("/")) {
      glossary.set(word, { meaning, icon, sprite: spritePositions.get(icon) });
    }
  }
}

export const englishWordPattern = /([A-Za-z]+(?:['’][A-Za-z]+)*)/g;

export function wordMeaning(word) {
  return glossary.get(word.toLowerCase().replaceAll("’", "'"));
}
