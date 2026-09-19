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
