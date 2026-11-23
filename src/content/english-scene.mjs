const colors = [
  ["#e0f2ee", "#87bcae", "#1d6657"],
  ["#f0eaff", "#b9abe6", "#6149a2"],
  ["#fff0d9", "#dec299", "#8b570e"],
  ["#e5f0fa", "#9bbfdf", "#315e87"],
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

export function sceneDocument(scene, seed = "") {
  const variant =
    Array.from(seed || scene).reduce(
      (sum, character) => sum + character.codePointAt(0),
      0,
    ) % colors.length;
  const [mat, line, ink] = colors[variant];
  const parts = scene.split("|");
  const steps = parts.map((part, index) => {
    const firstSpace = part.indexOf(" ");
    const icon = escapeText(part.slice(0, firstSpace));
    const label = escapeText(part.slice(firstSpace + 1));
    return `<div class="clip" id="step${index}" data-start="0" data-duration="3.2" data-track-index="${index + 1}"><div class="tile"><div class="picture"><i>${icon}</i><span class="spark">✦</span></div><b>${label}</b></div></div>`;
  });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
* { box-sizing: border-box; }
html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; }
#diagram { isolation: isolate; position: relative; width: 840px; height: 232px; padding: 15px 42px; display: grid; grid-template-columns: repeat(${parts.length}, minmax(0, 1fr)); align-items: center; gap: 26px; color: #18354c; font: 700 30px system-ui; background-color: ${mat}; background-image: radial-gradient(${line} 1.7px, transparent 1.7px); background-size: 24px 24px; }
.clip { position: relative !important; inset: auto !important; }
.clip + .clip::before { content: ""; position: absolute; width: 24px; border-top: 3px dotted ${line}; left: -25px; top: 43%; }
.tile { text-align: center; display: grid; justify-items: center; gap: 8px; }
.picture { position: relative; display: grid; place-items: center; width: 100%; height: 114px; }
.picture::before { content: ""; width: 112px; height: 80px; border-radius: 40%; position: absolute; background: #ffffff91; transform: rotate(-11deg); }
.picture i { display: block; position: relative; font: 76px/1.1 "Segoe UI Emoji", "Apple Color Emoji", sans-serif; filter: drop-shadow(0 7px 3px #15303c37); }
.tile b { border-radius: 999px; padding: 3px 16px 5px; line-height: 1.1; background: #fff; max-width: 100%; }
.spark { position: absolute; left: 76%; top: 12%; font: 700 28px system-ui; color: ${ink}; opacity: 0; }
</style>
<script src="/english/gsap.min.js"></script>
</head>
<body>
<main id="diagram" data-composition-id="diagram" data-width="840" data-height="232" data-duration="3.2">${steps.join("")}</main>
<script>
const tl = gsap.timeline({ paused: true });
const entries = [
  { x: -24, rotation: -16 },
  { y: 28, scale: .64 },
  { x: 25, rotation: 16 },
  { y: -22, scale: 1.22 }
];
tl.fromTo(".picture i", { ...entries[${variant}], opacity: .7 },
  { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, duration: .72, stagger: .24, ease: "back.out(1.65)" });
tl.fromTo(".tile b", { y: 12 }, { y: 0, duration: .46, stagger: .24, ease: "power3.out" }, .19);
tl.to(".picture i", { y: -9, rotation: ${variant % 2 === 0 ? -7 : 7}, duration: .26, stagger: .13, yoyo: true, repeat: 1, ease: "sine.inOut" }, 1.32);
tl.fromTo(".spark", { opacity: 0, scale: .35 }, { opacity: .85, scale: 1.1, duration: .23, stagger: .15, yoyo: true, repeat: 1 }, 1.45);
tl.to({}, { duration: .3 }, 2.9);
window.__timelines = { diagram: tl };
</script>
<script src="/english/runtime.js"></script>
</body>
</html>`;
}
