import * as THREE from "three";

export function showPencils(host, far) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch {
    host.textContent = far ? "✋　　　　 ✏️✏️" : "✋ ✏️";
    return () => {};
  }
  host.replaceChildren(renderer.domElement);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-3, 3, 2, -2, 0.1, 50);
  camera.position.set(0, 3, 12);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xfff7df, 0xc2cfe9, 2.4));
  const light = new THREE.DirectionalLight(0xfff1da, 2);
  light.position.set(-3, 6, 4);
  scene.add(light);
  for (let i = 0; i < (far ? 2 : 1); i++) {
    const pencil = new THREE.Group();
    pencil.rotation.z = -0.17;
    pencil.position.x = far ? (i - 0.5) * 0.8 : 0;
    scene.add(pencil);
    for (const [top, bottom, height, y, color] of [
      [0.23, 0.23, 2.2, 0, 0xf9b842],
      [0, 0.23, 0.45, 1.33, 0xe9c594],
      [0, 0.07, 0.14, 1.52, 0x273d51],
      [0.23, 0.23, 0.23, -1.22, 0xf2988e],
    ]) {
      const segment = new THREE.Mesh(
        new THREE.CylinderGeometry(top, bottom, height, 6),
        new THREE.MeshStandardMaterial({ color }),
      );
      segment.position.y = y;
      pencil.add(segment);
    }
  }
  const slider = host.parentElement.querySelector("input");
  function render() {
    const { clientWidth: width, clientHeight: height } = host;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.left = (-2 * width) / height;
    camera.right = -camera.left;
    camera.zoom = Number(slider.value);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
  const observer = new ResizeObserver(render);
  observer.observe(host);
  slider.addEventListener("input", render);
  render();
  return () => {
    observer.disconnect();
    slider.removeEventListener("input", render);
    scene.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
        o.material.dispose();
      }
    });
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  };
}
