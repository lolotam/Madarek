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
