import type { ImageSlot } from "./image-slots";

export const BASES = ["base-1", "base-2", "base-3"] as const;
export const HAIRS = [
  "hair-short",
  "hair-curly",
  "hair-long",
  "hijab-violet",
  "hijab-azure",
  "hair-bun",
  "hijab-stars",
] as const;
export const OUTFITS = [
  "outfit-casual",
  "outfit-lab-coat",
  "outfit-doctor",
  "outfit-explorer",
  "outfit-astronaut",
  "outfit-nutrition",
] as const;
export const BADGE_ACCESSORIES = [
  "acc-glasses",
  "acc-headphones",
  "acc-backpack",
  "acc-goggles",
] as const;

const ARABIC: Record<string, string> = {
  "base-1": "بشرة فاتحة",
  "base-2": "بشرة حنطية",
  "base-3": "بشرة سمراء",
  "hair-short": "شعر قصير",
  "hair-curly": "شعر مجعّد",
  "hair-long": "شعر طويل",
  "hijab-violet": "حجاب بنفسجي",
  "hijab-azure": "حجاب أزرق",
  "hair-bun": "كعكة شعر",
  "hijab-stars": "حجاب بنقشة نجوم",
  "outfit-casual": "ملابس يومية",
  "outfit-lab-coat": "معطف المختبر",
  "outfit-doctor": "زيّ الطبيب",
  "outfit-explorer": "زيّ المستكشف",
  "outfit-astronaut": "بدلة رائد الفضاء",
  "outfit-nutrition": "مريلة خبير التغذية",
  "acc-glasses": "نظارة",
  "acc-headphones": "سماعات",
  "acc-backpack": "حقيبة ظهر",
  "acc-goggles": "نظارة المختبر الواقية",
};

const ENGLISH: Record<string, string> = {
  "base-1": "light skin",
  "base-2": "medium wheat skin",
  "base-3": "deep brown skin",
  "hair-short": "short neat dark hair",
  "hair-curly": "short curly dark hair",
  "hair-long": "long straight dark hair",
  "hijab-violet": "a neat violet hijab",
  "hijab-azure": "a neat azure hijab",
  "hair-bun": "dark hair in a tidy bun",
  "hijab-stars": "a modest starred hijab",
  "outfit-casual": "a casual azure crew-neck top",
  "outfit-lab-coat": "a white lab coat",
  "outfit-doctor": "light blue medical scrubs",
  "outfit-explorer": "a khaki explorer vest",
  "outfit-astronaut": "a white astronaut collar",
  "outfit-nutrition": "a green nutrition apron",
  "acc-glasses": "round violet reading glasses",
  "acc-headphones": "amber over-ear headphones",
  "acc-backpack": "an orange backpack",
  "acc-goggles": "clear lab safety goggles",
};

function lookId(base: string, hair: string, outfit: string) {
  return `look-${base}-${hair}-${outfit}`;
}

export const LOOK_SLOTS: readonly ImageSlot[] = BASES.flatMap((base) =>
  HAIRS.flatMap((hair) =>
    OUTFITS.map((outfit) => ({
      id: lookId(base, hair, outfit),
      path: `/images/avatar/looks/${lookId(base, hair, outfit)}.png`,
      width: 448,
      height: 448,
      alt: `شخصية الطالب، ${ARABIC[base]} و${ARABIC[hair]} و${ARABIC[outfit]}`,
      prompt: `Head-and-shoulders student portrait with ${ENGLISH[base]}, ${ENGLISH[hair]}, and ${ENGLISH[outfit]}, opaque 448x448 on flat #F2EAFF. No text.`,
      usage: "Avatar portrait",
      ready: true,
    })),
  ),
);

export const BADGE_SLOTS: readonly ImageSlot[] = BADGE_ACCESSORIES.map((id) => ({
  id,
  path: `/images/avatar/badges/${id}.png`,
  width: 192,
  height: 192,
  alt: ARABIC[id],
  prompt: `Transparent 192x192 circular sticker of ${ENGLISH[id]}. No person, no text.`,
  usage: "Avatar accessory badge",
  ready: true,
}));

export const AVATAR_SLOTS: readonly ImageSlot[] = [...LOOK_SLOTS, ...BADGE_SLOTS];

export function lookSlot(
  base: string,
  hair: string,
  outfit: string,
): ImageSlot | undefined {
  const id = lookId(base, hair, outfit);
  return LOOK_SLOTS.find((slot) => slot.id === id);
}

export function badgeSlot(accessoryId: string): ImageSlot | undefined {
  return BADGE_SLOTS.find((slot) => slot.id === accessoryId);
}
