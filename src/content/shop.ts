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
