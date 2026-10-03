import * as THREE from "./vendor/three.module.min.js";
import { createCactus } from "./cactus.js";
import { obstacleById } from "./obstacle-catalog.js";

function material(color, roughness = 0.5) {
  return new THREE.MeshPhysicalMaterial({ color, roughness, clearcoat: 0.14, clearcoatRoughness: 0.45 });
}

function shape(parent, geometry, color, position, scale, rotation = [0, 0, 0], name = "") {
  const item = new THREE.Mesh(geometry, material(color));
  item.position.set(...position);
  item.scale.set(...scale);
  item.rotation.set(...rotation);
  item.name = name;
  parent.add(item);
  return item;
}

const ball = (parent, color, position, scale, name) => shape(parent, new THREE.SphereGeometry(1, 14, 10), color, position, scale, [0, 0, 0], name);
const cone = (parent, color, position, scale, rotation = [0, 0, 0], name) => shape(parent, new THREE.ConeGeometry(1, 2, 8), color, position, scale, rotation, name);
const box = (parent, color, position, scale, rotation = [0, 0, 0], name) => shape(parent, new THREE.BoxGeometry(1, 1, 1), color, position, scale, rotation, name);

function eye(parent, x, y, z = 0.19, color = "#fff2b0") {
  ball(parent, color, [x, y, z], [0.035, 0.042, 0.018], "eye");
  ball(parent, "#17201d", [x - 0.005, y, z + 0.017], [0.014, 0.022, 0.008], "pupil");
}

function ear(parent, color, x, y, z, tilt) {
  cone(parent, color, [x, y, z], [0.09, 0.15, 0.07], [0, 0, tilt], "ear");
}

function leg(parent, legs, color, x, z, phase) {
  const pivot = new THREE.Group();
  pivot.position.set(x, 0.44, z);
  parent.add(pivot);
  shape(pivot, new THREE.CylinderGeometry(1, 0.8, 1, 8), color, [0, -0.2, 0], [0.065, 0.4, 0.06]);
  ball(pivot, color, [-0.025, -0.4, 0.02], [0.095, 0.045, 0.075], "paw");
  legs.push({ pivot, phase });
}

function markings(parent, color, type) {
  if (type === "spots") {
    for (const [x, y, r] of [[-0.27, 0.61, 0.045], [-0.06, 0.48, 0.035], [0.13, 0.66, 0.045], [0.3, 0.52, 0.034]]) {
      ball(parent, color, [x, y, 0.222], [r, r * 0.72, 0.012], "marking");
    }
  }
  if (type === "stripes") {
    for (const [x, angle] of [[-0.26, -0.2], [-0.07, 0.14], [0.13, -0.12], [0.3, 0.18]]) {
      box(parent, color, [x, 0.64, 0.222], [0.035, 0.19, 0.012], [0, 0, angle], "marking");
    }
  }
}

function beastStyle(species) {
  return {
    jackal: { body: "#a97742", belly: "#d7a86f", dark: "#503c30", ears: true, tail: "#70513b" },
    wolf: { body: "#718188", belly: "#aab5b5", dark: "#34444a", ears: true, tail: "#59686d" },
    tiger: { body: "#d97827", belly: "#f2c77c", dark: "#3f2b25", ears: true, marking: "stripes" },
    leopard: { body: "#d6a03c", belly: "#f3cf77", dark: "#4a3526", ears: true, marking: "spots" },
    boar: { body: "#665348", belly: "#8b7463", dark: "#302b29", snout: true, tusks: true },
    saber: { body: "#ba8050", belly: "#dfb484", dark: "#4b3428", ears: true, tusks: true },
    qilin: { body: "#4d9d83", belly: "#9fd0a9", dark: "#245f5a", horn: true, mane: true, scales: true },
    pixiu: { body: "#d0a33e", belly: "#f2d477", dark: "#6f4a28", horn: true, mane: true, wings: true },
    taotie: { body: "#775d89", belly: "#bba1bd", dark: "#342d45", horns: true, mane: true, largeHead: true }
  }[species] || { body: "#718188", belly: "#aab5b5", dark: "#34444a", ears: true };
}

function createBeast(species, variant = 0) {
  const style = beastStyle(species);
  const group = new THREE.Group();
  const legs = [];
  ball(group, style.body, [0.03, 0.59, 0], [0.47, 0.28, 0.23], "body");
  ball(group, style.belly, [-0.04, 0.5, 0.215], [0.3, 0.15, 0.018], "belly");
  const headScale = style.largeHead ? [0.34, 0.3, 0.25] : [0.25, 0.23, 0.21];
  ball(group, style.body, [-0.39, 0.76, 0], headScale, "head");
  const muzzleColor = style.snout ? "#927267" : style.belly;
  ball(group, muzzleColor, [-0.58, 0.68, 0.04], style.snout ? [0.2, 0.13, 0.18] : [0.16, 0.105, 0.15], "muzzle");
  eye(group, -0.48, 0.82, 0.205, species === "taotie" ? "#f2d04f" : "#fff4b8");
  if (style.ears) {
    ear(group, style.dark, -0.5, 0.99, -0.02, -0.18);
    ear(group, style.dark, -0.3, 0.99, -0.07, 0.18);
  }
  for (const [x, z, phase] of [[-0.25, 0.13, 1], [0.3, 0.13, -1], [-0.23, -0.13, -1], [0.31, -0.13, 1]]) leg(group, legs, style.dark, x, z, phase);
  const tail = cone(group, style.tail || style.body, [0.58, 0.65, -0.03], [0.1, 0.38, 0.1], [0, 0, -Math.PI / 2], "tail");
  if (style.marking) markings(group, style.dark, style.marking);
  if (style.tusks) {
    cone(group, "#fff0cf", [-0.61, 0.55, 0.15], [0.035, species === "saber" ? 0.18 : 0.11, 0.035], [0, 0, Math.PI], "tusk");
    if (species === "saber") cone(group, "#fff0cf", [-0.48, 0.54, 0.16], [0.032, 0.16, 0.032], [0, 0, Math.PI], "tusk");
  }
  if (style.horn) cone(group, "#f0d67e", [-0.41, 1.08, 0], [0.055, 0.21, 0.055], [0, 0, -0.18], "horn");
  if (style.horns) {
    cone(group, "#cab58d", [-0.55, 1.05, 0], [0.07, 0.24, 0.07], [0, 0, -0.45], "horn");
    cone(group, "#cab58d", [-0.24, 1.05, -0.03], [0.07, 0.24, 0.07], [0, 0, 0.45], "horn");
  }
  if (style.mane) {
    for (let i = 0; i < 5; i++) cone(group, style.dark, [-0.14 + i * 0.11, 0.94 - i * 0.035, -0.04], [0.065, 0.13, 0.06], [0, 0, -0.15], "mane");
  }
  if (style.scales) {
    for (let i = 0; i < 4; i++) ball(group, "#d7cb63", [-0.08 + i * 0.17, 0.72, 0.225], [0.045, 0.035, 0.012], "scale");
  }
  if (style.wings) {
    const wing = ball(group, "#a86c32", [0.12, 0.7, 0.22], [0.3, 0.14, 0.025], "wing");
    wing.rotation.z = 0.42;
  }
  if (style.snout) {
    for (const z of [0.14, 0.2]) ball(group, "#302b29", [-0.69, 0.7, z], [0.018, 0.018, 0.009], "nostril");
  }
  tail.rotation.y += (variant - 0.5) * 0.18;
  group.userData.legs = legs;
  return group;
}

function fitToCollisionBox(group, width, height) {
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const sx = Math.max(0.1, width / 100 * 0.94) / Math.max(0.01, size.x);
  const sy = Math.max(0.1, height / 100 * 0.94) / Math.max(0.01, size.y);
  const scale = Math.min(sx * 1.08, sy);
  group.scale.set(scale, sy, Math.min(scale, sy));
  group.position.set(-center.x * scale, -bounds.min.y * sy, -center.z * Math.min(scale, sy));
}

export function createObstacleModel(obstacle) {
  const species = obstacleById(obstacle.species).id;
  const visual = species === "cactus"
    ? createCactus(obstacle.kind, obstacle.width, obstacle.height, obstacle.variant)
    : createBeast(species, obstacle.variant);
  if (species !== "cactus") fitToCollisionBox(visual, obstacle.width, obstacle.height);
  const group = new THREE.Group();
  group.add(visual);
  group.name = `obstacle-${species}`;
  group.userData.species = species;
  const legs = visual.userData.legs || [];
  group.userData.animate = (elapsed, speed) => {
    const stride = Math.sin(elapsed * Math.min(12, 5 + speed / 80) + obstacle.variant * Math.PI * 2);
    for (const item of legs) item.pivot.rotation.z = stride * item.phase * 0.4;
  };
  group.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  return group;
}
