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
