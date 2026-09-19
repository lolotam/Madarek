import Image from "next/image";
import { badgeSlot, lookSlot } from "@/content/avatar-slots";
import { frameClass } from "@/content/shop";
import type { AvatarConfig } from "@/components/shop/types";

/**
 * Full-portrait avatar. The look PNG covers the circle; a ready accessory
 * badge sits outside the clipped inner so the sticker is not cropped. Until
 * the look file is ready the student's initial shows inside the chosen frame.
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
  const look = lookSlot(config.base, config.hair, config.outfit);
  const badge = badgeSlot(config.accessory);
  const sizes = size === "lg" ? "220px" : size === "sm" ? "52px" : "104px";
  return (
    <span
      className={`avatar-figure avatar-${size} ${frameClass(config.frame)}`}
      role="img"
      aria-label={`شخصية ${name}`}
    >
      <span className="avatar-inner">
        {look?.ready ? (
          <Image
            className="avatar-look"
            src={look.path}
            alt=""
            fill
            sizes={sizes}
            style={{ objectFit: "cover" }}
          />
        ) : (
          <span className="avatar-initial" aria-hidden="true">
            {name.slice(0, 1)}
          </span>
        )}
      </span>
      {badge?.ready ? (
        <Image
          className="avatar-badge"
          src={badge.path}
          alt=""
          width={badge.width}
          height={badge.height}
        />
      ) : null}
    </span>
  );
}
