# Shop and Avatars (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let students spend the Madarek coins they earn from learning on a layered 2D avatar (skin, hair/hijab, outfit, accessory, card frame), unlock special items through achievements, and show that avatar on the student and parent dashboards.

**Architecture:** The catalogue and all ownership rules are pure functions in `src/server/shop.mjs`. `src/server/store.mjs` records purchases in a `purchases` table (spending never touches `reward_ledger`, so XP and titles never drop) and the worn avatar in `avatars`; the coin balance becomes earned − spent. Every avatar part is a transparent PNG layer registered as a pending image slot in `src/content/avatar-slots.ts` (`ready: false`) — the owner generates the art later with Codex Desktop. Until a layer's PNG exists the avatar falls back to the student's initial inside the chosen frame; frames are pure CSS. A new student-only `/shop` page hosts the avatar editor and shop.

**Tech Stack:** Next.js 16.3.5 App Router (server page + existing catch-all API), React 19, TypeScript, `node:sqlite`, `node:test`, Playwright, Radix Tabs, Framer Motion, lucide-react, plain CSS tokens in `src/app/globals.css`.

**Decisions (owner, 2026-09-19):** avatar art = image placeholders (no generation in this lane); scope = core shop + avatar. Companion robot, personal lab, discovery-card album and unit celebrations are Phase 2b. No real money. Prices are provisional constants in one file.

---

## Rules (the spec)

| Rule | Value |
|---|---|
| Layers | `base` (skin), `hair` (hair or hijab), `outfit`, `accessory`, `frame` — painted base → outfit → hair → accessory; frame is the ring around the avatar |
| Free items | 3 skin tones, 3 hair styles, 2 hijabs, casual outfit, "no accessory", violet frame |
| Bought items | Paid once with coins, owned forever; buying twice is refused (409); a purchase needs balance ≥ price and happens inside `BEGIN IMMEDIATE` |
| Earned items (price 0 + unlock) | `outfit-nutrition` — all Nutrients concepts secure; `acc-goggles` — level ≥ 3; `frame-streak` — best streak ≥ 7. They cannot be bought, only earned |
| Balance | `coins` in the rewards summary = earned − spent; `coinsEarned` / `coinsSpent` also returned; XP and titles unaffected |
| Default avatar | `base-2`, `hair-short`, `outfit-casual`, `acc-none`, `frame-violet` |
| Saving | Every layer must reference an item of that layer the student owns; otherwise 400 "اختاري عناصر تملكينها فقط." A previously saved item that is no longer owned falls back to the default for that layer |
| Who | Only students can shop or save; parents see the child's avatar read-only; family deletion removes purchases and avatars |

Catalogue (prices in coins):

| id | layer | Arabic name | price / unlock |
|---|---|---|---|
| base-1 / base-2 / base-3 | base | بشرة فاتحة / بشرة حنطية / بشرة سمراء | 0 |
| hair-short / hair-curly / hair-long | hair | شعر قصير / شعر مجعّد / شعر طويل | 0 |
| hijab-violet / hijab-azure | hair | حجاب بنفسجي / حجاب أزرق | 0 |
| hair-bun | hair | كعكة شعر | 60 |
| hijab-stars | hair | حجاب بنقشة نجوم | 60 |
| outfit-casual | outfit | ملابس يومية | 0 |
| outfit-lab-coat | outfit | معطف المختبر | 120 |
| outfit-doctor | outfit | زيّ الطبيب | 150 |
| outfit-explorer | outfit | زيّ المستكشف | 150 |
| outfit-astronaut | outfit | بدلة رائد الفضاء | 250 |
| outfit-nutrition | outfit | مريلة خبير التغذية | earned: mastery nutrients |
| acc-none | accessory | بلا إضافات | 0 |
| acc-glasses | accessory | نظارة | 60 |
| acc-headphones | accessory | سماعات | 70 |
| acc-backpack | accessory | حقيبة ظهر | 80 |
| acc-goggles | accessory | نظارة المختبر الواقية | earned: level 3 |
| frame-violet | frame | إطار بنفسجي | 0 |
| frame-azure / frame-amber | frame | إطار أزرق / إطار ذهبي | 40 |
| frame-rainbow | frame | إطار قوس قزح | 100 |
| frame-streak | frame | إطار شعلة الانتظام | earned: streak 7 |

For scale: one perfect Nutrients quiz on the first day pays 120 coins (10 daily + 5 section + 5 effort + 100 quiz).

## File map

- Create `src/server/shop.mjs` — catalogue, defaults, unlock/ownership/validation rules. Pure.
- Modify `src/server/store.mjs` — `purchases` + `avatars` tables; balance; `shop`, `buyItem`, `saveAvatar`; `avatar` in the student snapshot; family cleanup.
- Modify `src/app/api/[...action]/route.ts` — `GET shop`, `POST shop/buy`, `POST avatar`.
- Create `src/content/avatar-slots.ts` — 20 pending image slots, one per drawable item.
- Create `src/content/shop.ts` — layer order/labels, unlock hint text, frame class helper.
- Create `src/components/shop/types.ts`, `src/components/avatar/avatar.tsx`, `src/components/shop/shop.tsx`.
- Create `src/app/shop/page.tsx` — student-only server page.
- Modify `src/components/rewards/student-rewards.tsx`, `src/components/rewards/types.ts`, `src/components/dashboard.tsx` — avatar + shop link on the student hero; avatar in the parent's child panel.
- Modify `src/app/globals.css` — avatar, frames, shop styles.
- Create `tests/shop.test.mjs`, `tests/shop-store.test.mjs`, `tests/browser/shop.spec.ts`.
- Create `docs/delegation/2026-09-19-avatar-image-requests.md`; append to `docs/IMPLEMENTATION-STATUS.md`.

---

### Task 1: Pure shop rules

**Files:** Create `src/server/shop.mjs`, `tests/shop.test.mjs` (the avatar-slot assertion is added in Task 4).

- [ ] **Step 1: Write the failing tests** — `tests/shop.test.mjs`:

```js
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
```

- [ ] **Step 2: Run to verify failure** — `node --test tests/shop.test.mjs` → FAIL (module not found).

- [ ] **Step 3: Implement** — `src/server/shop.mjs`:

```js
// Shop catalogue and avatar rules. Prices are provisional, like rewards.mjs:
// tune them against real coin earnings, not before.

export const AVATAR_LAYERS = ["base", "hair", "outfit", "accessory", "frame"];

export const SHOP_ITEMS = [
  { id: "base-1", layer: "base", name: "بشرة فاتحة", price: 0 },
  { id: "base-2", layer: "base", name: "بشرة حنطية", price: 0 },
  { id: "base-3", layer: "base", name: "بشرة سمراء", price: 0 },
  { id: "hair-short", layer: "hair", name: "شعر قصير", price: 0 },
  { id: "hair-curly", layer: "hair", name: "شعر مجعّد", price: 0 },
  { id: "hair-long", layer: "hair", name: "شعر طويل", price: 0 },
  { id: "hijab-violet", layer: "hair", name: "حجاب بنفسجي", price: 0 },
  { id: "hijab-azure", layer: "hair", name: "حجاب أزرق", price: 0 },
  { id: "hair-bun", layer: "hair", name: "كعكة شعر", price: 60 },
  { id: "hijab-stars", layer: "hair", name: "حجاب بنقشة نجوم", price: 60 },
  { id: "outfit-casual", layer: "outfit", name: "ملابس يومية", price: 0 },
  { id: "outfit-lab-coat", layer: "outfit", name: "معطف المختبر", price: 120 },
  { id: "outfit-doctor", layer: "outfit", name: "زيّ الطبيب", price: 150 },
  { id: "outfit-explorer", layer: "outfit", name: "زيّ المستكشف", price: 150 },
  { id: "outfit-astronaut", layer: "outfit", name: "بدلة رائد الفضاء", price: 250 },
  {
    id: "outfit-nutrition",
    layer: "outfit",
    name: "مريلة خبير التغذية",
    price: 0,
    unlock: { type: "mastery", lessonId: "nutrients" },
  },
  { id: "acc-none", layer: "accessory", name: "بلا إضافات", price: 0 },
  { id: "acc-glasses", layer: "accessory", name: "نظارة", price: 60 },
  { id: "acc-headphones", layer: "accessory", name: "سماعات", price: 70 },
  { id: "acc-backpack", layer: "accessory", name: "حقيبة ظهر", price: 80 },
  {
    id: "acc-goggles",
    layer: "accessory",
    name: "نظارة المختبر الواقية",
    price: 0,
    unlock: { type: "level", level: 3 },
  },
  { id: "frame-violet", layer: "frame", name: "إطار بنفسجي", price: 0 },
  { id: "frame-azure", layer: "frame", name: "إطار أزرق", price: 40 },
  { id: "frame-amber", layer: "frame", name: "إطار ذهبي", price: 40 },
  { id: "frame-rainbow", layer: "frame", name: "إطار قوس قزح", price: 100 },
  {
    id: "frame-streak",
    layer: "frame",
    name: "إطار شعلة الانتظام",
    price: 0,
    unlock: { type: "streak", days: 7 },
  },
];

export const DEFAULT_AVATAR = {
  base: "base-2",
  hair: "hair-short",
  outfit: "outfit-casual",
  accessory: "acc-none",
  frame: "frame-violet",
};

const byId = new Map(SHOP_ITEMS.map((item) => [item.id, item]));

export function shopItem(id) {
  return (typeof id === "string" && byId.get(id)) || null;
}

/** progress: { level, bestStreak, masteredLessons: string[] } */
export function isUnlocked(item, progress) {
  const rule = item.unlock;
  if (!rule) return true;
  if (rule.type === "level") return progress.level >= rule.level;
  if (rule.type === "streak") return progress.bestStreak >= rule.days;
  if (rule.type === "mastery")
    return progress.masteredLessons.includes(rule.lessonId);
  return false;
}

/** Paid items must be bought; free and earned items are owned once unlocked. */
export function isOwned(item, purchased, progress) {
  if (item.price > 0) return purchased.has(item.id);
  return isUnlocked(item, progress);
}

/** The cleaned avatar config, or null when any layer is missing, foreign or not owned. */
export function validateAvatar(config, purchased, progress) {
  if (!config || typeof config !== "object" || Array.isArray(config))
    return null;
  const out = {};
  for (const layer of AVATAR_LAYERS) {
    const item = shopItem(config[layer]);
    if (!item || item.layer !== layer || !isOwned(item, purchased, progress))
      return null;
    out[layer] = item.id;
  }
  return out;
}
```

- [ ] **Step 4:** `node --test tests/shop.test.mjs` → PASS (4 tests).
- [ ] **Step 5: Commit** — `git add src/server/shop.mjs tests/shop.test.mjs` · message "Add shop catalogue and avatar ownership rules".

---

### Task 2: Store — purchases, avatars, balance

**Files:** Modify `src/server/store.mjs`; create `tests/shop-store.test.mjs`.

- [ ] **Step 1: Write the failing tests** — `tests/shop-store.test.mjs`:

```js
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
```

- [ ] **Step 2:** `node --test tests/shop-store.test.mjs` → FAIL (`store.buyItem is not a function`).

- [ ] **Step 3: Implement** in `src/server/store.mjs` (locate by content; line numbers drift):

1. Import: `import { AVATAR_LAYERS, SHOP_ITEMS, DEFAULT_AVATAR, shopItem, isUnlocked, isOwned, validateAvatar } from "./shop.mjs";`
2. Schema string, next to the `streaks` table:

```sql
    CREATE TABLE IF NOT EXISTS purchases(user_id TEXT NOT NULL REFERENCES users(id),item_id TEXT NOT NULL,price INTEGER NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(user_id,item_id));
    CREATE TABLE IF NOT EXISTS avatars(user_id TEXT PRIMARY KEY REFERENCES users(id),config TEXT NOT NULL,updated_at INTEGER NOT NULL);
```

3. Helpers next to `rewardSummary`:

```js
  function purchasedIds(userId) {
    return new Set(
      db
        .prepare("SELECT item_id FROM purchases WHERE user_id=?")
        .all(userId)
        .map((r) => r.item_id),
    );
  }
  function coinsSpent(userId) {
    return db
      .prepare("SELECT COALESCE(SUM(price),0) AS n FROM purchases WHERE user_id=?")
      .get(userId).n;
  }
  function coinsEarned(userId) {
    return db
      .prepare("SELECT COALESCE(SUM(coins),0) AS n FROM reward_ledger WHERE user_id=?")
      .get(userId).n;
  }
  /** What unlock rules look at: level from XP, best streak, fully mastered lessons. */
  function shopProgress(user) {
    const xp = db
      .prepare("SELECT COALESCE(SUM(xp),0) AS n FROM reward_ledger WHERE user_id=?")
      .get(user.id).n;
    const streak = db.prepare("SELECT best FROM streaks WHERE user_id=?").get(user.id);
    const mastery = conceptMastery(quizConcepts(), childAttempts(user.id));
    return {
      level: levelFor(xp, user.gender).level,
      bestStreak: streak?.best ?? 0,
      masteredLessons:
        mastery.length && mastery.every((m) => m.status === "secure") ? [LESSON_ID] : [],
    };
  }
  /** The saved avatar with any no-longer-owned layer reset to its default. */
  function avatarFor(user, purchased = purchasedIds(user.id), progress = shopProgress(user)) {
    const row = db.prepare("SELECT config FROM avatars WHERE user_id=?").get(user.id);
    let saved = {};
    try {
      saved = row ? JSON.parse(row.config) : {};
    } catch {
      saved = {};
    }
    const out = {};
    for (const layer of AVATAR_LAYERS) {
      const item = shopItem(saved?.[layer]);
      out[layer] =
        item && item.layer === layer && isOwned(item, purchased, progress)
          ? item.id
          : DEFAULT_AVATAR[layer];
    }
    return out;
  }
```

4. In `rewardSummary`, keep the XP query but make coins the balance:

```js
    const earned = totals.coins;
    const spent = coinsSpent(user.id);
    // in the returned object replace `coins: totals.coins,` with:
      coins: earned - spent,
      coinsEarned: earned,
      coinsSpent: spent,
```

5. In `childSnapshot`, add `avatar: avatarFor(user),` to the returned object.

6. New `api` methods (after `savePractice`):

```js
    shop(userId) {
      requireRole(userId, ["student"]);
      const user = raw(userId);
      const purchased = purchasedIds(userId);
      const progress = shopProgress(user);
      return {
        balance: coinsEarned(userId) - coinsSpent(userId),
        avatar: avatarFor(user, purchased, progress),
        items: SHOP_ITEMS.map((item) => ({
          ...item,
          owned: isOwned(item, purchased, progress),
          unlocked: isUnlocked(item, progress),
        })),
      };
    },
    buyItem(userId, itemId) {
      requireRole(userId, ["student"]);
      const item = shopItem(itemId);
      if (!item || item.price <= 0) fail("هذا العنصر غير متاح للشراء.");
      db.exec("BEGIN IMMEDIATE");
      try {
        if (
          db
            .prepare("SELECT 1 FROM purchases WHERE user_id=? AND item_id=?")
            .get(userId, item.id)
        )
          fail("تملكين هذا العنصر بالفعل.", 409);
        if (coinsEarned(userId) - coinsSpent(userId) < item.price)
          fail("عملاتك لا تكفي لهذا العنصر بعد. أكملي مهام التعلّم لتجمعي المزيد.");
        db.prepare(
          "INSERT INTO purchases(user_id,item_id,price,created_at) VALUES(?,?,?,?)",
        ).run(userId, item.id, item.price, now());
        db.exec("COMMIT");
      } catch (e) {
        try {
          db.exec("ROLLBACK");
        } catch {
          /* transaction already closed */
        }
        throw e;
      }
      return api.shop(userId);
    },
    saveAvatar(userId, config) {
      requireRole(userId, ["student"]);
      const user = raw(userId);
      const avatar = validateAvatar(config, purchasedIds(userId), shopProgress(user));
      if (!avatar) fail("اختاري عناصر تملكينها فقط.");
      db.prepare(
        "INSERT INTO avatars(user_id,config,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET config=excluded.config,updated_at=excluded.updated_at",
      ).run(userId, JSON.stringify(avatar), now());
      return { avatar };
    },
```

7. `deleteFamily`: extend the cleanup list to `["reward_ledger", "activity_days", "streaks", "purchases", "avatars"]`.

- [ ] **Step 4:** `npm test` → all suites PASS (existing rewards tests still see `coins` equal to earned because nothing was spent).
- [ ] **Step 5: Commit** — "Store purchases and avatars; coin balance is earned minus spent".

---

### Task 3: API

**Files:** Modify `src/app/api/[...action]/route.ts` (existing catch-all only; no new route files).

- [ ] **Step 1:** In `GET`, after the `dashboard` branch:

```ts
    if (action === "shop") {
      if (!user) return response({ error: "يلزم تسجيل الدخول." }, 401);
      return response(store.shop(user.id));
    }
```

- [ ] **Step 2:** In `POST`, after the `if (!user) return … 401` line:

```ts
    if (action === "shop/buy")
      return response(store.buyItem(user.id, body.itemId));
    if (action === "avatar")
      return response(store.saveAvatar(user.id, body.avatar));
```

- [ ] **Step 3:** `npx tsc --noEmit` clean; `npm test` green. Commit — "Expose shop, purchase and avatar endpoints".

---

### Task 4: Avatar image slots and client types

**Files:** Create `src/content/avatar-slots.ts`, `src/content/shop.ts`, `src/components/shop/types.ts`; append a test to `tests/shop.test.mjs`; create `docs/delegation/2026-09-19-avatar-image-requests.md`.

- [ ] **Step 1: Failing test** — append to `tests/shop.test.mjs` (add the import at the top):

```js
import { AVATAR_SLOTS, avatarSlot } from "../src/content/avatar-slots.ts";

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
```

- [ ] **Step 2: Implement** `src/content/avatar-slots.ts` — must not use `@/` imports (node test runner):

```ts
import type { ImageSlot } from "./image-slots";

const LAYER_DIRECTION =
  "One transparent-background PNG layer, 512x512, for a layered 2D avatar on an Arabic children's learning site. Friendly semi-realistic illustrated style, front-facing, head and shoulders, the same canvas, scale and alignment as the base template (avatar-base-2): face centred, chin at 62% height. Draw ONLY this layer so it stacks cleanly over the others. Palette accents #ffbe0b #fb5607 #ff006e #8338ec #3a86ff. No text, no logos, no background.";

function layer(id: string, alt: string, subject: string, usage: string): ImageSlot {
  return {
    id,
    path: `/images/avatar/${id}.png`,
    width: 512,
    height: 512,
    alt,
    prompt: `${LAYER_DIRECTION} Layer: ${subject}`,
    usage,
    ready: false,
  };
}

export const AVATAR_SLOTS: readonly ImageSlot[] = [
  layer("base-1", "شخصية ببشرة فاتحة", "base head, neck and shoulders with light skin tone, neutral friendly smile, no hair, plain neckline.", "Avatar base layer"),
  layer("base-2", "شخصية ببشرة حنطية", "base head, neck and shoulders with medium wheat skin tone, neutral friendly smile, no hair, plain neckline. This is the alignment template for every other layer.", "Avatar base layer (template)"),
  layer("base-3", "شخصية ببشرة سمراء", "base head, neck and shoulders with deep brown skin tone, neutral friendly smile, no hair, plain neckline.", "Avatar base layer"),
  layer("hair-short", "شعر قصير", "short neat dark hair only.", "Avatar hair layer"),
  layer("hair-curly", "شعر مجعّد", "short curly dark hair only.", "Avatar hair layer"),
  layer("hair-long", "شعر طويل", "long straight dark hair falling behind the shoulders only.", "Avatar hair layer"),
  layer("hijab-violet", "حجاب بنفسجي", "a neat violet (#8338ec) hijab framing the face and covering the neck, modest and simple, no face drawn.", "Avatar hair layer (hijab)"),
  layer("hijab-azure", "حجاب أزرق", "a neat azure (#3a86ff) hijab framing the face and covering the neck, modest and simple, no face drawn.", "Avatar hair layer (hijab)"),
  layer("hair-bun", "كعكة شعر", "dark hair pulled into a tidy top bun only.", "Avatar hair layer (shop, 60 coins)"),
  layer("hijab-stars", "حجاب بنقشة نجوم", "a modest hijab with a subtle small-star pattern in violet and amber, framing the face and covering the neck, no face drawn.", "Avatar hair layer (shop, 60 coins)"),
  layer("outfit-casual", "ملابس يومية", "a plain casual crew-neck top in soft azure, shoulders only.", "Avatar outfit layer (default)"),
  layer("outfit-lab-coat", "معطف المختبر", "a white lab coat with a small violet pen in the pocket over a plain top, shoulders only.", "Avatar outfit layer (shop, 120 coins)"),
  layer("outfit-doctor", "زيّ الطبيب", "light blue medical scrubs with a stethoscope around the neck, shoulders only.", "Avatar outfit layer (shop, 150 coins)"),
  layer("outfit-explorer", "زيّ المستكشف", "a khaki explorer vest with pockets over a plain top, shoulders only.", "Avatar outfit layer (shop, 150 coins)"),
  layer("outfit-astronaut", "بدلة رائد الفضاء", "a white astronaut suit collar and shoulders with small azure and orange patches, no helmet, no flags.", "Avatar outfit layer (shop, 250 coins)"),
  layer("outfit-nutrition", "مريلة خبير التغذية", "a green nutrition-expert apron with a small leaf badge over a plain top, shoulders only.", "Avatar outfit layer (earned: Nutrients mastery)"),
  layer("acc-glasses", "نظارة", "round violet-framed reading glasses only, positioned on the eyes of the template.", "Avatar accessory layer (shop, 60 coins)"),
  layer("acc-headphones", "سماعات", "over-ear headphones in amber resting on the head only.", "Avatar accessory layer (shop, 70 coins)"),
  layer("acc-backpack", "حقيبة ظهر", "backpack straps over both shoulders with a small orange bag top visible behind one shoulder only.", "Avatar accessory layer (shop, 80 coins)"),
  layer("acc-goggles", "نظارة المختبر الواقية", "clear lab safety goggles with an azure strap, positioned on the eyes of the template only.", "Avatar accessory layer (earned: level 3)"),
];

export function avatarSlot(itemId: string): ImageSlot | undefined {
  return AVATAR_SLOTS.find((slot) => slot.id === itemId);
}
```

`src/components/shop/types.ts`:

```ts
export type AvatarLayer = "base" | "hair" | "outfit" | "accessory" | "frame";
export type AvatarConfig = Record<AvatarLayer, string>;
export type Unlock =
  | { type: "level"; level: number }
  | { type: "streak"; days: number }
  | { type: "mastery"; lessonId: string };
export type ShopItem = {
  id: string;
  layer: AvatarLayer;
  name: string;
  price: number;
  unlock?: Unlock;
  owned: boolean;
  unlocked: boolean;
};
export type ShopState = { balance: number; avatar: AvatarConfig; items: ShopItem[] };
```

`src/content/shop.ts`:

```ts
import type { AvatarLayer, Unlock } from "@/components/shop/types";

export const LAYER_ORDER: AvatarLayer[] = ["base", "hair", "outfit", "accessory", "frame"];

export const LAYER_LABELS: Record<AvatarLayer, string> = {
  base: "البشرة",
  hair: "الشعر والحجاب",
  outfit: "الملابس",
  accessory: "الإضافات",
  frame: "الإطار",
};

const n = (value: number) => value.toLocaleString("ar-KW");

export function unlockHint(unlock: Unlock) {
  if (unlock.type === "level") return `يُفتح عند المستوى ${n(unlock.level)}`;
  if (unlock.type === "streak") return `يُفتح بعد ${n(unlock.days)} أيام دراسة متتالية`;
  return "يُفتح عند إتقان كل مفاهيم المغذّيات";
}

export function frameClass(frameId: string) {
  return "avatar-frame-" + frameId.replace(/^frame-/, "");
}
```

- [ ] **Step 3:** Write `docs/delegation/2026-09-19-avatar-image-requests.md`: one row per slot (id, output path `public/images/avatar/<id>.png`, 512×512 transparent, alt, full prompt) plus the rule "generate `base-2` first and use it as the alignment template for every other layer; connect by dropping the PNG and setting `ready: true` in `src/content/avatar-slots.ts`".
- [ ] **Step 4:** `npm test`, `npx tsc --noEmit` green. Commit — "Register pending avatar layer image slots".

---

### Task 5: Avatar component

**Files:** Create `src/components/avatar/avatar.tsx`; append CSS.

- [ ] **Step 1:** `src/components/avatar/avatar.tsx`:

```tsx
import Image from "next/image";
import { avatarSlot } from "@/content/avatar-slots";
import { frameClass } from "@/content/shop";
import type { AvatarConfig } from "@/components/shop/types";

const PAINT_ORDER = ["base", "outfit", "hair", "accessory"] as const;

/**
 * Layered avatar. Layers render only once their PNG is ready; until the base
 * layer exists the student's initial shows inside the chosen frame.
 */
export function Avatar({
  config,
  name,
  size = "md",
}: {
  config: AvatarConfig;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const layers = PAINT_ORDER.map((layer) => avatarSlot(config[layer])).filter(
    (slot): slot is NonNullable<typeof slot> => Boolean(slot?.ready),
  );
  const hasBase = layers.some((slot) => slot.id === config.base);
  return (
    <span
      className={`avatar-figure avatar-${size} ${frameClass(config.frame)}`}
      role="img"
      aria-label={`شخصية ${name}`}
    >
      <span className="avatar-inner">
        {hasBase ? (
          layers.map((slot) => (
            <Image
              key={slot.id}
              className="avatar-layer"
              src={slot.path}
              alt=""
              width={slot.width}
              height={slot.height}
            />
          ))
        ) : (
          <span className="avatar-initial" aria-hidden="true">
            {name.slice(0, 1)}
          </span>
        )}
      </span>
    </span>
  );
}
```

- [ ] **Step 2:** Append to `src/app/globals.css`:

```css
/* Avatar */
.avatar-figure {
  --frame: var(--violet);
  display: inline-grid;
  flex: none;
  padding: 4px;
  border-radius: 50%;
  background: var(--frame);
  aspect-ratio: 1;
}
.avatar-sm { width: 52px; }
.avatar-md { width: 104px; }
.avatar-lg { width: min(220px, 60vw); }
.avatar-inner {
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  background: var(--violet-soft);
}
.avatar-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.avatar-initial {
  font-weight: 800;
  color: var(--violet-ink);
  font-size: 1.1em;
}
.avatar-sm .avatar-initial { font-size: 20px; }
.avatar-md .avatar-initial { font-size: 40px; }
.avatar-lg .avatar-initial { font-size: 80px; }
.avatar-frame-violet { --frame: var(--violet); }
.avatar-frame-azure { --frame: var(--azure); }
.avatar-frame-amber { --frame: var(--amber); }
.avatar-frame-rainbow {
  --frame: conic-gradient(var(--amber), var(--orange), var(--pink), var(--violet), var(--azure), var(--amber));
}
.avatar-frame-streak {
  --frame: linear-gradient(135deg, var(--amber), var(--orange), var(--pink));
}
```

- [ ] **Step 3:** `npx tsc --noEmit` clean. Commit — "Add layered avatar component with initial fallback".

---

### Task 6: Student-only /shop page

**Files:** Create `src/app/shop/page.tsx`, `src/components/shop/shop.tsx`; append CSS.

Before creating the route, read `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md` and `redirect.md` (this Next.js version differs from training data — `cookies()` is async). Mirror `src/app/dashboard/page.tsx`.

- [ ] **Step 1:** `src/app/shop/page.tsx`:

```tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { store } from "@/server/db";
import { Shop } from "@/components/shop/shop";
import type { ShopState } from "@/components/shop/types";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "متجر مدارك",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const user = store.sessionUser((await cookies()).get("hana_session")?.value);
  if (!user) redirect("/login");
  if (user.role !== "student") redirect("/dashboard");
  return <Shop initial={store.shop(user.id) as ShopState} name={user.name} />;
}
```

- [ ] **Step 2:** `src/components/shop/shop.tsx`:

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Coins,
  Glasses,
  Lock,
  Save,
  Shirt,
  ShoppingBag,
  Smile,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { api } from "../providers";
import { Avatar } from "../avatar/avatar";
import { ImageSlot } from "../ui/image-slot";
import { AVATAR_SLOTS, avatarSlot } from "@/content/avatar-slots";
import { LAYER_LABELS, LAYER_ORDER, frameClass, unlockHint } from "@/content/shop";
import type { AvatarConfig, AvatarLayer, ShopItem, ShopState } from "./types";

const LAYER_ICON: Record<Exclude<AvatarLayer, "frame">, LucideIcon> = {
  base: Smile,
  hair: Sparkles,
  outfit: Shirt,
  accessory: Glasses,
};
const n = (value: number) => value.toLocaleString("ar-KW");
const artPending = AVATAR_SLOTS.some((slot) => !slot.ready);

function ItemPicture({ item }: { item: ShopItem }) {
  if (item.layer === "frame")
    return <span className={`frame-swatch ${frameClass(item.id)}`} aria-hidden="true" />;
  const slot = avatarSlot(item.id);
  if (!slot)
    return (
      <span className="frame-swatch none" aria-hidden="true">
        <X size={28} />
      </span>
    );
  return <ImageSlot slot={slot} icon={LAYER_ICON[item.layer]} sizes="160px" />;
}

export function Shop({ initial, name }: { initial: ShopState; name: string }) {
  const reduce = useReducedMotion();
  const [state, setState] = useState(initial);
  const [draft, setDraft] = useState<AvatarConfig>(initial.avatar);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dirty = LAYER_ORDER.some((layer) => draft[layer] !== state.avatar[layer]);

  async function buy(item: ShopItem) {
    if (confirmId !== item.id) {
      setConfirmId(item.id);
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next: ShopState = await api("shop/buy", { itemId: item.id });
      setState(next);
      setDraft((current) => ({ ...current, [item.layer]: item.id }));
      setConfirmId(null);
      setNotice(`أصبح «${item.name}» لكِ. جرّبيه ثم احفظي شخصيتك.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { avatar } = await api("avatar", { avatar: draft });
      setState((current) => ({ ...current, avatar }));
      setDraft(avatar);
      setNotice("حُفظت شخصيتك.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="container section shop-page">
      <header className="shop-heading">
        <div>
          <span className="eyebrow">متجر مدارك</span>
          <h1>
            شخصيتي<span className="title-dot">.</span>
          </h1>
          <p>اصرفي عملاتك على ملابس وإضافات لشخصيتك. الخبرة واللقب لا ينقصان عند الشراء.</p>
        </div>
        <span className="coin-balance" aria-live="polite">
          <Coins size={18} aria-hidden="true" /> عملاتك: {n(state.balance)}
        </span>
      </header>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="feedback success" role="status">
          <Check size={18} /> {notice}
        </p>
      )}
      <div className="shop-layout">
        <aside className="panel shop-preview">
          <motion.div
            key={LAYER_ORDER.map((layer) => draft[layer]).join("|")}
            initial={reduce ? false : { opacity: 0.6, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
          >
            <Avatar config={draft} name={name} size="lg" />
          </motion.div>
          {artPending && (
            <p className="muted-text">رسوم الشخصيات قيد التجهيز، وستظهر هنا تلقائيًا عند إضافتها.</p>
          )}
          <button className="button primary" disabled={!dirty || busy} onClick={save}>
            <Save size={18} /> حفظ شخصيتي
          </button>
          <Link href="/dashboard" className="text-link">
            <ArrowRight size={16} /> العودة إلى مساحتي
          </Link>
        </aside>
        <Tabs.Root dir="rtl" defaultValue="outfit" className="shop-tabs-root">
          <Tabs.List className="shop-tabs" aria-label="أقسام المتجر">
            {LAYER_ORDER.map((layer) => (
              <Tabs.Trigger key={layer} value={layer}>
                {LAYER_LABELS[layer]}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {LAYER_ORDER.map((layer) => (
            <Tabs.Content key={layer} value={layer}>
              <ul className="shop-grid">
                {state.items
                  .filter((item) => item.layer === layer)
                  .map((item) => {
                    const worn = draft[layer] === item.id;
                    const short = item.price - state.balance;
                    return (
                      <li
                        key={item.id}
                        className={
                          "shop-item" +
                          (worn ? " worn" : "") +
                          (!item.owned && item.unlock ? " locked" : "")
                        }
                      >
                        <ItemPicture item={item} />
                        <b>{item.name}</b>
                        {item.owned ? (
                          <button
                            type="button"
                            className="button outline small"
                            aria-pressed={worn}
                            onClick={() => setDraft((current) => ({ ...current, [layer]: item.id }))}
                          >
                            {worn ? (
                              <>
                                <Check size={16} /> ترتدينه
                              </>
                            ) : (
                              "ارتدي"
                            )}
                          </button>
                        ) : item.unlock ? (
                          <span className="shop-lock">
                            <Lock size={16} aria-hidden="true" /> {unlockHint(item.unlock)}
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="button primary small"
                              disabled={busy || short > 0}
                              onClick={() => buy(item)}
                            >
                              <ShoppingBag size={16} />{" "}
                              {confirmId === item.id
                                ? `تأكيد الشراء بـ ${n(item.price)}`
                                : `اشتري بـ ${n(item.price)} عملة`}
                            </button>
                            {short > 0 && (
                              <small className="muted-text">تحتاجين {n(short)} عملة أخرى</small>
                            )}
                          </>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </Tabs.Content>
          ))}
        </Tabs.Root>
      </div>
    </section>
  );
}
```

- [ ] **Step 3:** Append shop CSS (existing tokens only; RTL; phone-first):

```css
/* Shop */
.shop-heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
  margin-bottom: 24px;
}
.coin-balance {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 999px;
  background: var(--amber-soft);
  color: var(--amber-ink);
  font-weight: 800;
}
.shop-layout {
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
.shop-preview {
  display: grid;
  justify-items: center;
  gap: 14px;
  text-align: center;
  position: sticky;
  top: 96px;
}
.shop-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}
.shop-tabs button {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--white);
  font: inherit;
  cursor: pointer;
}
.shop-tabs button[data-state="active"] {
  background: var(--violet);
  border-color: var(--violet);
  color: var(--white);
}
.shop-tabs button:focus-visible {
  outline: 3px solid var(--violet);
  outline-offset: 2px;
}
.shop-grid {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 14px;
  padding: 0;
  margin: 0;
}
.shop-item {
  display: grid;
  gap: 8px;
  align-content: start;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--white);
}
.shop-item.worn {
  border: 2px solid var(--violet);
}
.shop-item.locked {
  background: var(--paper);
}
.shop-item .image-slot-placeholder,
.shop-item .image-slot {
  border-radius: 12px;
}
.frame-swatch {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  border-radius: 50%;
  padding: 10px;
  background: var(--frame, var(--line));
  color: var(--muted);
}
.frame-swatch::after {
  content: "";
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--violet-soft);
}
.frame-swatch.none::after {
  display: none;
}
.shop-lock {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 13px;
  color: var(--muted);
}
@media (max-width: 760px) {
  .shop-layout {
    grid-template-columns: 1fr;
  }
  .shop-preview {
    position: static;
  }
  .shop-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

- [ ] **Step 4:** `npx tsc --noEmit`, `npm run build` green. Commit — "Add the student shop page and avatar editor".

---

### Task 7: Avatar on the dashboards

**Files:** Modify `src/components/rewards/types.ts`, `src/components/rewards/student-rewards.tsx`, `src/components/dashboard.tsx`.

- [ ] **Step 1:** In `RewardSummary` (rewards/types.ts) add `coinsEarned: number; coinsSpent: number;`.
- [ ] **Step 2:** `RewardsHero` takes `avatar: AvatarConfig` and `name: string`; render `<Avatar config={avatar} name={name} size="md" />` as the first child of the hero and, under the title progress text, `<Link href="/shop" className="text-link">خصّصي شخصيتك من المتجر <ArrowLeft size={16} /></Link>`. Keep every existing heading/label (tests rely on "مستكشفة مبتدئة", "الخبرة", "عملات مدارك"). On phones the avatar stacks above the title.
- [ ] **Step 3:** In `dashboard.tsx`, add `avatar: AvatarConfig` to `ChildData`; pass `avatar={student.avatar} name={student.user.name}` to `RewardsHero`; in `ChildPanel` replace `<span className="avatar">{child.user.name.slice(0, 1)}</span>` with `<Avatar config={child.avatar} name={child.user.name} size="sm" />`.
- [ ] **Step 4:** `npx tsc --noEmit`, `npm test` green. Commit — "Show the student's avatar on both dashboards".

---

### Task 8: Browser test, docs, verification

- [ ] **Step 1:** `tests/browser/shop.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const allCorrect = {
  q1: "macro", q2: "protein", q3: "fat", q4: "D", q5: "oxygen",
  q6: "bowel", q7: "الجلوكوز", q8: "الماء", q9: "الفيتامينات", q10: "الكالسيوم",
};

test("a student buys and wears a lab coat with coins earned from the quiz", async ({ page }) => {
  const stamp = Date.now();
  const username = `shop-${stamp}`;
  expect(
    (
      await page.request.post("/api/register", {
        data: {
          name: "ولي أمر المتجر",
          email: `shop-${stamp}@example.test`,
          password: "Test-password-9876",
          children: [{ name: "ريم", username, pin: "73918264", grade: 8, gender: "female" }],
        },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto("/shop");
  await expect(page).toHaveURL("/dashboard");
  expect(
    (await page.request.post("/api/student-login", { data: { username, pin: "73918264" } })).ok(),
  ).toBeTruthy();
  expect(
    (await page.request.post("/api/quiz", { data: { id: `attempt-shop-${stamp}`, answers: allCorrect } })).ok(),
  ).toBeTruthy();

  await page.goto("/dashboard");
  await page.getByRole("link", { name: /خصّصي شخصيتك/ }).click();
  await expect(page).toHaveURL("/shop");
  await expect(page.getByText("عملاتك: ١٢٠")).toBeVisible();

  const coat = page.locator(".shop-item", { hasText: "معطف المختبر" });
  await coat.getByRole("button", { name: /اشتري بـ ١٢٠ عملة/ }).click();
  await coat.getByRole("button", { name: /تأكيد الشراء/ }).click();
  await expect(page.getByText("عملاتك: ٠")).toBeVisible();
  await expect(coat.getByRole("button", { name: /ترتدينه/ })).toBeVisible();
  await page.getByRole("button", { name: "حفظ شخصيتي" }).click();
  await expect(page.getByText("حُفظت شخصيتك.")).toBeVisible();

  const goggles = page.locator(".shop-item", { hasText: "نظارة المختبر الواقية" });
  await page.getByRole("tab", { name: "الإضافات" }).click();
  await expect(goggles.getByRole("button", { name: "ارتدي" })).toBeVisible();
  await page.getByRole("tab", { name: "الإطار" }).click();
  await expect(page.locator(".shop-item", { hasText: "إطار شعلة الانتظام" })).toContainText("أيام دراسة متتالية");

  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
```

- [ ] **Step 2:** Add `/shop` (signed in as a student) to the axe route loop in `tests/browser/accessibility.spec.ts` only if that spec already signs a student in; otherwise add a separate axe check at the end of `shop.spec.ts` using `@axe-core/playwright` with tags `wcag2a`, `wcag2aa`, `wcag21aa`.
- [ ] **Step 3:** Append a "Shop and avatars (Phase 2)" section to `docs/IMPLEMENTATION-STATUS.md`: balance = earned − spent; XP never drops; earned items; image slots pending in `src/content/avatar-slots.ts`; request list in `docs/delegation/2026-09-19-avatar-image-requests.md`.
- [ ] **Step 4:** Gates: `npm test`, `npx tsc --noEmit`, `npm run build`, full `npx playwright test` (E2E_PORT set). Screenshot `/shop` and the student dashboard at 360 and 1440 to confirm layout.

---

## Not in this plan

- Companion robot, personal lab, discovery-card album, unit celebrations (Phase 2b).
- Real-money purchases, gifting, trading, refunds.
- Admin editing of the catalogue (items live in `src/server/shop.mjs`).
- Generating any avatar art (owner, Codex Desktop).
