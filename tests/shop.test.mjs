import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  SHOP_ITEMS,
  AVATAR_LAYERS,
  DEFAULT_AVATAR,
  shopItem,
  isUnlocked,
  isOwned,
  validateAvatar,
} from "../src/server/shop.mjs";
import {
  AVATAR_SLOTS,
  BADGE_ACCESSORIES,
  BADGE_SLOTS,
  BASES,
  HAIRS,
  LOOK_SLOTS,
  OUTFITS,
  badgeSlot,
  lookSlot,
} from "../src/content/avatar-slots.ts";

function publicFile(slotPath) {
  return join(process.cwd(), "public", ...slotPath.replace(/^\//, "").split("/"));
}

const fresh = { level: 1, bestStreak: 0, masteredLessons: [] };
const strong = { level: 3, bestStreak: 7, masteredLessons: ["nutrients"] };

test("catalogue ids are unique and every layer has a free default", () => {
  const ids = SHOP_ITEMS.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(AVATAR_LAYERS, ["base", "hair", "outfit", "accessory", "frame"]);
  for (const layer of AVATAR_LAYERS) {
    const item = shopItem(DEFAULT_AVATAR[layer]);
    assert.equal(item.layer, layer);
    assert.equal(item.price, 0);
    assert.equal(item.unlock, undefined);
  }
  assert.ok(SHOP_ITEMS.every((i) => Number.isInteger(i.price) && i.price >= 0));
  assert.ok(SHOP_ITEMS.every((i) => !(i.price > 0 && i.unlock)));
  assert.equal(shopItem("nope"), null);
});

test("earned items unlock from mastery, level and best streak", () => {
  assert.equal(isUnlocked(shopItem("outfit-nutrition"), fresh), false);
  assert.equal(isUnlocked(shopItem("outfit-nutrition"), strong), true);
  assert.equal(isUnlocked(shopItem("acc-goggles"), { ...fresh, level: 2 }), false);
  assert.equal(isUnlocked(shopItem("acc-goggles"), { ...fresh, level: 3 }), true);
  assert.equal(isUnlocked(shopItem("frame-streak"), { ...fresh, bestStreak: 6 }), false);
  assert.equal(isUnlocked(shopItem("frame-streak"), { ...fresh, bestStreak: 7 }), true);
  assert.equal(isUnlocked(shopItem("outfit-lab-coat"), fresh), true);
});

test("ownership: free items always, paid items only when bought, earned items when unlocked", () => {
  const none = new Set();
  assert.equal(isOwned(shopItem("hijab-violet"), none, fresh), true);
  assert.equal(isOwned(shopItem("outfit-lab-coat"), none, fresh), false);
  assert.equal(isOwned(shopItem("outfit-lab-coat"), new Set(["outfit-lab-coat"]), fresh), true);
  assert.equal(isOwned(shopItem("acc-goggles"), none, fresh), false);
  assert.equal(isOwned(shopItem("acc-goggles"), none, strong), true);
});

test("an avatar is valid only when every layer is an owned item of that layer", () => {
  const none = new Set();
  assert.deepEqual(validateAvatar(DEFAULT_AVATAR, none, fresh), DEFAULT_AVATAR);
  assert.equal(validateAvatar({ ...DEFAULT_AVATAR, outfit: "outfit-doctor" }, none, fresh), null);
  assert.equal(validateAvatar({ ...DEFAULT_AVATAR, hair: "outfit-casual" }, none, fresh), null);
  assert.equal(validateAvatar({ ...DEFAULT_AVATAR, frame: undefined }, none, fresh), null);
  assert.equal(validateAvatar("nope", none, fresh), null);
  assert.equal(validateAvatar([], none, fresh), null);
  const extra = validateAvatar({ ...DEFAULT_AVATAR, sneaky: "x" }, none, fresh);
  assert.deepEqual(extra, DEFAULT_AVATAR);
  assert.deepEqual(
    validateAvatar({ ...DEFAULT_AVATAR, accessory: "acc-goggles" }, none, strong).accessory,
    "acc-goggles",
  );
});

test("every look and badge slot is ready with a file on disk", () => {
  assert.equal(BASES.length, 3);
  assert.equal(HAIRS.length, 7);
  assert.equal(OUTFITS.length, 6);
  assert.equal(LOOK_SLOTS.length, 126);
  assert.equal(BADGE_SLOTS.length, 4);
  assert.equal(AVATAR_SLOTS.length, 130);
  assert.deepEqual(
    [...BADGE_SLOTS.map((slot) => slot.id)],
    [...BADGE_ACCESSORIES],
  );

  const expectedLookIds = [];
  for (const base of BASES) {
    for (const hair of HAIRS) {
      for (const outfit of OUTFITS) {
        expectedLookIds.push(`look-${base}-${hair}-${outfit}`);
      }
    }
  }
  assert.deepEqual(
    LOOK_SLOTS.map((slot) => slot.id),
    expectedLookIds,
  );

  for (const slot of LOOK_SLOTS) {
    assert.equal(slot.ready, true, slot.id);
    assert.equal(slot.path, `/images/avatar/looks/${slot.id}.png`);
    assert.deepEqual([slot.width, slot.height], [448, 448]);
    assert.equal(slot.usage, "Avatar portrait");
    assert.ok(slot.alt.length > 3 && slot.prompt.length > 20, slot.id);
  }
  for (const slot of BADGE_SLOTS) {
    assert.equal(slot.ready, true, slot.id);
    assert.equal(slot.path, `/images/avatar/badges/${slot.id}.png`);
    assert.deepEqual([slot.width, slot.height], [192, 192]);
    assert.ok(slot.alt.length > 3 && slot.prompt.length > 20, slot.id);
  }
  assert.equal(
    AVATAR_SLOTS.every((slot) => slot.ready === true),
    true,
  );

  assert.equal(
    lookSlot("base-2", "hair-short", "outfit-casual")?.id,
    "look-base-2-hair-short-outfit-casual",
  );
  assert.equal(
    lookSlot("base-2", "hair-short", "outfit-casual")?.path,
    "/images/avatar/looks/look-base-2-hair-short-outfit-casual.png",
  );
  assert.equal(lookSlot("nope", "hair-short", "outfit-casual"), undefined);
  assert.equal(badgeSlot("acc-glasses")?.id, "acc-glasses");
  assert.equal(badgeSlot("acc-none"), undefined);
  assert.equal(badgeSlot("frame-violet"), undefined);

  if (!process.env.SKIP_IMAGE_FILES) {
    for (const slot of AVATAR_SLOTS) {
      assert.equal(existsSync(publicFile(slot.path)), true, slot.path);
    }
  }
});
