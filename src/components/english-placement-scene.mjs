import * as THREE from "three";
import { placementItems } from "../content/english-placement.mjs";

export function showPlacement(host, { item, surface }, initial) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-4, 4, 2.8, -2.8, 0.1, 40);
  camera.position.set(0, 0, 12);
  scene.add(new THREE.HemisphereLight(0xfff5df, 0xacc9ef, 2.35));
  const key = new THREE.DirectionalLight(0xffedd9, 2.3);
  key.position.set(-3, 5, 6);
  scene.add(key);

  function mesh(parent, geometry, color, x, y, z) {
    const object = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color, roughness: 0.65 }),
    );
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  }
  const box = (parent, w, h, d, c, x = 0, y = 0, z = 0) =>
    mesh(parent, new THREE.BoxGeometry(w, h, d), c, x, y, z);
  const sphere = (parent, r, c, x = 0, y = 0, z = 0) =>
    mesh(parent, new THREE.SphereGeometry(r, 28, 20), c, x, y, z);
  const anchor = new THREE.Group();
  anchor.rotation.set(0.13, -0.16, 0);
  scene.add(anchor);
  const width = surface === "chair" ? 1.65 : 2.35;
  const wood = {
    desk: 0x9474d2,
    chair: 0x68a5be,
    table: 0x58ae9b,
    bench: 0xbe8f63,
  }[surface];
  box(anchor, width, 0.26, 1.12, wood, 0, 0.08);
  for (const x of [-width * 0.4, width * 0.4]) {
    for (const z of [-0.38, 0.38]) {
      box(anchor, 0.16, 1.52, 0.16, wood, x, -0.79, z);
    }
  }
  if (surface === "chair") {
    box(anchor, 1.5, 0.55, 0.16, wood, 0, 1.05, -0.48);
    for (const x of [-0.56, 0.56])
      box(anchor, 0.16, 0.84, 0.16, wood, x, 0.55, -0.48);
  }

  const piece = new THREE.Group();
  piece.rotation.set(0.15, -0.18, item === "pencil" ? -0.82 : 0.12);
  scene.add(piece);
  const color = placementItems[item].color;
  if (item === "pencil") {
    mesh(
      piece,
      new THREE.CylinderGeometry(0.13, 0.13, 0.94, 6),
      color,
      0,
      0,
      0,
    );
    mesh(piece, new THREE.ConeGeometry(0.13, 0.28, 6), 0xe8be95, 0, 0.61, 0);
    mesh(piece, new THREE.ConeGeometry(0.044, 0.08, 6), 0x453746, 0, 0.76, 0);
    mesh(
      piece,
      new THREE.CylinderGeometry(0.14, 0.14, 0.22, 12),
      0xe885a4,
      0,
      -0.56,
      0,
    );
  } else if (item === "book") {
    box(piece, 1.05, 0.18, 0.7, 0xfff3dc);
    box(piece, 1.11, 0.05, 0.72, color, 0, 0.12);
    box(piece, 1.11, 0.05, 0.72, color, 0, -0.12);
    box(piece, 0.09, 0.23, 0.73, color, -0.54, 0);
    box(piece, 0.16, 0.018, 0.31, 0xffd466, 0.22, 0.155, 0.06);
  } else if (item === "bag") {
    sphere(piece, 0.51, color).scale.set(1, 1.1, 0.64);
    box(piece, 0.64, 0.16, 0.25, 0x7254b5, 0, -0.11, 0.26);
    mesh(
      piece,
      new THREE.TorusGeometry(0.16, 0.05, 10, 24),
      0x7254b5,
      0,
      0.57,
      0,
    );
  } else if (item === "apple") {
    sphere(piece, 0.4, color).scale.set(1, 0.92, 1);
    box(piece, 0.065, 0.22, 0.06, 0x6d4a36, 0, 0.39);
    sphere(piece, 0.16, 0x58a370, 0.15, 0.47, 0).scale.set(1, 0.45, 0.55);
  } else if (item === "ball") {
    sphere(piece, 0.4, color);
    for (const angle of [-0.8, 0.78]) {
      const line = mesh(
        piece,
        new THREE.TorusGeometry(0.403, 0.016, 8, 52),
        0x80421e,
        0,
        0,
        0,
      );
      line.rotation.y = angle;
    }
  } else if (item === "cup") {
    mesh(
      piece,
      new THREE.CylinderGeometry(0.3, 0.22, 0.68, 24),
      color,
      0,
      0,
      0,
    );
    mesh(
      piece,
      new THREE.CylinderGeometry(0.255, 0.255, 0.03, 24),
      0xfff2d1,
      0,
      0.35,
      0,
    );
    mesh(
      piece,
      new THREE.TorusGeometry(0.18, 0.048, 9, 24),
      color,
      0.31,
      0.02,
      0,
    );
  } else {
    box(piece, 1.15, 0.23, 0.11, color);
    for (let i = 0; i < 8; i++)
      box(
        piece,
        0.023,
        i % 2 ? 0.085 : 0.13,
        0.02,
        0x6b452f,
        i * 0.13 - 0.49,
        0.05,
        0.06,
      );
  }

  let point = initial;
  let span = 8;
  function draw() {
    piece.position.set((point.x - 0.5) * span, (0.5 - point.y) * 5.6, 1.25);
    renderer.render(scene, camera);
  }
  function resize() {
    const { clientWidth, clientHeight } = host;
    if (!clientWidth || !clientHeight) return;
    span = (5.6 * clientWidth) / clientHeight;
    camera.left = -span / 2;
    camera.right = span / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(clientWidth, clientHeight, false);
    draw();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  return {
    move(position) {
      point = position;
      draw();
    },
    dispose() {
      observer.disconnect();
      scene.traverse((part) => {
        if (!part.isMesh) return;
        part.geometry.dispose();
        part.material.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
