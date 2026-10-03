import * as THREE from "./vendor/three.module.min.js";
import { createAnimalModel, disposeObject3D } from "./animal-model.js";
import { DEFAULT_ANIMAL_ID } from "./animal-catalog.js";

export async function renderReadyAnimal(canvas, initialAnimalId = DEFAULT_ANIMAL_ID) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(180, 126, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x92a17c, 2.2));
  const light = new THREE.DirectionalLight(0xfff7e7, 2.4);
  light.position.set(-3, 5, 6);
  scene.add(light);
  const camera = new THREE.OrthographicCamera(-0.82, 0.82, 0.72, -0.43, 0.1, 20);
  camera.position.set(0, 0.52, 8);
  camera.lookAt(0, 0.52, 0);

  let runner = null;
  function setAnimal(id) {
    if (runner) {
      scene.remove(runner.root);
      disposeObject3D(runner.root);
    }
    runner = createAnimalModel(id);
    runner.root.rotation.y = -0.08;
    scene.add(runner.root);
    return runner.animal;
  }
  setAnimal(initialAnimalId);

  renderer.render(scene, camera);
  return {
    setAnimal,
    render(now, visible, animate = true) {
      if (!visible || !runner) return;
      const phase = now % 1800 / 1000;
      const local = phase < 0.6 ? phase : -1;
      const bounce = animate && local >= 0 ? Math.sin(local / 0.6 * Math.PI) : 0;
      runner.root.position.y = bounce * 0.2;
      runner.root.scale.set(1 - bounce * 0.04, 1 + bounce * 0.06, 1 - bounce * 0.04);
      for (const { pivot, phase: limbPhase } of runner.parts.legs) pivot.rotation.z = bounce * limbPhase * -0.35;
      for (const { pivot } of runner.parts.arms) pivot.rotation.z = bounce * -0.3;
      renderer.render(scene, camera);
    }
  };
}
