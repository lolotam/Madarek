import test from "node:test";
import assert from "node:assert/strict";
import {
  SHOP_ITEMS,
  AVATAR_LAYERS,
  DEFAULT_AVATAR,
  shopItem,
  isUnlocked,
  isOwned,
  validateAvatar,
} from "../src/server/shop.mjs";
import { AVATAR_SLOTS, avatarSlot } from "../src/content/avatar-slots.ts";

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

test("every drawable item has a pending 512px layer slot; frames and 'no accessory' have none", () => {
  const drawable = SHOP_ITEMS.filter((i) => i.layer !== "frame" && i.id !== "acc-none")
    .map((i) => i.id)
    .sort();
  assert.deepEqual(AVATAR_SLOTS.map((s) => s.id).sort(), drawable);
  for (const slot of AVATAR_SLOTS) {
    assert.equal(slot.ready, false, slot.id);
    assert.equal(slot.path, `/images/avatar/${slot.id}.png`);
    assert.deepEqual([slot.width, slot.height], [512, 512]);
    assert.ok(slot.alt.length > 3 && slot.prompt.length > 80, slot.id);
  }
  assert.equal(avatarSlot("frame-violet"), undefined);
  assert.equal(avatarSlot("outfit-lab-coat").id, "outfit-lab-coat");
});
