import {
  placementItems,
  placementSurfaces,
  placementTargets,
} from "../content/english-placement.mjs";

// A slash groups words that belong on one tile. Each bank follows the lesson theme.
const banks = [
  [
    "I / wake up / early.",
    "Omar / packs / his bag.",
    "We / go / to school.",
    "I / eat / my breakfast.",
    "Haya / walks / to class.",
    "The bell / rings / at eight.",
  ],
  [
    "I / brush / my teeth.",
    "Haya / combs / her hair.",
    "Omar / washes / his face.",
    "We / wear / our uniforms.",
    "I / get dressed / before breakfast.",
    "She / puts on / her shoes.",
  ],
  [
    "I / eat toast / at seven.",
    "Omar / drinks milk / at breakfast.",
    "We / have lunch / at noon.",
    "Haya / eats dinner / at six.",
    "The clock / shows / eight.",
    "My cup / is / on the table.",
  ],
  [
    "We / learn science / in the lab.",
    "Omar / plays football / in the gym.",
    "Haya / reads / in the library.",
    "Our teacher / writes / on the board.",
    "We / count numbers / in maths.",
    "I / draw / in art class.",
  ],
  [
    "When / do you / go to school?",
    "Where / is / the library?",
    "What / do you / eat for lunch?",
    "Who / is / your teacher?",
    "What / is / your name?",
    "Where / do you / play football?",
  ],
  [
    "This / pencil / is near me.",
    "Those / books / are far away.",
    "These / rulers / are on my desk.",
    "That / bag / is near the door.",
    "The book / is / under the table.",
    "My pen / is / beside my bag.",
  ],
  [
    "I / listen / to the teacher.",
    "The bell / rings / at school.",
    "We / hear / the music.",
    "Omar / listens / to a story.",
    "Haya / speaks / in class.",
    "I / hear / the first sound.",
  ],
  [
    "The sheep / is / on the grass.",
    "My shoe / is / black.",
    "Fresh bread / is / on the plate.",
    "The ship / is / on the sea.",
    "I / see / a blue block.",
    "We / brush / our teeth.",
  ],
  [
    "These / shoes / are red.",
    "My toothbrush / is / blue.",
    "The blue comb / is / on the shelf.",
    "I / dry my hands / with a towel.",
    "I / have / white socks.",
    "The pencil / is / in my bag.",
  ],
  [
    "I / pack / my schoolbag.",
    "We / eat fruit / at lunch.",
    "Haya / opens / her notebook.",
    "The ruler / is / on the desk.",
    "Omar / reads / a storybook.",
    "I / drink / a cup of milk.",
  ],
  [
    "Haya / wakes up / early.",
    "She / eats toast / at breakfast.",
    "Haya / puts on / her uniform.",
    "She / walks / to school.",
    "Haya / reads / a book.",
    "She / plays / with her friends.",
  ],
  [
    "Ali / walks / to school.",
    "He / carries / a blue bag.",
    "His friends / play / at break.",
    "Ali / reads / in the library.",
    "He / eats / an apple.",
    "We / go home / together.",
  ],
  [
    "I / have / two apples.",
    "There are / three books / on the shelf.",
    "The children / play / in the park.",
    "I / see / two buses.",
    "Two blue boxes / are / on the desk.",
    "The boy / carries / one pencil.",
  ],
  [
    "She / reads / a story.",
    "He / plays / in the park.",
    "They / carry / their bags.",
    "We / listen / to our teacher.",
    "It / is / on the wall.",
    "Omar / helps / me.",
    "We / see / her in class.",
  ],
  [
    "She / walks / to school.",
    "I / read / after class.",
    "He / studies / English.",
    "We / play football / every day.",
    "Haya / washes / her hands.",
    "Omar / watches / a film on Fridays.",
    "She / does not / ride a bike.",
    "They / do not / eat at school.",
    "The bell / rings / at eight.",
    "I / carry / my bag.",
    "He / goes / by bus.",
    "My brother / likes / art.",
    "We / have lunch / at noon.",
    "Omar / helps / his cousin.",
    "She / brushes / her teeth.",
    "The class / starts / on time.",
    "You / study / with your friend.",
    "The dog / sits / near the door.",
    "Dana / finishes / her homework.",
    "Ali / drinks water / at lunch.",
  ],
  [
    "I / wake up / at six.",
    "We / play football / on Monday.",
    "Class / starts / at eight.",
    "Haya / visits her cousin / on Friday.",
    "Omar / eats lunch / at noon.",
    "We / go to the park / on Sunday.",
  ],
  [
    "I / like / English.",
    "Omar / plays / football.",
    "Where / is / your schoolbag?",
    "Haya / studies / maths.",
    "Who / opens / the door?",
    "We / read / on Monday.",
  ],
  [
    "I / carry / my books.",
    "Omar / writes / in his notebook.",
    "My sister / likes / music.",
    "We / draw / a picture.",
    "The piano / is / in the room.",
    "I / ride / my bike.",
  ],
  [
    "I / have breakfast / at home.",
    "I / go to school / by bus.",
    "We / learn / in class.",
    "I / eat fruit / at break.",
    "I / play / after school.",
    "I / do homework / at night.",
  ],
  [
    "My school / starts / at eight.",
    "I / get up / early.",
    "Haya / plays / with her friends.",
    "We / read / at the library.",
    "Omar / eats breakfast / at home.",
    "They / go to school / on Monday.",
  ],
  [
    "We / painted / a picture yesterday.",
    "Omar / walked / to school yesterday.",
    "I / ate / toast this morning.",
    "Haya / read / a book yesterday.",
    "We / went / to the park yesterday.",
    "They / played / at break yesterday.",
    "My teacher / visited / the library yesterday.",
  ],
];

const focus = [
  "🏫 School",
  "🪥 Routine",
  "⏰ Time",
  "🔬 Science",
  "❓ Question",
  "✏️ Distance",
  "🎧 Listen",
  "🔤 Sounds",
  "📝 Spelling",
  "🧩 Words",
  "📖 Story",
  "📚 Reading",
  "🍎 Count",
  "👥 Pronouns",
  "📅 Every day",
  "🕒 Time",
  "🔠 Punctuation",
  "🧩 Sentence",
  "📅 My day",
  "🏫 School",
  "📅 Yesterday",
];

const targetedFixes = {
  13: [
    [
      "I have two",
      "apple",
      "apples",
      ".",
      "كلمة two بتقول إن العدد أكتر من واحد. اختار الجمع.",
    ],
    [
      "There are three",
      "book",
      "books",
      "on the shelf.",
      "بص على العدد three. محتاج اسم جمع.",
    ],
    [
      "The",
      "childs",
      "children",
      "play in the park.",
      "جمع child له شكل خاص من غير s في الآخر.",
    ],
  ],
  14: [
    [
      "Haya is my friend.",
      "He",
      "She",
      "reads with me.",
      "الضمير هنا راجع لهيا. مين اللي بيقرأ؟",
    ],
    [
      "Omar and Ali are in class.",
      "He",
      "They",
      "read together.",
      "الجملة بتتكلم عن شخصين مع بعض.",
    ],
    [
      "My friends help",
      "I",
      "me",
      "in class.",
      "اختار ضمير الشخص اللي بياخد المساعدة بعد help.",
    ],
  ],
  15: [
    [
      "She",
      "walk",
      "walks",
      "to school.",
      "مع she في المضارع البسيط، بص على آخر الفعل.",
    ],
    [
      "We",
      "plays",
      "play",
      "after school.",
      "مع we، الفعل في المضارع البسيط بييجي من غير s.",
    ],
    [
      "Omar",
      "wash",
      "washes",
      "his hands.",
      "مع Omar، الفعل اللي آخره sh له نهاية خاصة.",
    ],
    [
      "Haya",
      "study",
      "studies",
      "English.",
      "study آخرها حرف ساكن وبعده y. بص على شكل النهاية مع Haya.",
    ],
    [
      "She does not",
      "goes",
      "go",
      "by bus.",
      "بعد does not، رجّع الفعل لشكله الأصلي.",
    ],
    [
      "They",
      "does",
      "do",
      "not play at night.",
      "اختار الكلمة اللي بتناسب الضمير they.",
    ],
    [
      "Does Ali",
      "likes",
      "like",
      "art?",
      "السؤال بدأ بـ Does. الفعل اللي بعد الفاعل يرجع لشكله الأصلي.",
    ],
    [
      "The bell",
      "ring",
      "rings",
      "at eight.",
      "الجرس شيء واحد. بص على نهاية الفعل.",
    ],
    [
      "My brother",
      "have",
      "has",
      "a blue bag.",
      "have ليها شكل مختلف مع he أو اسم ولد واحد.",
    ],
    [
      "You",
      "reads",
      "read",
      "after class.",
      "مع you، الفعل في المضارع البسيط بييجي من غير s.",
    ],
  ],
  16: [
    [
      "School starts",
      "on",
      "at",
      "eight.",
      "eight هنا ساعة محددة. اختار اللي بنستخدمه مع الساعة.",
    ],
    [
      "We play football",
      "at",
      "on",
      "Monday.",
      "Monday اسم يوم. اختار اللي بنستخدمه مع أيام الأسبوع.",
    ],
    [
      "I have lunch",
      "on",
      "at",
      "noon.",
      "noon وقت في اليوم. فكّر في الكلمة اللي قبل الساعة.",
    ],
  ],
  21: [
    [
      "Omar",
      "walks",
      "walked",
      "to school yesterday.",
      "yesterday بتقول إمبارح. اختار فعل الماضي.",
    ],
    [
      "We",
      "paint",
      "painted",
      "a picture yesterday.",
      "بص على نهاية الفعل اللي بيحكي عن حاجة حصلت في الماضي.",
    ],
    ["I", "eat", "ate", "toast yesterday.", "الفعل eat بيتغير شكله في الماضي."],
    [
      "Haya",
      "goes",
      "went",
      "to the library yesterday.",
      "go في الماضي له شكل مختلف.",
    ],
    [
      "They",
      "play",
      "played",
      "in the park yesterday.",
      "الكلمة yesterday بتحدد إن الحدث حصل في الماضي.",
    ],
  ],
};

const placementKeys = Object.keys(placementTargets);
const itemKeys = Object.keys(placementItems);
const surfaceKeys = Object.keys(placementSurfaces);

function orderQuestion(sentence, index) {
  const ordered = sentence.split(" / ");
  const permutation = index % 2 ? [2, 0, 1] : [1, 2, 0];
  return {
    kind: "order",
    prompt: "Put the words in order.",
    scene: "🧩 Order|💬 Sentence",
    order: permutation.map((position) => ordered[position]),
    answer: permutation
      .map((_, position) => permutation.indexOf(position))
      .join(","),
  };
}

function fixQuestion(sentence, index, page) {
  const targeted = targetedFixes[page]?.[index];
  if (targeted) {
    const [before, wrong, correct, after, hint] = targeted;
    const choices = index % 2 ? [correct, wrong] : [wrong, correct];
    return {
      kind: "fix",
      prompt: "Fix the sentence.",
      scene: `${focus[page - 1]}|✍️ Fix`,
      fix: [
        { text: before },
        { choices, start: choices.indexOf(wrong) },
        { text: after },
      ],
      answer: String(choices.indexOf(correct)),
      hint,
    };
  }
  const line = sentence.replaceAll(" / ", " ");
  const [, beginning, body, punctuation] = line.match(/^(\S+) (.+)([.!?])$/);
  const lower = beginning.toLowerCase();
  const parts = [
    {
      choices: index % 2 ? [lower, beginning] : [beginning, lower],
      start: index % 2 ? 0 : 1,
    },
    { text: body },
    { choices: [".", "?", "!"], start: punctuation === "?" ? 0 : 1 },
  ];
  return {
    kind: "fix",
    prompt: "Fix the sentence.",
    scene: "🔠 Capital|✍️ Punctuation",
    fix: parts,
    answer: `${parts[0].choices.indexOf(beginning)},${parts[2].choices.indexOf(punctuation)}`,
  };
}

function placeQuestion(page, index) {
  const item = itemKeys[(page * 2 + index) % itemKeys.length];
  const surface =
    surfaceKeys[
      (page + Math.floor(index / placementKeys.length)) % surfaceKeys.length
    ];
  const answer = placementKeys[(page + index) % placementKeys.length];
  const target = placementTargets[answer];
  return {
    kind: "place",
    prompt: `Put the ${item} ${target.phrase} the ${surface}.`,
    scene: `${placementItems[item].icon} ${item}|${placementSurfaces[surface].icon} ${surface}`,
    place: { item, surface },
    answer,
  };
}

export function expandEnglishLessons(lessons) {
  return lessons.map((lesson, index) => {
    const page = index + 1;
    const bank = banks[index];
    const questions = [];
    for (let offset = 0; offset < lesson.questions.length; offset += 10) {
      const batch = lesson.questions.slice(offset, offset + 10);
      questions.push(...batch);
      batch.forEach((_, step) => {
        const position = offset + step;
        const turn = Math.floor(position / 3);
        const type = position % 3;
        const sentence = bank[(type === 1 ? turn + 2 : turn) % bank.length];
        const item =
          type === 0
            ? orderQuestion(sentence, turn)
            : type === 1
              ? fixQuestion(sentence, turn, page)
              : placeQuestion(page, turn);
        if (type === 0) item.scene = `${focus[index]}|${item.scene}`;
        questions.push({ ...item, id: `${page}-play-${position + 1}` });
      });
    }
    return { ...lesson, questions };
  });
}

export function interactiveAudioClip(q) {
  if (q.kind === "order" || q.kind === "fix") return `play-${q.kind}-prompt`;
  if (q.kind === "place")
    return `play-place-${q.place.item}-${q.answer}-${q.place.surface}`;
  return undefined;
}

export function interactiveAnswer(q, answer) {
  if (q.kind === "place") return Object.hasOwn(placementTargets, answer);
  const indices = answer.split(",");
  if (q.kind === "order") {
    return (
      indices.length === q.order.length &&
      new Set(indices).size === q.order.length &&
      indices.every(
        (index) => /^[0-9]$/.test(index) && Number(index) < q.order.length,
      )
    );
  }
  if (q.kind === "fix") {
    const edits = q.fix.filter((part) => part.choices);
    return (
      indices.length === edits.length &&
      indices.every(
        (index, i) =>
          /^[0-9]$/.test(index) && Number(index) < edits[i].choices.length,
      )
    );
  }
  return true;
}

export function displayInteractiveAnswer(q, answer) {
  const indices = answer.split(",").map(Number);
  if (q.kind === "order")
    return indices.map((index) => q.order[index]).join(" ");
  if (q.kind === "fix") {
    let edit = 0;
    return q.fix
      .map((part) => (part.choices ? part.choices[indices[edit++]] : part.text))
      .join(" ")
      .replace(/ (?=[.!?]$)/, "");
  }
  if (q.kind === "place")
    return `${placementItems[q.place.item].name} · ${placementTargets[answer].label} ${placementSurfaces[q.place.surface].name}`;
}

export function interactiveGrade(q, answer) {
  if (!["order", "fix", "place"].includes(q.kind)) return undefined;
  const correct = q.answer.split(",");
  const picked = answer.split(",");
  const matches = correct.filter((entry, i) => entry === picked[i]).length;
  let feedback = "إجابة صحيحة!";
  if (matches < correct.length) {
    if (q.kind === "order")
      feedback =
        "ابدأ بمين اللي بيعمل الفعل، وحطّ الجزء اللي فيه العلامة في الآخر.";
    if (q.kind === "fix")
      feedback =
        q.hint ??
        (correct[0] !== picked[0]
          ? "بص على أول حرف في أول كلمة. الجملة بتبدأ بحرف كبير."
          : "الجملة بتسأل سؤال ولا بتحكي معلومة؟ اختار علامة النهاية المناسبة.");
    if (q.kind === "place")
      feedback =
        "اسمع التعليمة تاني وركّز على كلمة المكان. المس الكلمة لو محتاج معناها.";
  }
  return {
    score: Math.round((100 * matches) / correct.length),
    source: "key",
    feedback,
  };
}
