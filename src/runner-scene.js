import { createBunnyFall as createRunnerFall } from "./bunny-fall.js";
import { createScoreStars, starSlot } from "./score-stars.js";
import { SUN } from "./sun-light.js";
import * as THREE from "./vendor/three.module.min.js";
import { createToyFinish } from "./toy-finish.js";
import { createCarrot } from "./carrot.js";
import { createDesert } from "./desert-scene.js";
import { DINO } from "./dino-game.js";
import { createRubberBody } from "./rubber-body.js";
import { disposeAnimalModel, loadAnimalModel } from "./animal-model-loader.js";
import { DEFAULT_ANIMAL_ID } from "./animal-catalog.js";
import { createObstacleModel } from "./obstacle-model.js";
import { animateAnimalGait } from "./animal-gait.js";
export async function createRunnerScene(canvas, initialAnimalId = DEFAULT_ANIMAL_ID) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#238fe0");
  const finish = createToyFinish(renderer);
  scene.environment = finish.environment;
  scene.environmentIntensity = 0.45;
  const camera = new THREE.OrthographicCamera(-5, 5, 1.8, -1.8, 0.1, 90);
  camera.position.set(0, 3.45, 15);
  camera.lookAt(0, 1.3, 0);
  scene.add(new THREE.HemisphereLight(16777215, 7374419, 0.85));
  const light = new THREE.DirectionalLight(16773590, 2.8);
  light.position.set(SUN.x, SUN.y, SUN.z);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.radius = 4;
  light.shadow.normalBias = 0.025;
  const fill = new THREE.DirectionalLight(14086143, 0.65);
  fill.position.set(4, 3, -3);
  scene.add(fill);
  Object.assign(light.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
  scene.add(light);
  const desert = await createDesert(scene);
  let animalInstance = null, animalRoot = null, model = null, head = null, rig = null;
  let currentAnimalId = DEFAULT_ANIMAL_ID;
  let animalRequestGeneration = 0;
  async function setAnimal(id) {
    const request = ++animalRequestGeneration;
    if (animalInstance?.animal.id === id) return animalInstance.animal;
    const next = await loadAnimalModel(id, { quality: "balanced" });
    if (request !== animalRequestGeneration) {
      disposeAnimalModel(next);
      return null;
    }
    const previous = animalInstance;
    animalInstance = next;
    animalRoot = next.root;
    model = next.model;
    rig = next.rig;
    head = rig.headPivot || model.getObjectByName("head") || model;
    currentAnimalId = next.animal.id;
    scene.add(animalRoot);
    if (previous) {
      scene.remove(previous.root);
      disposeAnimalModel(previous);
    }
    return next.animal;
  }
  await setAnimal(initialAnimalId);
  const obstacles = /* @__PURE__ */ new Map(), carrots = /* @__PURE__ */ new Map();
  function createObstacle(o) {
    const group = createObstacleModel(o);
    scene.add(group);
    return group;
  }
  const starShape = new THREE.Shape();
  const starPoints = Array.from({ length: 10 }, (_, i) => {
    const angle = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.048 : 0.102;
    return new THREE.Vector2(Math.cos(angle) * r, Math.sin(angle) * r);
  });
  for (let i = 0; i < 10; i++) {
    const point = starPoints[i], before = point.clone().lerp(starPoints[(i + 9) % 10], 0.16), after = point.clone().lerp(starPoints[(i + 1) % 10], 0.16);
    if (i === 0) starShape.moveTo(before.x, before.y);
    else starShape.lineTo(before.x, before.y);
    starShape.quadraticCurveTo(point.x, point.y, after.x, after.y);
  }
  starShape.closePath();
  const starGeometry = new THREE.ExtrudeGeometry(starShape, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 9e-3, bevelSegments: 4, steps: 1, curveSegments: 5 });
  starGeometry.translate(0, 0, -0.0175);
  const stars = [];
  function addScoreStar() {
    const mesh = new THREE.Mesh(starGeometry, new THREE.MeshPhysicalMaterial({ color: "#ffd333", roughness: 0.32, metalness: 0, clearcoat: 0.32, clearcoatRoughness: 0.3, emissive: "#ffc329", emissiveIntensity: 0.18, envMapIntensity: 0.8, transparent: true, depthWrite: false, depthTest: false }));
    mesh.visible = false;
    mesh.renderOrder = 20;
    scene.add(mesh);
    stars.push(mesh);
  }
  const scoreStars = createScoreStars(), headBox = new THREE.Box3();
  let activeStars = [], deathAge = 0;
  const rubber = createRubberBody();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let fall = null, lastBodyAngle = -0.1, fallShape = null;
  let takeoffAge = 10;
  let lastTime = 0, lastJumps = 0, lastElapsed = 0;
  return { setAnimal, getAnimalId: () => currentAnimalId, render(state, now, paused = false) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) renderer.setSize(w, h, false);
    const dt = paused ? 0 : Math.min(0.05, Math.max(0, (now - (lastTime || now)) / 1e3));
    lastTime = now;
    takeoffAge = state.phase === "playing" && state.jumps > lastJumps ? 0 : takeoffAge + dt;
    if (state.phase !== "playing") takeoffAge = 10;
    activeStars = scoreStars.update(state.score, state.phase, dt);
    deathAge = state.phase === "over" ? deathAge + dt : 0;
    if (state.phase !== "over") {
      fall = null;
      fallShape = null;
    }
    camera.position.x = state.phase === "over" ? Math.sin(deathAge * 65) * 0.065 * Math.exp(-deathAge * 8) : 0;
    const motionDt = state.phase === "playing" ? Math.max(0, Math.min(0.05, state.elapsed - lastElapsed)) : dt;
    lastElapsed = state.elapsed;
    const softness = rubber.update(state, motionDt);
    if (state.phase === "over" && !fall) {
      fallShape = { ...softness };
      fall = createRunnerFall(state.impact || { speed: state.speed, vy: state.vy, y: state.y, contactY: state.y + 55 }, lastBodyAngle, fallShape.vertical, fallShape.horizontal);
    }
    const bodyShape = fallShape || softness;
    const squashFactor = rig.realistic ? 0.18 : 1;
    animalRoot.scale.set(
      1 + (bodyShape.horizontal - 1) * squashFactor,
      1 + (bodyShape.vertical - 1) * squashFactor,
      1 + (bodyShape.horizontal - 1) * squashFactor
    );
    const zoom = (state.viewWidth || 1e3) / 1e3;
    camera.left = -5;
    camera.right = -5 + 10 * zoom;
    camera.top = 2.7 * zoom;
    camera.bottom = -1.8 * zoom;
    camera.position.y = 1.3 * zoom + 2.15;
    camera.lookAt(camera.position.x, 1.3 * zoom, 0);
    if (!reducedMotion.matches && takeoffAge < 0.18) {
      camera.position.y += 0.035 * zoom * Math.cos(takeoffAge * 55) * Math.exp(-takeoffAge * 22);
    }
    camera.updateProjectionMatrix();
    const running = state.phase === "playing" && state.y === 0;
    const airborne = state.phase === "playing" && state.y > 0;
    const gaitPose = animateAnimalGait(rig, {
      distance: state.distance,
      elapsed: state.elapsed,
      running,
      airborne,
      verticalVelocity: state.vy,
      dt: motionDt,
      reducedMotion: reducedMotion.matches
    });
    animalRoot.position.set((DINO.x + DINO.width / 2) / 100 - 5, state.y / 100 + gaitPose.bob, 0);
    animalRoot.rotation.set(0, 0, 0);
    animalRoot.rotation.x = gaitPose.roll;
    animalRoot.rotation.z = (state.phase === "playing" ? -0.075 : 0) + gaitPose.pitch + softness.lean;
    if (head && !rig.realistic) head.rotation.z -= softness.lean * 0.5;
    if (fall) {
      const pose = fall.step(dt);
      animalRoot.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), pose.angle);
      animalRoot.position.x += pose.x;
      animalRoot.position.y = pose.y;
    } else lastBodyAngle = -0.1 + softness.lean;
    animalInstance.coat?.update({
      elapsed: state.elapsed,
      dt: motionDt,
      speed: running ? state.speed : 0,
      verticalVelocity: state.vy,
      paused
    });
    animalRoot.updateMatrixWorld(true);
    if (rig.scoreAnchor) {
      const anchor = rig.scoreAnchor.getWorldPosition(new THREE.Vector3());
      const radius = 0.12 * zoom;
      headBox.min.set(anchor.x - radius, anchor.y - radius, anchor.z - radius);
      headBox.max.set(anchor.x + radius, anchor.y + radius, anchor.z + radius);
    } else {
      headBox.setFromObject(head || model);
    }
    while (stars.length < activeStars.length) addScoreStar();
    stars.forEach((mesh, i) => {
      const reward = activeStars[i];
      mesh.visible = Boolean(reward);
      if (!reward) return;
      if (reward.baseY === void 0) {
        reward.scale = zoom;
        reward.baseY = headBox.max.y + 0.18 * zoom;
        reward.baseX = activeStars.find((star) => star.baseX !== void 0)?.baseX ?? (headBox.min.x + headBox.max.x) / 2;
      }
      const slot = starSlot(reward.lane), age = reward.age;
      mesh.position.set(reward.baseX + slot.x * reward.scale, reward.baseY + age * 0.55 * reward.scale, 0.6);
      mesh.quaternion.copy(camera.quaternion);
      mesh.rotateY(0.22 + Math.sin(age * 4) * 0.12);
      mesh.scale.setScalar(reward.scale);
      mesh.material.opacity = age < 1 ? 1 : Math.max(0, (1.3 - age) / 0.3);
    });
    lastJumps = state.jumps;
    for (const o of state.obstacles) {
      if (!obstacles.has(o)) obstacles.set(o, createObstacle(o));
      const obstacle = obstacles.get(o);
      obstacle.position.x = (o.x + o.width / 2) / 100 - 5;
      obstacle.userData.animate?.(state.elapsed, state.speed);
    }
    for (const [o, mesh] of obstacles) if (!state.obstacles.includes(o)) {
      scene.remove(mesh);
      mesh.traverse((child) => {
        child.geometry?.dispose();
        child.material?.dispose();
      });
      obstacles.delete(o);
    }
    for (const c of state.carrots) {
      if (!carrots.has(c)) {
        const mesh2 = createCarrot();
        scene.add(mesh2);
        carrots.set(c, mesh2);
      }
      const mesh = carrots.get(c);
      mesh.position.set((c.x + c.width / 2) / 100 - 5, (c.bottom + c.height / 2) / 100, 0);
      mesh.rotation.y = state.elapsed * 1.8;
      mesh.rotation.z = -0.2;
    }
    for (const [c, mesh] of carrots) if (!state.carrots.includes(c)) {
      scene.remove(mesh);
      mesh.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
      carrots.delete(c);
    }
    desert.update(state.distance, state.elapsed, state.y, state.speed, zoom, dt);
    finish.render(scene, camera);
  }, captureShareBackground() {
    const hidden = [...obstacles.values(), ...carrots.values(), ...stars].map((node) => [node, node.visible]);
    const size = renderer.getSize(new THREE.Vector2()), ratio = renderer.getPixelRatio();
    const center = (camera.left + camera.right) / 2, zoom = (camera.right - camera.left) / 10;
    const animalTransform = {
      visible: animalRoot.visible,
      position: animalRoot.position.clone(),
      quaternion: animalRoot.quaternion.clone(),
      scale: animalRoot.scale.clone()
    };
    const plants = [
      createObstacleModel({ species: "cactus", kind: "regular", width: 38, height: 88, variant: 1 }),
      createObstacleModel({ species: "qilin", kind: "tall", width: 88, height: 132, variant: 0.6 })
    ];
    const cardCamera = camera.clone();
    cardCamera.left = center - 5 * zoom;
    cardCamera.right = center + 5 * zoom;
    cardCamera.top = 3.2 * zoom;
    cardCamera.bottom = -2.54 * zoom;
    cardCamera.updateProjectionMatrix();
    try {
      for (const [node] of hidden) node.visible = false;
      animalRoot.visible = true;
      animalRoot.position.set(center, 0, 0.6);
      animalRoot.rotation.set(0, 0, 0);
      animalRoot.scale.setScalar(zoom * 1.65);
      plants.forEach((plant, i) => {
        plant.position.set(center + (i ? 2.7 : -2.7) * zoom, 0, 0.4);
        plant.scale.setScalar(zoom * 1.35);
        scene.add(plant);
      });
      renderer.setPixelRatio(1);
      renderer.setSize(1080, 620, false);
      finish.render(scene, cardCamera);
      const picture = document.createElement("canvas");
      picture.width = 1080;
      picture.height = 620;
      picture.getContext("2d").drawImage(canvas, 0, 0);
      return picture;
    } finally {
      for (const [node, visible] of hidden) node.visible = visible;
      animalRoot.visible = animalTransform.visible;
      animalRoot.position.copy(animalTransform.position);
      animalRoot.quaternion.copy(animalTransform.quaternion);
      animalRoot.scale.copy(animalTransform.scale);
      for (const plant of plants) {
        scene.remove(plant);
        plant.traverse((node) => {
          node.geometry?.dispose();
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          for (const material of materials) material?.dispose();
        });
      }
      renderer.setPixelRatio(ratio);
      renderer.setSize(size.x, size.y, false);
      finish.render(scene, camera);
    }
  } };
}
