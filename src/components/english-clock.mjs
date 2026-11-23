import * as THREE from "three";

export function showClock(host, hour, slider) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch {
    return;
  }
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-3, 3, 1.7, -1.7, 0.1, 20);
  camera.position.set(0, 0, 7);
  const clock = new THREE.Group();
  scene.add(clock);
  scene.add(new THREE.HemisphereLight(0xf7f3fe, 0xc5a8e6, 2.25));
  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(-3, 4, 6);
  scene.add(light);

  const materials = new Map();
  function mesh(geometry, color, x, y, z) {
    if (!materials.has(color)) {
      materials.set(
        color,
        new THREE.MeshStandardMaterial({ color, roughness: 0.46 }),
      );
    }
    const part = new THREE.Mesh(geometry, materials.get(color));
    part.position.set(x, y, z);
    clock.add(part);
    return part;
  }
  function disc(radius, depth, position, color) {
    const part = mesh(
      new THREE.CylinderGeometry(radius, radius, depth, 64),
      color,
      0,
      0,
      position,
    );
    part.rotation.x = Math.PI / 2;
  }
  function hand(angle, length, width, z, color) {
    const part = mesh(
      new THREE.BoxGeometry(width, length, 0.032),
      color,
      (Math.sin(angle) * length) / 2,
      (Math.cos(angle) * length) / 2,
      z,
    );
    part.rotation.z = -angle;
  }
  disc(1.3, 0.32, 0, 0x794fc6);
  disc(1.13, 0.07, 0.17, 0xfff4db);
  for (let mark = 0; mark < 12; mark++) {
    const angle = (mark / 12) * Math.PI * 2;
    const dot = mesh(
      new THREE.SphereGeometry(mark % 3 === 0 ? 0.055 : 0.036, 12, 8),
      0x41326b,
      Math.sin(angle) * 1.0,
      Math.cos(angle) * 1.0,
      0.225,
    );
    dot.scale.z = 0.48;
  }
  hand((hour / 12) * 2 * Math.PI, 0.57, 0.115, 0.24, 0x41326b);
  hand(0, 0.82, 0.067, 0.28, 0x187963);
  disc(0.093, 0.06, 0.31, 0xb96430);
  const initial = Number(slider.value);
  clock.rotation.y = (initial * Math.PI) / 180;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  host.replaceChildren(renderer.domElement);

  function draw() {
    const { clientWidth: width, clientHeight: height } = host;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.left = (-1.7 * width) / height;
    camera.right = -camera.left;
    camera.updateProjectionMatrix();
    clock.rotation.y = (Number(slider.value) * Math.PI) / 180;
    renderer.render(scene, camera);
  }
  slider.addEventListener("input", draw);
  const observer = new ResizeObserver(draw);
  observer.observe(host);
  draw();
  return () => {
    observer.disconnect();
    slider.removeEventListener("input", draw);
    clock.children.forEach((piece) => piece.geometry.dispose());
    materials.forEach((material) => material.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
  };
}
