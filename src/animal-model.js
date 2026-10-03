import * as THREE from "./vendor/three.module.min.js";
import { animalById } from "./animal-catalog.js";

const sphereGeometry = (width = 16, height = 12) => new THREE.SphereGeometry(1, width, height);

function toyMaterial(color, roughness = 0.42) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness: 0,
    clearcoat: 0.2,
    clearcoatRoughness: 0.38,
    envMapIntensity: 0.8
  });
}

function mesh(parent, geometry, color, position, scale, rotation = [0, 0, 0], name = "") {
  const item = new THREE.Mesh(geometry, toyMaterial(color));
  item.position.set(...position);
  item.scale.set(...scale);
  item.rotation.set(...rotation);
  item.name = name;
  parent.add(item);
  return item;
}

function ball(parent, color, position, scale, name = "") {
  return mesh(parent, sphereGeometry(), color, position, scale, [0, 0, 0], name);
}

function cone(parent, color, position, scale, rotation = [0, 0, 0], name = "") {
  return mesh(parent, new THREE.ConeGeometry(1, 2, 10), color, position, scale, rotation, name);
}

function cylinder(parent, color, position, scale, rotation = [0, 0, 0], name = "") {
  return mesh(parent, new THREE.CylinderGeometry(1, 1, 1, 12), color, position, scale, rotation, name);
}

function addEye(parent, x, y, z, size = 0.035, color = "#172521") {
  ball(parent, color, [x, y, z], [size, size * 1.12, size * 0.42], "eye");
}

function addEar(parent, color, x, y, z, size = 0.12, tilt = 0) {
  cone(parent, color, [x, y, z], [size * 0.72, size, size * 0.48], [0, 0, tilt], "ear");
}

function addLeg(parent, parts, color, x, y, z, length = 0.38, radius = 0.075, phase = 1) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  parent.add(pivot);
  cylinder(pivot, color, [0, -length / 2, 0], [radius, length, radius * 0.9]);
  ball(pivot, color, [radius * 0.4, -length, 0.025], [radius * 1.45, radius * 0.58, radius * 1.05], "foot");
  parts.legs.push({ pivot, phase });
  return pivot;
}

function addArm(parent, parts, color, x, y, z, length = 0.25, radius = 0.055, phase = 1) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  parent.add(pivot);
  cylinder(pivot, color, [length / 2, -length * 0.15, 0], [radius, length, radius], [0, 0, -Math.PI / 2.3]);
  parts.arms.push({ pivot, phase });
  return pivot;
}

function addSpots(parent, color, coordinates) {
  for (const [x, y, size = 0.035] of coordinates) {
    ball(parent, color, [x, y, 0.238], [size, size * 0.75, 0.012], "spot");
  }
}

function createQuadruped(style) {
  const model = new THREE.Group();
  const parts = { legs: [], arms: [], tail: null, head: null };
  const body = ball(model, style.body, [0, 0.55, 0], style.bodyScale || [0.5, 0.3, 0.24], "body");
  ball(model, style.belly || style.body, [0.13, 0.49, 0.225], [0.27, 0.19, 0.018], "belly");
  parts.head = ball(model, style.head || style.body, style.headPosition || [0.43, 0.74, 0], style.headScale || [0.25, 0.23, 0.22], "head");
  ball(model, style.muzzle || "#f3d0a2", style.muzzlePosition || [0.61, 0.67, 0.035], style.muzzleScale || [0.18, 0.12, 0.17], "muzzle");
  addEye(model, style.eyeX || 0.51, style.eyeY || 0.79, style.eyeZ || 0.2, style.eyeSize || 0.033);
  const legColor = style.legs || style.body;
  addLeg(model, parts, legColor, 0.29, 0.44, 0.13, style.legLength || 0.36, style.legRadius || 0.07, 1);
  addLeg(model, parts, legColor, -0.28, 0.44, 0.13, style.legLength || 0.36, style.legRadius || 0.07, -1);
  addLeg(model, parts, style.backLegs || legColor, 0.27, 0.43, -0.13, style.legLength || 0.36, style.legRadius || 0.07, -1);
  addLeg(model, parts, style.backLegs || legColor, -0.29, 0.43, -0.13, style.legLength || 0.36, style.legRadius || 0.07, 1);
  if (style.tail !== false) {
    parts.tail = cone(model, style.tailColor || style.body, [-0.58, 0.59, 0], style.tailScale || [0.12, 0.34, 0.12], [0, 0, Math.PI / 2], "tail");
  }
  return { model, parts, body };
}

function createTrex() {
  const model = new THREE.Group();
  const parts = { legs: [], arms: [], tail: null, head: null };
  ball(model, "#62a85c", [0, 0.65, 0], [0.48, 0.37, 0.28], "body");
  ball(model, "#8dcc69", [0.17, 0.62, 0.265], [0.28, 0.24, 0.025], "belly");
  parts.head = mesh(model, new THREE.BoxGeometry(1, 1, 1), "#69b45f", [0.39, 1.02, 0], [0.34, 0.25, 0.25], [0, 0, -0.05], "head");
  mesh(model, new THREE.BoxGeometry(1, 1, 1), "#8dce70", [0.57, 0.91, 0.018], [0.27, 0.09, 0.22], [0, 0, -0.03], "jaw");
  addEye(model, 0.5, 1.08, 0.255, 0.045);
  for (const x of [0.43, 0.53, 0.63]) cone(model, "#fff4d5", [x, 0.83, 0.18], [0.025, 0.055, 0.025], [0, 0, Math.PI], "tooth");
  addLeg(model, parts, "#4d914d", 0.18, 0.48, 0.16, 0.48, 0.105, 1);
  addLeg(model, parts, "#477f45", -0.18, 0.48, -0.12, 0.48, 0.105, -1);
  addArm(model, parts, "#579d50", 0.26, 0.78, 0.23, 0.25, 0.045, 1);
  addArm(model, parts, "#4d8b48", 0.2, 0.8, -0.18, 0.23, 0.043, -1);
  parts.tail = cone(model, "#4f934b", [-0.63, 0.64, -0.02], [0.18, 0.63, 0.18], [0, 0, Math.PI / 2], "tail");
  for (let i = 0; i < 5; i++) addEar(model, "#397c43", -0.31 + i * 0.13, 0.96 - Math.abs(i - 2) * 0.04, -0.06, 0.07, 0);
  return { model, parts };
}

function createLeopard() {
  const result = createQuadruped({ body: "#d99b32", belly: "#f3c967", muzzle: "#f6d9a2", tailScale: [0.085, 0.48, 0.085] });
  addEar(result.model, "#a86a23", 0.32, 0.94, 0, 0.12, -0.2);
  addEar(result.model, "#a86a23", 0.5, 0.96, -0.05, 0.12, 0.16);
  addSpots(result.model, "#4e3523", [[-0.31, 0.62], [-0.12, 0.49], [0.08, 0.69], [0.28, 0.51], [0.39, 0.78, 0.026]]);
  return result;
}

function createRabbit() {
  const result = createQuadruped({ body: "#f4eee4", belly: "#fffaf2", muzzle: "#f5cfca", headScale: [0.26, 0.25, 0.23], tail: false, legs: "#e8dfd3" });
  ball(result.model, "#fffaf2", [-0.5, 0.63, 0], [0.15, 0.15, 0.15], "tail");
  const left = ball(result.model, "#f2eae1", [0.34, 1.08, 0], [0.09, 0.3, 0.07], "ear");
  left.rotation.z = -0.1;
  const right = ball(result.model, "#f2eae1", [0.5, 1.09, -0.03], [0.09, 0.3, 0.07], "ear");
  right.rotation.z = 0.12;
  ball(result.model, "#dba8aa", [0.34, 1.1, 0.065], [0.035, 0.22, 0.012], "inner-ear");
  return result;
}

function createLion() {
  const result = createQuadruped({ body: "#d79a48", belly: "#edbd73", muzzle: "#f1c985", tailScale: [0.05, 0.5, 0.05] });
  ball(result.model, "#8d552f", [0.42, 0.76, -0.06], [0.36, 0.36, 0.13], "mane");
  result.parts.head.position.z = 0.05;
  addEye(result.model, 0.51, 0.8, 0.25, 0.032);
  addEar(result.model, "#9a5d30", 0.28, 0.96, 0, 0.11, -0.25);
  addEar(result.model, "#9a5d30", 0.55, 0.96, -0.02, 0.11, 0.25);
  ball(result.model, "#7d482b", [-0.84, 0.59, 0], [0.11, 0.13, 0.1], "tail-tip");
  return result;
}

function createElephant() {
  const result = createQuadruped({ body: "#8fa6ac", head: "#9bafb4", muzzle: "#9bafb4", muzzlePosition: [0.59, 0.69, 0.02], muzzleScale: [0.14, 0.15, 0.17], legs: "#849ba2", tailScale: [0.035, 0.4, 0.035], legRadius: 0.09 });
  ball(result.model, "#80979f", [0.39, 0.77, -0.07], [0.29, 0.32, 0.07], "ear");
  ball(result.model, "#a9bdc1", [0.42, 0.77, 0.2], [0.25, 0.29, 0.035], "ear");
  const trunk = cylinder(result.model, "#91a9ae", [0.65, 0.51, 0.11], [0.065, 0.34, 0.065], [0, 0, -0.12], "trunk");
  trunk.geometry.translate(0, -0.25, 0);
  cone(result.model, "#fff1cf", [0.61, 0.57, 0.21], [0.035, 0.12, 0.035], [0, 0, Math.PI], "tusk");
  return result;
}

function createGiraffe() {
  const result = createQuadruped({ body: "#dfaa4e", belly: "#f0c879", head: "#e2ae55", muzzle: "#f1ca82", headPosition: [0.38, 1.35, 0], headScale: [0.24, 0.17, 0.18], muzzlePosition: [0.57, 1.3, 0.03], muzzleScale: [0.16, 0.1, 0.14], eyeX: 0.46, eyeY: 1.39, eyeZ: 0.17, legLength: 0.46, legRadius: 0.055, tailScale: [0.045, 0.42, 0.045] });
  cylinder(result.model, "#dba54d", [0.22, 0.93, 0], [0.11, 0.72, 0.12], [0, 0, -0.08], "neck");
  for (const x of [0.31, 0.46]) {
    cylinder(result.model, "#aa7132", [x, 1.55, 0], [0.022, 0.13, 0.022], [0, 0, 0], "ossicone");
    ball(result.model, "#80522d", [x, 1.62, 0], [0.045, 0.04, 0.04], "ossicone-tip");
  }
  addSpots(result.model, "#98602b", [[-0.32, 0.61, 0.06], [-0.08, 0.49, 0.05], [0.13, 0.68, 0.055], [0.27, 1.03, 0.045], [0.31, 1.25, 0.04]]);
  return result;
}

function createPanda() {
  const result = createQuadruped({ body: "#f3eee3", belly: "#faf7ef", head: "#f7f2e8", muzzle: "#e9dfd1", legs: "#242c2b", backLegs: "#242c2b", tail: false });
  ball(result.model, "#202827", [0.31, 0.91, -0.02], [0.11, 0.11, 0.09], "ear");
  ball(result.model, "#202827", [0.53, 0.92, -0.03], [0.11, 0.11, 0.09], "ear");
  const patch = ball(result.model, "#26302e", [0.5, 0.79, 0.205], [0.075, 0.1, 0.018], "eye-patch");
  patch.rotation.z = -0.35;
  addEye(result.model, 0.51, 0.8, 0.224, 0.025, "#f8f8ed");
  ball(result.model, "#202827", [-0.5, 0.62, 0], [0.12, 0.12, 0.12], "tail");
  return result;
}

function createFox() {
  const result = createQuadruped({ body: "#dd7138", belly: "#f3d6b1", muzzle: "#f7e1c2", headScale: [0.25, 0.22, 0.21], tailScale: [0.18, 0.52, 0.17], tailColor: "#cf6232", legs: "#5a4033" });
  addEar(result.model, "#9e4830", 0.31, 1, 0, 0.18, -0.16);
  addEar(result.model, "#9e4830", 0.51, 1.01, -0.04, 0.18, 0.16);
  ball(result.model, "#fff1dc", [-0.88, 0.59, 0], [0.12, 0.16, 0.12], "tail-tip");
  return result;
}

function createMonkey() {
  const result = createQuadruped({ body: "#8c5f3d", belly: "#c69462", head: "#8f603e", muzzle: "#d5a576", tail: false, legs: "#6e4934" });
  ball(result.model, "#c7966a", [0.22, 0.77, 0], [0.13, 0.15, 0.08], "ear");
  ball(result.model, "#c7966a", [0.62, 0.77, -0.03], [0.13, 0.15, 0.08], "ear");
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.42, 0.62, -0.08),
    new THREE.Vector3(-0.7, 0.76, -0.05),
    new THREE.Vector3(-0.74, 1.02, 0),
    new THREE.Vector3(-0.58, 1.05, 0.03)
  ]);
  result.parts.tail = mesh(result.model, new THREE.TubeGeometry(curve, 18, 0.035, 8, false), "#714932", [0, 0, 0], [1, 1, 1], [0, 0, 0], "tail");
  return result;
}

function createPenguin() {
  const model = new THREE.Group();
  const parts = { legs: [], arms: [], tail: null, head: null };
  ball(model, "#26383c", [0, 0.58, 0], [0.37, 0.55, 0.28], "body");
  ball(model, "#f4f0dc", [0.13, 0.52, 0.27], [0.25, 0.39, 0.025], "belly");
  parts.head = ball(model, "#243437", [0.04, 1.0, 0], [0.3, 0.28, 0.25], "head");
  cone(model, "#e09b35", [0.34, 0.97, 0.08], [0.09, 0.2, 0.08], [0, 0, -Math.PI / 2], "beak");
  addEye(model, 0.16, 1.06, 0.24, 0.035, "#f8f5e9");
  addArm(model, parts, "#1f3034", 0.05, 0.68, 0.22, 0.42, 0.075, 1);
  addArm(model, parts, "#1b2b2f", -0.05, 0.69, -0.2, 0.4, 0.07, -1);
  addLeg(model, parts, "#df9936", 0.14, 0.22, 0.1, 0.18, 0.07, 1);
  addLeg(model, parts, "#df9936", -0.14, 0.22, -0.07, 0.18, 0.07, -1);
  return { model, parts };
}

const creators = {
  trex: createTrex,
  leopard: createLeopard,
  rabbit: createRabbit,
  lion: createLion,
  elephant: createElephant,
  giraffe: createGiraffe,
  panda: createPanda,
  fox: createFox,
  monkey: createMonkey,
  penguin: createPenguin
};

export function disposeObject3D(root) {
  root.traverse((node) => {
    node.geometry?.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const item of materials) item?.dispose();
  });
}

export function createAnimalModel(id) {
  const animal = animalById(id);
  const { model, parts } = creators[animal.id]();
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const targetHeight = 1.05;
  const scale = targetHeight / Math.max(0.1, size.y);
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  const root = new THREE.Group();
  root.name = `runner-${animal.id}`;
  root.add(model);
  root.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  return { animal, root, model, parts };
}
