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
