export const grammarPath = "/grade/2/english/grammar";

export const grammarRules = [
  {
    id: "pronouns",
    page: 14,
    icon: "👥",
    title: "الضمائر",
    english: "Pronouns",
    description: "مين اللي بيعمل الفعل؟ اختار الضمير المناسب بدل الاسم.",
    scene: "🙋 Who?|👥 One or more?|💬 I, you, we, they",
    steps: [
      {
        icon: "🙋",
        title: "أنا، أنت وإحنا",
        note: "I لما أتكلم عن نفسي. You للشخص اللي بكلمه أو لمجموعة. We ليا مع شخص أو أكتر.",
        samples: [
          ["Omar: I", "I go to school."],
          ["Omar and I: we", "We read together."],
        ],
      },
      {
        icon: "👧",
        title: "هو، هي وشيء واحد",
        note: "He لولد أو رجل. She لبنت أو امرأة. It لشيء واحد، أو لحيوان لما ما نحددش ذكر أو أنثى.",
        samples: [
          ["Haya: she", "She reads a story."],
          ["The clock: it", "It is on the wall."],
        ],
      },
      {
        icon: "👥",
        title: "هم",
        note: "They لأكتر من شخص أو شيء، سواء بنحكي عن أصحابنا أو عن كتبنا.",
        samples: [
          ["Omar and Haya: they", "They like art."],
          ["The pencils: they", "They are on the desk."],
        ],
      },
      {
        icon: "🎁",
        title: "لما الفعل يقع على حد",
        note: "الفاعل بيعمل الفعل. بعد أفعال زي help وsee نقدر نستعمل me، you، him، her، it، us، them.",
        samples: [
          ["I → me", "Omar helps me."],
          ["she → her", "We see her in class."],
        ],
      },
    ],
  },
  {
    id: "present",
    page: 15,
    icon: "⏰",
    title: "المضارع البسيط",
    english: "Present simple",
    description: "احكِ عن حاجة بتحصل كل يوم، واسأل عنها بـ Do أو Does.",
    scene: "📅 Every day|🍳 Breakfast|🏫 School",
    steps: [
      {
        icon: "📅",
        title: "حاجة بتتكرر",
        note: "نستخدمه مع العادات، والحقائق، والمواعيد الثابتة. كلمات زي every day وon Mondays بتساعدنا نعرف إنه روتين.",
        samples: [
          ["Every day", "I pack my bag every day."],
          ["A timetable", "School starts at eight."],
        ],
      },
      {
        icon: "🧩",
        title: "نضيف إيه للفعل؟",
        note: "مع I, you, we, they نستخدم الفعل زي ما هو. مع he, she, it غالبًا نضيف s. جرّب es في wash أو go. لو قبل y حرف ساكن، زي study، تبقى ies.",
        samples: [
          ["I play / She plays", "She plays after school."],
          ["wash → washes", "Omar washes his hands."],
          ["study → studies", "Haya studies English."],
          ["have → has", "Ali has a lunch box."],
        ],
      },
      {
        icon: "🛑",
        title: "النفي",
        note: "استعمل don’t مع I, you, we, they. واستعمل doesn’t مع he, she, it. بعدهم الفعل يرجع لشكله الأصلي.",
        samples: [
          ["don’t + play", "We don’t play at night."],
          ["doesn’t + go", "She doesn’t go by bus."],
        ],
      },
      {
        icon: "❓",
        title: "السؤال والإجابة القصيرة",
        note: "نبدأ بـ Do أو Does، وبعدين الفاعل والفعل من غير s. نقدر نحط Where أو When قبلهم.",
        samples: [
          ["Do you + read?", "Yes, I do."],
          ["Does she + walk?", "No, she doesn’t."],
          ["Where does + he + eat?", "He eats at home."],
        ],
      },
      {
        icon: "💬",
        title: "لو الفعل am أو is أو are",
        note: "نقول I am وhe/she/it is وyou/we/they are. في السؤال، نبدأ بـ am أو is أو are. في النفي نضيف not.",
        samples: [
          ["I am ready.", "I am not ready."],
          ["She is in class.", "Is she in class?"],
          ["They are here.", "Are they here?"],
        ],
      },
    ],
  },
  {
    id: "past",
    page: 21,
    icon: "🗓️",
    title: "الماضي البسيط",
    english: "Past simple",
    description: "احكِ عن حاجة حصلت وخلصت، زي اللي عملته إمبارح.",
    scene: "🗓️ Yesterday|📚 Library|🏠 Back home",
    steps: [
      {
        icon: "🗓️",
        title: "إمبارح أو الأسبوع اللي فات",
        note: "الماضي البسيط يحكي عن حاجة حصلت وانتهت. دور على كلمات زي yesterday وlast week.",
        samples: [
          ["Yesterday", "We painted a picture yesterday."],
          ["Last week", "I visited the library last week."],
        ],
      },
      {
        icon: "🧱",
        title: "الأفعال المنتظمة",
        note: "غالبًا نضيف ed. لو الفعل آخره e نضيف d بس. لو آخره حرف ساكن وبعدين y، زي study، تبقى ied.",
        samples: [
          ["play → played", "We played outside."],
          ["like → liked", "I liked the story."],
          ["study → studied", "Haya studied English."],
        ],
      },
      {
        icon: "🃏",
        title: "أفعال بتتغيّر",
        note: "في أفعال بنتعلم شكلها في الماضي زي كلمة جديدة. قولهم بصوتك وحاول تفتكر كل زوج.",
        samples: [
          ["go → went", "I went to school."],
          ["eat → ate", "She ate toast."],
          ["have → had", "We had lunch."],
          ["see → saw", "He saw his friend."],
        ],
      },
      {
        icon: "❓",
        title: "النفي والسؤال بـ Did",
        note: "نستعمل didn’t للنفي وDid للسؤال. بعدهم نستخدم الفعل الأصلي. نجاوب بـ Yes, I did. أو No, I didn’t.",
        samples: [
          ["didn’t + play", "I didn’t play yesterday."],
          ["Did + you + go?", "Did you go to the library?"],
        ],
      },
      {
        icon: "💬",
        title: "Was وWere",
        note: "مع I, he, she, it نقول was. ومع you, we, they نقول were. للسؤال نبدأ بـ Was أو Were، وللنفي نضيف not.",
        samples: [
          ["I was at school.", "Was she there?"],
          ["They were at the gym.", "They were not late."],
        ],
      },
    ],
  },
] as const;
