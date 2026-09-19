import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/server/store.mjs";

const password = "Safe-password-123";
const allCorrect = {
  q1: "macro", q2: "protein", q3: "fat", q4: "D", q5: "oxygen",
  q6: "bowel", q7: "الجلوكوز", q8: "الماء", q9: "الفيتامينات", q10: "الكالسيوم",
};
const DEFAULT = {
  base: "base-2", hair: "hair-short", outfit: "outfit-casual",
  accessory: "acc-none", frame: "frame-violet",
};

function setup() {
  const clock = Date.parse("2026-09-19T06:00:00Z");
  const store = createStore(":memory:", { now: () => clock });
  const parent = store.registerFamily({
    name: "ولي الأمر",
    email: "shop@example.test",
    password,
    children: [
      { name: "هنا", username: "hana-shop", pin: "12345678", grade: 8, gender: "female" },
    ],
  });
  const kid = store.loginChild("hana-shop", "12345678");
  return { store, parent, kid };
}

test("coins buy an item once; the balance drops but XP does not", () => {
  const { store, kid } = setup();
  try {
    assert.throws(() => store.buyItem(kid.id, "outfit-lab-coat"), /لا تكفي/);
    store.submit(kid.id, { id: "attempt-shop-00001", answers: allCorrect });
    const before = store.snapshot(kid.id).rewards;
    assert.equal(before.coins, 120);
    const after = store.buyItem(kid.id, "outfit-lab-coat");
    assert.equal(after.balance, 0);
    assert.equal(after.items.find((i) => i.id === "outfit-lab-coat").owned, true);
    const r = store.snapshot(kid.id).rewards;
    assert.deepEqual([r.coins, r.coinsEarned, r.coinsSpent, r.xp], [0, 120, 120, before.xp]);
    assert.equal(r.title, before.title);
    assert.throws(() => store.buyItem(kid.id, "outfit-lab-coat"), (e) => e.status === 409);
    assert.throws(() => store.buyItem(kid.id, "acc-glasses"), /لا تكفي/);
    assert.throws(() => store.buyItem(kid.id, "nope"), /غير متاح للشراء/);
  } finally {
    store.close();
  }
});

test("earned items unlock by mastery and level, cannot be bought, and can be worn", () => {
  const { store, kid } = setup();
  try {
    let shop = store.shop(kid.id);
    const owned = (id) => shop.items.find((i) => i.id === id).owned;
    assert.deepEqual(shop.avatar, DEFAULT);
    assert.equal(owned("hijab-violet"), true);
    assert.equal(owned("outfit-nutrition"), false);
    assert.equal(owned("acc-goggles"), false);
    store.submit(kid.id, { id: "attempt-shop-00002", answers: allCorrect });
    shop = store.shop(kid.id);
    assert.equal(owned("outfit-nutrition"), true);
    assert.equal(owned("acc-goggles"), true);
    assert.equal(owned("frame-streak"), false);
    assert.throws(() => store.buyItem(kid.id, "acc-goggles"), /غير متاح للشراء/);
    const worn = {
      base: "base-3", hair: "hijab-violet", outfit: "outfit-nutrition",
      accessory: "acc-goggles", frame: "frame-violet",
    };
    assert.deepEqual(store.saveAvatar(kid.id, worn).avatar, worn);
    assert.deepEqual(store.shop(kid.id).avatar, worn);
    for (const bad of [
      { ...worn, outfit: "outfit-doctor" },
      { ...worn, frame: "frame-streak" },
      { ...worn, hair: "outfit-casual" },
      "nope",
    ])
      assert.throws(() => store.saveAvatar(kid.id, bad), /تملكينها/);
  } finally {
    store.close();
  }
});

test("parents see the child's avatar and cannot shop", () => {
  const { store, parent, kid } = setup();
  try {
    store.saveAvatar(kid.id, { ...DEFAULT, hair: "hair-curly", base: "base-1" });
    const child = store.snapshot(parent.id).children[0];
    assert.equal(child.avatar.hair, "hair-curly");
    assert.equal(store.snapshot(kid.id).avatar.base, "base-1");
    assert.throws(() => store.shop(parent.id), (e) => e.status === 403);
    assert.throws(() => store.buyItem(parent.id, "acc-glasses"), (e) => e.status === 403);
    assert.throws(() => store.saveAvatar(parent.id, DEFAULT), (e) => e.status === 403);
  } finally {
    store.close();
  }
});

test("deleting a family removes its purchases and avatars", () => {
  const { store, parent, kid } = setup();
  try {
    store.registerParent({ name: "إدارة", email: "admin-shop@example.test", password });
    const admin = store.promoteAdmin("admin-shop@example.test");
    store.submit(kid.id, { id: "attempt-shop-00003", answers: allCorrect });
    store.buyItem(kid.id, "outfit-lab-coat");
    store.saveAvatar(kid.id, { ...DEFAULT, outfit: "outfit-lab-coat" });
    store.deleteFamily(admin.id, { parentId: parent.id, confirmEmail: "shop@example.test" });
    assert.throws(() => store.snapshot(kid.id), (e) => e.status === 401);
  } finally {
    store.close();
  }
});
