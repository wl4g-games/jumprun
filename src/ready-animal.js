import * as THREE from "./vendor/three.module.min.js";
import { DEFAULT_ANIMAL_ID } from "./animal-catalog.js";
import { animateAnimalGait } from "./animal-gait.js";
import { disposeAnimalModel, loadAnimalModel } from "./animal-model-loader.js";

export async function renderReadyAnimal(canvas, initialAnimalId = DEFAULT_ANIMAL_ID) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(180, 126, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x92a17c, 2.2));
  const light = new THREE.DirectionalLight(0xfff7e7, 2.4);
  light.position.set(-3, 5, 6);
  scene.add(light);
  const camera = new THREE.OrthographicCamera(-0.95, 0.95, 0.88, -0.45, 0.1, 20);
  camera.position.set(0, 0.52, 8);
  camera.lookAt(0, 0.52, 0);

  let runner = null;
  let previewScale = 1;
  let requestGeneration = 0;
  async function setAnimal(id) {
    const request = ++requestGeneration;
    if (runner?.animal.id === id) return runner.animal;
    const next = await loadAnimalModel(id, { quality: "balanced" });
    if (request !== requestGeneration) {
      disposeAnimalModel(next);
      return null;
    }
    const previous = runner;
    runner = next;
    previewScale = Math.min(1, 1.72 / Math.max(0.1, runner.root.userData.visualSize?.x || 1.72));
    runner.root.rotation.y = -0.08;
    runner.root.scale.setScalar(previewScale);
    scene.add(runner.root);
    if (previous) {
      scene.remove(previous.root);
      disposeAnimalModel(previous);
    }
    return runner.animal;
  }
  await setAnimal(initialAnimalId);

  renderer.render(scene, camera);
  return {
    setAnimal,
    render(now, visible, animate = true) {
      if (!visible || !runner) return;
      const seconds = now / 1000;
      const local = seconds % 2.2;
      const airborne = animate && local >= 1.35 && local < 1.95;
      const jumpProgress = airborne ? (local - 1.35) / 0.6 : 0;
      const bounce = airborne ? Math.sin(jumpProgress * Math.PI) : 0;
      const gaitPose = animateAnimalGait(runner.rig, {
        distance: seconds * 130,
        elapsed: seconds,
        running: animate && !airborne,
        airborne,
        verticalVelocity: airborne ? Math.cos(jumpProgress * Math.PI) * 650 : 0,
        dt: 1 / 60,
        reducedMotion: false
      });
      runner.root.position.y = bounce * 0.2 + gaitPose.bob;
      runner.root.rotation.x = gaitPose.roll;
      runner.root.rotation.z = gaitPose.pitch;
      runner.root.scale.setScalar(previewScale);
      runner.coat?.update({
        elapsed: seconds,
        dt: animate ? 1 / 60 : 0,
        speed: animate && !airborne ? 360 : 0,
        verticalVelocity: airborne ? Math.cos(jumpProgress * Math.PI) * 650 : 0,
        paused: !animate
      });
      renderer.render(scene, camera);
    }
  };
}
