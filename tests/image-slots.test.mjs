import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { GRADE_8_SUBJECTS } from "../src/content/catalog.ts";
import {
  IMAGE_SLOTS,
  getImageSlot,
  lessonVisual,
  subjectVisual,
  lifeHeaderVisual,
} from "../src/content/image-slots.ts";

function publicFile(slotPath) {
  return join(process.cwd(), "public", ...slotPath.replace(/^\//, "").split("/"));
}

const CURRICULUM_IDS = [
  "nutrients",
  "balanced-diet",
  "digestive-structure",
  "digestive-accessories",
  "digestion",
  "life-header",
];

test("every Task C image is a ready slot with a file on disk", () => {
  const ids = IMAGE_SLOTS.map((slot) => slot.id);
  for (const id of CURRICULUM_IDS) {
    assert.equal(ids.includes(id), true, `missing curriculum slot ${id}`);
  }
  for (const subject of GRADE_8_SUBJECTS) {
    assert.equal(ids.includes(subject.id), true, `missing subject slot ${subject.id}`);
  }
  assert.equal(IMAGE_SLOTS.length, CURRICULUM_IDS.length + GRADE_8_SUBJECTS.length);
  assert.equal(
    IMAGE_SLOTS.every((slot) => slot.ready === true),
    true,
    "every curriculum and subject slot is ready",
  );
  for (const slot of IMAGE_SLOTS) {
    assert.equal(existsSync(publicFile(slot.path)), true, slot.path);
  }
});

test("slot records carry dimensions, Arabic alt, usage, and textbook-path prompts", () => {
  const arabic = /[\u0600-\u06FF]/;
  for (const slot of IMAGE_SLOTS) {
    assert.equal(typeof slot.path, "string");
    assert.equal(slot.path.startsWith("/images/"), true, slot.id);
    assert.equal(slot.path.endsWith(".png"), true, slot.id);
    assert.equal(slot.width > 0 && slot.height > 0, true, slot.id);
    assert.match(slot.alt, arabic, slot.id);
    assert.equal(/Task C|placeholder|pending|generated/i.test(slot.alt), false, slot.id);
    assert.equal(slot.usage.length > 8, true, slot.id);
    assert.match(slot.prompt, /GRADE-8\//, slot.id);
    assert.equal(slot.prompt.includes("No text"), true, slot.id);
  }
});

test("curriculum slots live under /images/curriculum and subjects under /images/subjects", () => {
  for (const id of CURRICULUM_IDS) {
    const slot = getImageSlot(id);
    assert.equal(slot.path, `/images/curriculum/${id}.png`);
  }
  for (const subject of GRADE_8_SUBJECTS) {
    const slot = getImageSlot(subject.id);
    assert.equal(slot.path, `/images/subjects/${subject.id}.png`);
  }
  assert.equal(getImageSlot("nutrients").width, 800);
  assert.equal(getImageSlot("nutrients").height, 800);
  assert.equal(getImageSlot("life-header").width, 1600);
  assert.equal(getImageSlot("life-header").height, 400);
});

test("visual lookup is keyed by lesson id and keeps the life header separate", () => {
  assert.equal(lessonVisual("nutrients")?.id, "nutrients");
  assert.equal(lessonVisual("balanced-diet")?.id, "balanced-diet");
  assert.equal(lessonVisual("digestive-structure")?.id, "digestive-structure");
  assert.equal(lessonVisual("digestive-accessories")?.id, "digestive-accessories");
  assert.equal(lessonVisual("digestion")?.id, "digestion");
  assert.equal(lessonVisual("respiration"), undefined);
  assert.equal(lessonVisual("life-header"), undefined);
  assert.equal(lifeHeaderVisual().id, "life-header");
  assert.equal(subjectVisual("science")?.path, "/images/subjects/science.png");
  assert.equal(subjectVisual("home-economics")?.id, "home-economics");
  assert.equal(subjectVisual("unknown"), undefined);
});

test("generation prompts name the orchestrator-verified textbook pages", () => {
  assert.match(
    getImageSlot("nutrients").prompt,
    /GRADE-8\/FIRST-TERM\/SCIENCE\/علوم\/علوم-24\.jpg/,
  );
  assert.match(
    getImageSlot("balanced-diet").prompt,
    /GRADE-8\/FIRST-TERM\/SCIENCE\/علوم\/علوم-29\.jpg/,
  );
  assert.match(
    getImageSlot("digestive-structure").prompt,
    /GRADE-8\/FIRST-TERM\/SCIENCE\/علوم\/علوم-38\.jpg/,
  );
  assert.match(
    getImageSlot("digestive-accessories").prompt,
    /GRADE-8\/FIRST-TERM\/SCIENCE\/علوم\/علوم-43\.jpg/,
  );
  assert.match(
    getImageSlot("digestion").prompt,
    /GRADE-8\/FIRST-TERM\/SCIENCE\/علوم\/علوم-48\.jpg/,
  );
  const header = getImageSlot("life-header").prompt;
  assert.match(header, /علوم-29\.jpg/);
  assert.match(header, /علوم-38\.jpg/);
  assert.match(header, /علوم-43\.jpg/);
  assert.match(header, /LEFT 55%/);
  assert.equal(getImageSlot("home-economics").prompt.includes("ECONMIC"), true);
});
