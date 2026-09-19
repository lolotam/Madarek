import {
  Wheat,
  Blocks,
  Droplet,
  Droplets,
  Leaf,
  Bone,
  Bean,
  Milk,
} from "lucide-react";
const map = {
  wheat: Wheat,
  blocks: Blocks,
  drop: Droplet,
  water: Droplets,
  leaf: Leaf,
  bone: Bone,
  beans: Bean,
  milk: Milk,
};
export function NutrientIcon({
  name,
  size = 28,
}: {
  name: string;
  size?: number;
}) {
  const Icon = map[name as keyof typeof map] || Leaf;
  return <Icon size={size} strokeWidth={1.65} />;
}
