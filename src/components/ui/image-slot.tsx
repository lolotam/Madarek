import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import type { ImageSlot as ImageSlotData } from "@/content/image-slots";

export function ImageSlot({
  slot,
  icon: Icon,
  sizes,
  preload = false,
  className = "",
}: {
  slot: ImageSlotData;
  icon: LucideIcon;
  sizes?: string;
  preload?: boolean;
  className?: string;
}) {
  const ratio = `${slot.width} / ${slot.height}`;
  if (slot.ready) {
    return (
      <span className="image-slot" data-slot={slot.id} data-ready="true">
        <Image
          className={"image-slot-photo " + className}
          src={slot.path}
          alt={slot.alt}
          width={slot.width}
          height={slot.height}
          sizes={sizes}
          preload={preload}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </span>
    );
  }
  return (
    <div
      className={"image-slot-placeholder " + className}
      role="img"
      aria-label={slot.alt}
      data-slot={slot.id}
      data-ready="false"
      style={{ aspectRatio: ratio }}
    >
      <Icon size={32} strokeWidth={1.35} aria-hidden="true" />
    </div>
  );
}
