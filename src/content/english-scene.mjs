import { englishWordPattern, wordMeaning } from "./english-glossary.mjs";

const colors = [
  ["#e0f2ee", "#87bcae", "#1d6657"],
  ["#f0eaff", "#b9abe6", "#6149a2"],
  ["#fff0d9", "#dec299", "#8b570e"],
  ["#e5f0fa", "#9bbfdf", "#315e87"],
];

export const diagramSizes = {
  wide: { width: 840, height: 350 },
  compact: { width: 570, height: 295 },
};

// Sprite order, left to right and top to bottom in school-objects-3d.webp.
const illustratedObjects = [
  "📚",
  "🏫",
  "🎒",
  "📖",
  "🎧",
  "🏀",
  "📅",
  "🔔",
  "✏️",
];

function escapeText(value) {
  return value.replace(
    /[&<>]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
      })[character],
  );
}

function illustratedLabel(label) {
  return label
    .split(englishWordPattern)
    .map((word, index) => {
      const entry = index % 2 ? wordMeaning(word) : undefined;
      if (!entry) return escapeText(word);
      const icon =
        entry.sprite === undefined
          ? escapeText(entry.icon)
          : `<span class="gloss-sprite" style="background-position:${(entry.sprite % 3) * 50}% ${Math.floor(entry.sprite / 3) * 50}%"></span>`;
      return `<span class="gloss-word">${escapeText(word)}<span class="gloss-tip" lang="ar" dir="rtl">${icon} ${escapeText(entry.meaning)}</span></span>`;
    })
    .join("");
}

export function sceneDocument(scene, seed = "", layout = "wide") {
  const { width, height } = diagramSizes[layout];
  const compact = layout === "compact";
  const variant =
    Array.from(seed || scene).reduce(
      (sum, character) => sum + character.codePointAt(0),
      0,
    ) % colors.length;
  const [mat, line, ink] = colors[variant];
  const parts = scene.split("|");
  const steps = parts.map((part, index) => {
    const firstSpace = part.indexOf(" ");
    const icon = part.slice(0, firstSpace);
    const label = illustratedLabel(part.slice(firstSpace + 1));
    const art = illustratedObjects.indexOf(icon);
    const picture =
      art < 0
        ? `<span class="object emoji">${escapeText(icon)}</span>`
        : `<span class="object art" style="background-position:${(art % 3) * 50}% ${Math.floor(art / 3) * 50}%"></span>`;
    return `<div class="clip" id="step${index}" data-start="0" data-duration="3.6" data-track-index="${index + 1}"><div class="tile"><div class="picture" aria-hidden="true"><span class="shadow"></span>${picture}</div><b>${label}</b></div></div>`;
  });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
* { box-sizing: border-box; }
html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; }
#diagram { isolation: isolate; position: relative; width: ${width}px; height: ${height}px; padding: 18px ${compact ? 18 : 40}px; display: grid; grid-template-columns: repeat(${parts.length}, minmax(0, 1fr)); align-items: center; gap: ${compact ? 11 : 24}px; color: ${ink}; font: 750 ${compact ? 30 : 32}px system-ui, Arial, sans-serif; background: radial-gradient(ellipse at 50% 10%, #fff9, transparent 72%), ${mat}; }
.clip { position: relative !important; inset: auto !important; }
.tile { text-align: center; display: grid; justify-items: center; gap: 8px; }
.picture { position: relative; display: grid; place-items: center; width: 100%; height: ${compact ? 174 : 218}px; perspective: 420px; }
.picture::before { content: ""; position: absolute; width: 87%; max-width: 215px; height: 85%; border-radius: 50%; background: radial-gradient(ellipse at center, #fff, #fff0 72%); }
.shadow { position: absolute; bottom: 4%; width: 63%; max-width: 144px; height: 18px; border-radius: 50%; background: ${line}; filter: blur(7px); opacity: .62; }
.object { position: relative; display: grid; place-items: center; transform-origin: center 70%; }
.art { width: min(100%, ${compact ? 169 : 214}px); aspect-ratio: 1; background: url('/english/school-objects-3d.webp') no-repeat; background-size: 300% 300%; }
.emoji { font: ${compact ? (parts.length > 2 ? 104 : 125) : 138}px/1.13 "Segoe UI Emoji", "Apple Color Emoji", sans-serif; filter: drop-shadow(0 8px 8px #15303c37); }
.tile b { border-radius: 16px; padding: 7px 11px 8px; line-height: 1.1; background: #fff; max-width: 100%; overflow-wrap: break-word; box-shadow: 0 3px ${line}66; }
.gloss-word { position: relative; cursor: help; text-decoration: underline dotted #7054a6a0; text-underline-offset: 0.12em; }
.gloss-tip { position: absolute; z-index: 3; display: none; align-items: center; gap: 7px; left: 50%; bottom: calc(100% + 8px); transform: translateX(-50%); width: max-content; max-width: 190px; padding: 8px 10px; border-radius: 12px; color: #382359; background: #fff9ed; box-shadow: 0 3px 12px #31175544; font: 750 25px/1.3 system-ui, Arial, sans-serif; text-align: start; pointer-events: none; }
.gloss-word[data-open] > .gloss-tip { display: flex; }
@media (hover: hover) { .gloss-word:hover > .gloss-tip { display: flex; } }
.gloss-sprite { display: block; flex: 0 0 35px; height: 35px; background: url('/english/school-objects-3d.webp') no-repeat; background-size: 300% 300%; }
</style>
<script src="/english/gsap.min.js"></script>
</head>
<body>
<main id="diagram" data-composition-id="diagram" data-width="${width}" data-height="${height}" data-duration="3.6">${steps.join("")}</main>
<script>
const tl = gsap.timeline({ paused: true });
const cycle = { duration: 1.8, yoyo: true, repeat: 1, ease: "sine.inOut" };
tl.to(".object", {
  ...cycle,
  y: index => index % 2 ? -11 : -19,
  rotation: index => (index + ${variant}) % 2 ? -6 : 6,
  rotationY: index => index % 2 ? -15 : 15
}, 0);
tl.to(".shadow", { ...cycle, scaleX: .78, opacity: .32 }, 0);
window.__timelines = { diagram: tl };
document.getElementById("diagram").addEventListener("pointerdown", (event) => {
  document.querySelector(".gloss-word[data-open]")?.removeAttribute("data-open");
  if (event.pointerType !== "mouse") event.target.closest(".gloss-word")?.setAttribute("data-open", "");
});
</script>
<script src="/english/runtime.js"></script>
</body>
</html>`;
}
