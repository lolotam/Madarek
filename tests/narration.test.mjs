import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const segments = JSON.parse(
  readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "../src/server/narration/nutrients.json",
    ),
    "utf8",
  ),
);

const PARTS = new Set(["map", "explore", "practice", "quiz", "result"]);
const QUESTION_IDS = [
  "q1",
  "q2",
  "q3",
  "q4",
  "q5",
  "q6",
  "q7",
  "q8",
  "q9",
  "q10",
];
const REVIEW_IDS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"];

const REQUIRED_IDS = [
  "map.intro",
  "map.definition",
  "map.groups",
  "map.carbs",
  "map.protein",
  "map.fat",
  "map.water",
  "map.vitamins",
  "map.minerals",
  "explore.intro",
  "explore.oats",
  "explore.lentils",
  "explore.oil",
  "explore.milk",
  "explore.energy.0",
  "explore.energy.1",
  "explore.energy.2",
  "explore.repair.0",
  "explore.repair.1",
  "explore.repair.2",
  "explore.fiber",
  "practice.choice",
  "practice.reason",
  "summary",
  "quiz.intro",
  ...QUESTION_IDS.map((id) => `quiz.${id}`),
  "result.intro",
  ...Array.from({ length: 11 }, (_, n) => `result.score.${n}`),
  "result.correct",
  "result.answer-is",
  ...QUESTION_IDS.map((id) => `result.answer.${id}`),
  ...QUESTION_IDS.map((id) => `result.explanation.${id}`),
  ...REVIEW_IDS.map((id) => `result.review.${id}`),
];

const PROTECTED_IDS = new Set([
  ...QUESTION_IDS.map((id) => `result.answer.${id}`),
  ...QUESTION_IDS.map((id) => `result.explanation.${id}`),
  ...REVIEW_IDS.map((id) => `result.review.${id}`),
]);

function nthIndex(text, phrase, occurrence) {
  let pos = -1;
  for (let i = 0; i < occurrence; i += 1) {
    pos = text.indexOf(phrase, pos + 1);
    if (pos === -1) return -1;
  }
  return pos;
}

function countOccurrences(text, phrase) {
  let count = 0;
  let pos = 0;
  while (phrase) {
    const found = text.indexOf(phrase, pos);
    if (found === -1) break;
    count += 1;
    pos = found + 1;
  }
  return count;
}

test("nutrients narration scripts match the contract", () => {
  assert.ok(Array.isArray(segments));
  assert.equal(segments.length, REQUIRED_IDS.length);

  const ids = segments.map((segment) => segment.id);
  const orders = segments.map((segment) => segment.order);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(orders).size, orders.length);

  const missing = REQUIRED_IDS.filter((id) => !ids.includes(id));
  assert.deepEqual(missing, []);

  const latinOrDigit = /[A-Za-z0-9]/;
  const asciiId = /^[A-Za-z0-9._-]+$/;
  let totalCharacters = 0;

  for (const segment of segments) {
    assert.match(segment.id, asciiId, segment.id);
    assert.equal(segment.page, "nutrients", segment.id);
    assert.ok(PARTS.has(segment.part), `${segment.id} part ${segment.part}`);
    assert.equal(typeof segment.order, "number", segment.id);
    assert.ok(
      Number.isInteger(segment.version) && segment.version > 0,
      segment.id,
    );
    assert.equal(typeof segment.text, "string", segment.id);
    assert.ok(Array.isArray(segment.cues), segment.id);
    assert.equal(
      latinOrDigit.test(segment.text),
      false,
      `${segment.id} has Latin letters or digits`,
    );
    totalCharacters += segment.text.length;

    if (PROTECTED_IDS.has(segment.id)) {
      assert.equal(segment.protected, "answer", segment.id);
    } else {
      assert.equal(segment.protected, undefined, segment.id);
    }

    let lastPos = -1;
    for (const cue of segment.cues) {
      assert.equal(typeof cue.phrase, "string", segment.id);
      assert.ok(cue.phrase.length > 0, `${segment.id} empty cue phrase`);
      assert.equal(typeof cue.target, "string", segment.id);
      const occurrence = cue.occurrence ?? 1;
      assert.ok(
        Number.isInteger(occurrence) && occurrence >= 1,
        `${segment.id} occurrence`,
      );
      const found = countOccurrences(segment.text, cue.phrase);
      assert.ok(
        found >= occurrence,
        `${segment.id} phrase ${JSON.stringify(cue.phrase)} occurs ${found}, need ${occurrence}`,
      );
      const pos = nthIndex(segment.text, cue.phrase, occurrence);
      assert.ok(
        pos >= lastPos,
        `${segment.id} cues are not ordered by position`,
      );
      lastPos = pos;
    }
  }

  console.log("narration character count:", totalCharacters);
});
