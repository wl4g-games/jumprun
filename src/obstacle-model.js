import * as THREE from "./vendor/three.module.min.js";
import { createCactus } from "./cactus.js";
import { obstacleById } from "./obstacle-catalog.js";

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Side-view anatomical proportions in model space.  Keeping silhouette data
 * separate from construction and animation makes it possible to tune one
 * species without accidentally turning every quadruped into the same toy.
 */
export const OBSTACLE_MORPHOLOGY = Object.freeze({
  jackal: {
    family: "canine", body: "#a97742", belly: "#d7a86f", dark: "#49372d",
    chest: [-0.13, 0.64, 0, 0.38, 0.25, 0.205], waist: [0.15, 0.61, 0, 0.3, 0.17, 0.16], pelvis: [0.34, 0.62, 0, 0.25, 0.21, 0.19],
    neck: [-0.36, 0.72, 0, 0.2, 0.22, 0.18], head: [-0.49, 0.82, 0, 0.21, 0.19, 0.17], muzzle: [-0.66, 0.75, 0.025, 0.19, 0.09, 0.11],
    legs: { frontX: -0.24, hindX: 0.31, hipY: 0.57, upper: 0.25, lower: 0.25, upperRadius: 0.055, lowerRadius: 0.039, paw: [0.105, 0.04, 0.07], stance: 0.026, hock: 0.055 },
    tail: { length: 0.62, radius: 0.078, taper: 0.36, segments: 8, rise: 0.17, curl: 0.13, sCurve: 0.1 },
    posture: { bodyPitch: -0.012, chestPitch: 0.025, pelvisPitch: -0.018, headPitch: -0.055, foreLean: -0.025, hindLean: 0.045 },
    coat: { tufts: 5, length: 0.045 },
    ears: "tall", gait: { stride: 0.39, knee: 0.46, bob: 0.012, pitch: 0.027, tail: 0.11, cadence: 5.5 }
  },
  wolf: {
    family: "canine", body: "#718188", belly: "#aab5b5", dark: "#34444a",
    chest: [-0.13, 0.65, 0, 0.43, 0.29, 0.245], waist: [0.15, 0.62, 0, 0.32, 0.19, 0.185], pelvis: [0.35, 0.64, 0, 0.28, 0.235, 0.215],
    neck: [-0.36, 0.75, 0, 0.23, 0.25, 0.215], head: [-0.51, 0.84, 0, 0.235, 0.205, 0.195], muzzle: [-0.69, 0.76, 0.025, 0.2, 0.105, 0.125],
    legs: { frontX: -0.24, hindX: 0.32, hipY: 0.58, upper: 0.25, lower: 0.25, upperRadius: 0.069, lowerRadius: 0.047, paw: [0.115, 0.045, 0.078], stance: 0.026, hock: 0.052 },
    tail: { length: 0.64, radius: 0.11, taper: 0.4, segments: 9, rise: 0.1, curl: 0.11, sCurve: 0.08, bushy: true },
    posture: { bodyPitch: -0.006, chestPitch: 0.032, pelvisPitch: -0.015, headPitch: -0.035, foreLean: -0.018, hindLean: 0.035 },
    coat: { tufts: 7, length: 0.058 },
    ears: "tall", gait: { stride: 0.35, knee: 0.42, bob: 0.013, pitch: 0.024, tail: 0.1, cadence: 5.15 }
  },
  tiger: {
    family: "feline", body: "#d97827", belly: "#efc27a", dark: "#2f2521", markings: "stripes",
    chest: [-0.15, 0.63, 0, 0.47, 0.3, 0.275], waist: [0.15, 0.59, 0, 0.37, 0.215, 0.22], pelvis: [0.36, 0.62, 0, 0.315, 0.275, 0.25],
    neck: [-0.39, 0.7, 0, 0.25, 0.245, 0.235], head: [-0.53, 0.79, 0, 0.27, 0.235, 0.225], muzzle: [-0.71, 0.71, 0.035, 0.19, 0.115, 0.145],
    legs: { frontX: -0.26, hindX: 0.33, hipY: 0.55, upper: 0.245, lower: 0.23, upperRadius: 0.092, lowerRadius: 0.064, paw: [0.145, 0.055, 0.105], stance: 0.034, hock: 0.052 },
    tail: { length: 0.79, radius: 0.122, taper: 0.44, segments: 12, rise: 0.055, curl: 0.08, sCurve: 0.16 },
    posture: { bodyPitch: -0.018, chestPitch: 0.04, pelvisPitch: -0.025, headPitch: -0.06, foreLean: -0.022, hindLean: 0.045 },
    coat: { tufts: 3, length: 0.026 },
    ears: "round", gait: { stride: 0.36, knee: 0.5, bob: 0.017, pitch: 0.03, tail: 0.16, cadence: 4.85 }
  },
  leopard: {
    family: "feline", body: "#d6a03c", belly: "#f0cb79", dark: "#3b2e24", markings: "spots",
    chest: [-0.15, 0.64, 0, 0.42, 0.255, 0.225], waist: [0.14, 0.6, 0, 0.35, 0.18, 0.18], pelvis: [0.36, 0.63, 0, 0.28, 0.24, 0.215],
    neck: [-0.37, 0.72, 0, 0.21, 0.21, 0.19], head: [-0.51, 0.8, 0, 0.235, 0.205, 0.19], muzzle: [-0.67, 0.72, 0.03, 0.17, 0.1, 0.125],
    legs: { frontX: -0.25, hindX: 0.32, hipY: 0.56, upper: 0.255, lower: 0.235, upperRadius: 0.071, lowerRadius: 0.049, paw: [0.125, 0.047, 0.085], stance: 0.032, hock: 0.05 },
    tail: { length: 0.82, radius: 0.094, taper: 0.48, segments: 11, rise: 0.045, curl: 0.1, sCurve: 0.18 },
    posture: { bodyPitch: -0.025, chestPitch: 0.025, pelvisPitch: -0.03, headPitch: -0.075, foreLean: -0.035, hindLean: 0.055 },
    coat: { tufts: 2, length: 0.022 },
    ears: "round", gait: { stride: 0.42, knee: 0.56, bob: 0.018, pitch: 0.035, tail: 0.18, cadence: 5.2 }
  },
  boar: {
    family: "boar", body: "#665348", belly: "#887164", dark: "#302b29",
    chest: [-0.14, 0.55, 0, 0.47, 0.3, 0.275], waist: [0.13, 0.54, 0, 0.39, 0.25, 0.24], pelvis: [0.34, 0.56, 0, 0.31, 0.27, 0.255],
    neck: [-0.4, 0.63, 0, 0.25, 0.27, 0.245], head: [-0.55, 0.65, 0, 0.29, 0.245, 0.235], muzzle: [-0.77, 0.55, 0.035, 0.23, 0.14, 0.19],
    legs: { frontX: -0.25, hindX: 0.31, hipY: 0.49, upper: 0.19, lower: 0.18, upperRadius: 0.087, lowerRadius: 0.06, paw: [0.105, 0.045, 0.09], stance: 0.018, hock: 0.035 },
    tail: { length: 0.27, radius: 0.052, taper: 0.38, segments: 6, rise: 0.15, curl: 0.62, sCurve: 0.04 },
    posture: { bodyPitch: 0.012, chestPitch: 0.055, pelvisPitch: -0.018, headPitch: -0.13, foreLean: -0.01, hindLean: 0.025 },
    ears: "short", tusks: true, bristles: true, gait: { stride: 0.29, knee: 0.35, bob: 0.014, pitch: 0.02, tail: 0.22, cadence: 6.1 }
  },
  saber: {
    family: "feline", body: "#ba8050", belly: "#dfb484", dark: "#433128",
    chest: [-0.16, 0.65, 0, 0.48, 0.315, 0.29], waist: [0.14, 0.6, 0, 0.35, 0.205, 0.21], pelvis: [0.35, 0.63, 0, 0.305, 0.265, 0.24],
    neck: [-0.4, 0.73, 0, 0.27, 0.265, 0.25], head: [-0.55, 0.82, 0, 0.29, 0.255, 0.235], muzzle: [-0.73, 0.72, 0.035, 0.19, 0.12, 0.15],
    legs: { frontX: -0.27, hindX: 0.32, hipY: 0.56, upper: 0.255, lower: 0.24, upperRadius: 0.095, lowerRadius: 0.064, paw: [0.145, 0.055, 0.108], stance: 0.032, hock: 0.05 },
    tail: { length: 0.5, radius: 0.095, taper: 0.42, segments: 8, rise: 0.035, curl: 0.08, sCurve: 0.09 },
    posture: { bodyPitch: -0.008, chestPitch: 0.055, pelvisPitch: -0.02, headPitch: -0.1, foreLean: -0.018, hindLean: 0.04 },
    coat: { tufts: 4, length: 0.038 },
    ears: "round", tusks: true, gait: { stride: 0.34, knee: 0.48, bob: 0.017, pitch: 0.03, tail: 0.14, cadence: 4.65 }
  },
  qilin: {
    family: "ungulate", body: "#4d9d83", belly: "#9fd0a9", dark: "#245f5a", scales: true,
    chest: [-0.14, 0.72, 0, 0.4, 0.255, 0.22], waist: [0.14, 0.7, 0, 0.34, 0.185, 0.18], pelvis: [0.35, 0.72, 0, 0.27, 0.23, 0.21],
    neck: [-0.38, 0.85, 0, 0.19, 0.32, 0.17], head: [-0.49, 1.02, 0, 0.21, 0.19, 0.17], muzzle: [-0.65, 0.96, 0.025, 0.17, 0.085, 0.11],
    legs: { frontX: -0.24, hindX: 0.32, hipY: 0.64, upper: 0.31, lower: 0.29, upperRadius: 0.061, lowerRadius: 0.043, paw: [0.09, 0.05, 0.072], stance: 0.022, hock: 0.048 },
    tail: { length: 0.66, radius: 0.09, taper: 0.38, segments: 9, rise: 0.13, curl: 0.18, sCurve: 0.13, bushy: true },
    posture: { bodyPitch: 0.012, chestPitch: 0.05, pelvisPitch: -0.018, headPitch: 0.04, foreLean: -0.025, hindLean: 0.035 },
    ears: "short", horn: true, mane: true, gait: { stride: 0.4, knee: 0.48, bob: 0.016, pitch: 0.026, tail: 0.17, cadence: 5.05 }
  },
  pixiu: {
    family: "feline", body: "#d0a33e", belly: "#f2d477", dark: "#6f4a28",
    chest: [-0.16, 0.64, 0, 0.47, 0.31, 0.285], waist: [0.13, 0.6, 0, 0.36, 0.21, 0.21], pelvis: [0.35, 0.63, 0, 0.31, 0.27, 0.245],
    neck: [-0.4, 0.73, 0, 0.27, 0.27, 0.25], head: [-0.55, 0.83, 0, 0.3, 0.265, 0.245], muzzle: [-0.75, 0.73, 0.035, 0.21, 0.125, 0.16],
    legs: { frontX: -0.27, hindX: 0.33, hipY: 0.55, upper: 0.25, lower: 0.235, upperRadius: 0.097, lowerRadius: 0.066, paw: [0.15, 0.057, 0.11], stance: 0.035, hock: 0.05 },
    tail: { length: 0.66, radius: 0.105, taper: 0.4, segments: 9, rise: 0.17, curl: 0.22, sCurve: 0.16, bushy: true },
    posture: { bodyPitch: -0.012, chestPitch: 0.065, pelvisPitch: -0.025, headPitch: -0.035, foreLean: -0.025, hindLean: 0.05 },
    ears: "round", horn: true, mane: true, wings: true, gait: { stride: 0.35, knee: 0.49, bob: 0.019, pitch: 0.032, tail: 0.19, cadence: 4.8 }
  },
  taotie: {
    family: "heavy", body: "#775d89", belly: "#bba1bd", dark: "#342d45",
    chest: [-0.18, 0.62, 0, 0.48, 0.325, 0.3], waist: [0.11, 0.59, 0, 0.37, 0.225, 0.225], pelvis: [0.34, 0.61, 0, 0.32, 0.275, 0.255],
    neck: [-0.42, 0.7, 0, 0.3, 0.295, 0.275], head: [-0.58, 0.78, 0, 0.37, 0.315, 0.29], muzzle: [-0.81, 0.66, 0.045, 0.24, 0.15, 0.195],
    legs: { frontX: -0.28, hindX: 0.32, hipY: 0.53, upper: 0.225, lower: 0.205, upperRadius: 0.105, lowerRadius: 0.074, paw: [0.16, 0.06, 0.12], stance: 0.025, hock: 0.042 },
    tail: { length: 0.48, radius: 0.105, taper: 0.4, segments: 7, rise: 0.085, curl: 0.12, sCurve: 0.08 },
    posture: { bodyPitch: 0.008, chestPitch: 0.075, pelvisPitch: -0.025, headPitch: -0.11, foreLean: -0.012, hindLean: 0.035 },
    ears: "short", horns: true, mane: true, gait: { stride: 0.27, knee: 0.38, bob: 0.014, pitch: 0.02, tail: 0.13, cadence: 4.4 }
  }
});

function makeMaterials(profile) {
  const matte = (color, roughness = 0.96) => {
    const material = new THREE.MeshPhysicalMaterial({
      color,
      roughness,
      metalness: 0,
      clearcoat: 0,
      sheen: 0.035,
      sheenRoughness: 1,
      sheenColor: new THREE.Color(color)
    });
    material.name = "matte-coat";
    return material;
  };
  const detail = (color, roughness) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
    material.name = "anatomical-detail";
    return material;
  };
  return {
    body: matte(profile.body), far: matte(new THREE.Color(profile.body).multiplyScalar(0.76), 0.98),
    belly: matte(profile.belly, 0.97), dark: matte(profile.dark, 0.98),
    eye: detail("#11100f", 0.26), iris: detail("#a78336", 0.46), tooth: detail("#e8ddc5", 0.8),
    nose: detail("#211d1b", 0.76), accent: matte("#c6b65c", 0.88)
  };
}

function mesh(parent, geometry, material, name, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) {
  const item = new THREE.Mesh(geometry, material);
  item.name = name;
  item.position.set(...position);
  item.scale.set(...scale);
  item.rotation.set(...rotation);
  parent.add(item);
  return item;
}

function ellipsoid(parent, material, spec, name, segments = 18) {
  return mesh(parent, new THREE.SphereGeometry(1, segments, Math.max(10, Math.round(segments * 0.7))), material, name, spec.slice(0, 3), spec.slice(3, 6));
}

function taperedBetween(parent, material, start, end, startRadius, endRadius, name) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const direction = b.clone().sub(a);
  const item = mesh(parent, new THREE.CylinderGeometry(endRadius, startRadius, direction.length() * 1.08, 14, 2, true), material, name);
  item.position.copy(a).add(b).multiplyScalar(0.5);
  item.quaternion.setFromUnitVectors(UP, direction.normalize());
  item.userData.radius = Math.min(startRadius, endRadius);
  item.userData.startRadius = startRadius;
  item.userData.endRadius = endRadius;
  return item;
}

function addEye(parent, materials, profile) {
  const [x, y, z, , , depth] = profile.head;
  ellipsoid(parent, materials.belly, [x - 0.082, y + 0.052, z + depth * 0.965, 0.041, 0.033, 0.011], "eye-mask", 12);
  ellipsoid(parent, materials.iris, [x - 0.087, y + 0.053, z + depth * 1.01, 0.017, 0.019, 0.008], "iris", 10);
  ellipsoid(parent, materials.eye, [x - 0.09, y + 0.054, z + depth * 1.04, 0.0065, 0.012, 0.005], "pupil", 8);
}

function addEars(parent, materials, profile) {
  const [x, y, z, width, height, depth] = profile.head;
  const round = profile.ears === "round";
  const short = profile.ears === "short";
  const earHeight = round ? 0.105 : short ? 0.12 : 0.19;
  const earWidth = round ? 0.09 : short ? 0.075 : 0.085;
  const geometry = round ? new THREE.SphereGeometry(1, 14, 9) : new THREE.ConeGeometry(1, 2, 10);
  for (const [offset, near, tilt] of [[-width * 0.42, true, -0.18], [width * 0.32, false, 0.16]]) {
    const item = mesh(parent, geometry, near ? materials.dark : materials.body, `ear-${near ? "near" : "far"}`,
      [x + offset, y + height * 0.78, z + (near ? depth * 0.34 : -depth * 0.38)],
      [earWidth, earHeight, near ? 0.06 : 0.052], [0.05, 0, tilt]);
    if (round) item.rotation.z = tilt;
  }
}

function addLeg(anatomy, materials, profile, front, near, phase) {
  const dimensions = profile.legs;
  const x = front ? dimensions.frontX : dimensions.hindX;
  const z = (near ? 1 : -1) * (profile.pelvis[5] * 0.72);
  const hip = new THREE.Group();
  hip.name = `leg-${front ? "front" : "hind"}-${near ? "near" : "far"}`;
  hip.position.set(x, dimensions.hipY, z);
  anatomy.add(hip);

  // Depth should read through gentle value separation, not black robotic
  // joints. Marking colours remain reserved for actual stripes/spots.
  const legMaterial = near ? materials.body : materials.far;
  const posture = profile.posture || {};
  const upperEndX = (front ? -1 : 1) * dimensions.stance + (front ? posture.foreLean : posture.hindLean || 0);
  taperedBetween(
    hip,
    legMaterial,
    [0, 0, 0],
    [upperEndX, -dimensions.upper * 1.025, 0],
    dimensions.upperRadius * (front ? 1.17 : 1.28),
    dimensions.upperRadius * 0.7,
    `${hip.name}-upper`
  );
  // An elongated shoulder/haunch volume disappears into the torso and upper
  // limb. It reads as muscle rather than the exposed ball joint it replaces.
  const muscleDirection = front ? -1 : 1;
  ellipsoid(hip, legMaterial, [
    muscleDirection * dimensions.upperRadius * 0.2,
    -dimensions.upper * 0.16,
    0,
    dimensions.upperRadius * (front ? 1.2 : 1.34),
    dimensions.upper * (front ? 0.31 : 0.36),
    dimensions.upperRadius * 1.08
  ], `${hip.name}-muscle`, 16).rotation.z = muscleDirection * 0.08;

  const knee = new THREE.Group();
  knee.name = `${hip.name}-knee`;
  knee.position.set(upperEndX, -dimensions.upper, 0);
  hip.add(knee);
  const lowerEndX = (front ? 1 : -1) * dimensions.stance * 0.68;
  taperedBetween(
    knee,
    legMaterial,
    [0, dimensions.upper * 0.025, 0],
    [lowerEndX, -dimensions.lower, 0],
    dimensions.lowerRadius * 1.12,
    dimensions.lowerRadius * 0.7,
    `${hip.name}-lower`
  );

  const paw = new THREE.Group();
  paw.name = `${hip.name}-paw-pivot`;
  paw.position.set(lowerEndX, -dimensions.lower, near ? 0.008 : -0.006);
  knee.add(paw);
  const footDirection = front ? -1 : 1;
  const hockLength = dimensions.hock || dimensions.paw[1];
  const pawLength = dimensions.paw[0];
  const pawHeight = Math.max(dimensions.paw[1] * 1.06, dimensions.lowerRadius * 0.72);
  const pawDepth = dimensions.paw[2] * 0.78;
  taperedBetween(
    paw,
    legMaterial,
    [0, dimensions.lowerRadius * 0.04, 0],
    [footDirection * hockLength, -pawHeight * 0.62, 0],
    dimensions.lowerRadius * 0.76,
    pawHeight * 0.58,
    `${hip.name}-hock`
  );
  ellipsoid(paw, legMaterial, [
    footDirection * (hockLength + pawLength * 0.28),
    -pawHeight * 0.76,
    0.01,
    pawLength * 0.62,
    pawHeight,
    pawDepth
  ], `${hip.name}-paw`, 16);
  return { hip, knee, paw, front, near, phase, baseHip: 0, baseKnee: 0 };
}

function addTail(anatomy, materials, profile) {
  const tail = profile.tail;
  const root = new THREE.Group();
  root.name = "tail-root";
  root.position.set(profile.pelvis[0] + profile.pelvis[3] * 0.62, profile.pelvis[1] + profile.pelvis[4] * 0.2, 0);
  anatomy.add(root);
  const joints = [];
  const segmentLength = tail.length / tail.segments;
  const segmentRise = tail.rise / tail.segments;
  taperedBetween(
    root,
    tail.bushy ? materials.dark : materials.body,
    [-tail.radius * 0.72, -tail.radius * 0.05, 0],
    [segmentLength * 0.42, segmentRise * 0.42, 0],
    tail.radius * 1.38,
    tail.radius,
    "tail-base-muscle"
  );
  let parent = root;
  for (let index = 0; index < tail.segments; index++) {
    const joint = new THREE.Group();
    joint.name = `tail-joint-${index}`;
    if (index) joint.position.set(segmentLength, segmentRise, 0);
    parent.add(joint);
    const progress = index / Math.max(1, tail.segments - 1);
    const nextProgress = (index + 1) / tail.segments;
    const radius = tail.radius * THREE.MathUtils.lerp(1, tail.taper, progress ** 0.72);
    const nextRadius = tail.radius * THREE.MathUtils.lerp(1, tail.taper, nextProgress ** 0.72);
    taperedBetween(joint, tail.bushy ? materials.dark : materials.body, [0, 0, 0], [segmentLength * 1.12, segmentRise * 1.12, 0], radius, nextRadius, `tail-segment-${index}`);
    const staticWave = Math.sin(progress * TAU - Math.PI * 0.45) * (tail.sCurve || 0) / tail.segments;
    joint.rotation.z = (tail.curl / tail.segments) * (0.25 + progress * 0.5) + staticWave;
    joint.userData.baseZ = joint.rotation.z;
    joint.userData.radius = radius;
    joint.userData.progress = progress;
    joints.push(joint);
    parent = joint;
  }
  const tipRadius = tail.radius * tail.taper;
  ellipsoid(parent, tail.bushy ? materials.dark : materials.body, [
    segmentLength * 1.035,
    segmentRise * 1.035,
    0,
    tipRadius * 0.92,
    tipRadius * 0.88,
    tipRadius * 0.88
  ], "tail-tip", 12);
  return { root, joints };
}

function addCoatTufts(anatomy, materials, profile) {
  const coat = profile.coat;
  if (!coat?.tufts || coat.length <= 0) return null;
  const geometry = new THREE.ConeGeometry(0.018, 1, 5, 1, true);
  geometry.translate(0, 0.5, 0);
  const tufts = new THREE.InstancedMesh(geometry, materials.body, coat.tufts);
  tufts.name = "dorsal-fur-tufts";
  tufts.castShadow = true;
  tufts.receiveShadow = true;
  tufts.userData.triangleBudget = coat.tufts * 10;
  const transform = new THREE.Object3D();
  const startX = profile.chest[0] - profile.chest[3] * 0.52;
  const endX = profile.pelvis[0] + profile.pelvis[3] * 0.42;
  for (let index = 0; index < coat.tufts; index++) {
    const progress = coat.tufts === 1 ? 0.5 : index / (coat.tufts - 1);
    const x = THREE.MathUtils.lerp(startX, endX, progress);
    const chestTop = profile.chest[1] + profile.chest[4] * 0.91;
    const pelvisTop = profile.pelvis[1] + profile.pelvis[4] * 0.9;
    const backY = THREE.MathUtils.lerp(chestTop, pelvisTop, progress);
    const length = coat.length * (0.8 + Math.sin((index + 1) * 1.73) * 0.12);
    transform.position.set(x, backY, profile.chest[5] * 0.25);
    transform.rotation.set(0, 0, -0.13 + progress * 0.2);
    transform.scale.set(0.8 + (index % 2) * 0.18, length, 0.72);
    transform.updateMatrix();
    tufts.setMatrixAt(index, transform.matrix);
  }
  tufts.instanceMatrix.needsUpdate = true;
  anatomy.add(tufts);
  return tufts;
}

function addMarkings(anatomy, materials, profile) {
  if (profile.markings === "stripes") {
    const stripes = [[-0.34, 0.73, -0.22], [-0.2, 0.81, 0.14], [-0.03, 0.82, -0.1], [0.15, 0.76, 0.18], [0.32, 0.76, -0.12]];
    for (const [x, y, angle] of stripes) {
      ellipsoid(anatomy, materials.dark, [x, y, profile.chest[5] * 0.985, 0.026, 0.13, 0.011], `stripe-${x}`, 12).rotation.z = angle;
    }
    for (let index = 0; index < 3; index++) {
      ellipsoid(anatomy, materials.dark, [-0.57 + index * 0.07, 0.87 - index * 0.025, profile.head[5] * 0.97, 0.017, 0.052, 0.009], `face-stripe-${index}`, 10).rotation.z = -0.35 + index * 0.32;
    }
  } else if (profile.markings === "spots") {
    const spots = [[-0.3, 0.7, 0.038], [-0.18, 0.78, 0.031], [-0.04, 0.65, 0.043], [0.1, 0.73, 0.033], [0.25, 0.66, 0.042], [0.36, 0.75, 0.03]];
    for (const [x, y, radius] of spots) ellipsoid(anatomy, materials.dark, [x, y, profile.chest[5] * 0.99, radius, radius * 0.75, 0.012], `spot-${x}`, 10);
  }
}

function addTusks(anatomy, materials, profile) {
  if (!profile.tusks) return;
  const saber = profile.family === "feline";
  const [x, y, z, , , depth] = profile.muzzle;
  const length = saber ? 0.23 : 0.125;
  for (const offset of saber ? [-0.08, 0.07] : [-0.03, 0.075]) {
    mesh(anatomy, new THREE.ConeGeometry(saber ? 0.029 : 0.035, length, 10), materials.tooth, `tusk-${offset}`,
      [x + offset, y - 0.075, z + depth * 0.92], [1, 1, 1], [0, 0, saber ? Math.PI - 0.1 : Math.PI - 0.65]);
  }
}

function addMythicFeatures(anatomy, materials, profile) {
  const [headX, headY] = profile.head;
  if (profile.horn) {
    mesh(anatomy, new THREE.ConeGeometry(0.055, 0.28, 12), materials.accent, "forehead-horn", [headX + 0.015, headY + 0.25, 0], [1, 1, 1], [0, 0, -0.19]);
  }
  if (profile.horns) {
    for (const [offset, tilt] of [[-0.11, -0.48], [0.11, 0.48]]) mesh(anatomy, new THREE.ConeGeometry(0.068, 0.28, 12), materials.tooth, `horn-${offset}`,
      [headX + offset, headY + 0.26, offset * 0.35], [1, 1, 1], [0, 0, tilt]);
  }
  if (profile.mane || profile.bristles) {
    const count = profile.bristles ? 11 : 8;
    const length = profile.bristles ? 0.078 : 0.105;
    const radius = profile.bristles ? 0.019 : 0.026;
    for (let index = 0; index < count; index++) {
      const progress = index / (count - 1);
      const x = THREE.MathUtils.lerp(-0.46, 0.22, progress);
      const y = THREE.MathUtils.lerp(profile.neck[1] + profile.neck[4] * 0.9, profile.pelvis[1] + profile.pelvis[4] * 0.88, progress);
      mesh(anatomy, new THREE.ConeGeometry(radius, length, 6, 1, true), materials.dark, `${profile.bristles ? "bristle" : "mane"}-${index}`,
        [x, y + length * 0.35, -0.03], [1, 1, 1], [0, 0, -0.12 + progress * 0.12]);
    }
  }
  if (profile.scales) {
    for (let index = 0; index < 7; index++) {
      ellipsoid(anatomy, materials.accent, [-0.27 + index * 0.1, 0.77 + Math.sin(index * 1.8) * 0.035, profile.chest[5] * 0.99, 0.028, 0.021, 0.009], `scale-${index}`, 10);
    }
  }
  if (profile.wings) {
    for (const near of [false, true]) {
      const wing = new THREE.Group();
      wing.name = `wing-${near ? "near" : "far"}`;
      wing.position.set(-0.02, 0.78, near ? 0.2 : -0.2);
      anatomy.add(wing);
      const wingMesh = ellipsoid(wing, materials.dark, [0.13, 0.04, 0, 0.33, 0.12, 0.03], `${wing.name}-membrane`, 16);
      wingMesh.rotation.z = near ? 0.33 : 0.22;
    }
  }
}

function createBeast(species, variant = 0) {
  const profile = OBSTACLE_MORPHOLOGY[species] || OBSTACLE_MORPHOLOGY.wolf;
  const materials = makeMaterials(profile);
  const visual = new THREE.Group();
  const anatomy = new THREE.Group();
  anatomy.name = `${species}-anatomy`;
  visual.add(anatomy);

  const posture = profile.posture || {};
  const chest = ellipsoid(anatomy, materials.body, profile.chest, "ribcage", 22);
  ellipsoid(anatomy, materials.belly, [profile.waist[0] - 0.06, profile.waist[1] - profile.waist[4] * 0.43, profile.waist[2] + profile.waist[5] * 0.28, profile.waist[3] * 0.75, profile.waist[4] * 0.53, profile.waist[5] * 0.74], "belly", 18);
  ellipsoid(anatomy, materials.body, profile.waist, "abdomen", 20);
  const pelvis = ellipsoid(anatomy, materials.body, profile.pelvis, "pelvis", 20);
  const neck = ellipsoid(anatomy, materials.body, profile.neck, "neck", 18);
  const head = ellipsoid(anatomy, materials.body, profile.head, "head", 20);
  ellipsoid(anatomy, materials.belly, profile.muzzle, "muzzle", 18);
  ellipsoid(anatomy, materials.nose, [profile.muzzle[0] - profile.muzzle[3] * 0.82, profile.muzzle[1] + 0.01, profile.muzzle[2] + profile.muzzle[5] * 0.15, 0.055, 0.045, profile.muzzle[5] * 0.72], "nose", 14);
  addEye(anatomy, materials, profile);
  addEars(anatomy, materials, profile);

  const phaseSets = profile.family === "feline"
    ? [0.08, Math.PI + 0.08, Math.PI * 1.12, Math.PI * 0.12]
    : [0, Math.PI, Math.PI, 0];
  const legs = [
    addLeg(anatomy, materials, profile, true, true, phaseSets[0]),
    addLeg(anatomy, materials, profile, true, false, phaseSets[1]),
    addLeg(anatomy, materials, profile, false, true, phaseSets[2]),
    addLeg(anatomy, materials, profile, false, false, phaseSets[3])
  ];
  const tail = addTail(anatomy, materials, profile);
  addCoatTufts(anatomy, materials, profile);
  addMarkings(anatomy, materials, profile);
  addTusks(anatomy, materials, profile);
  addMythicFeatures(anatomy, materials, profile);

  chest.rotation.z = posture.chestPitch || 0;
  pelvis.rotation.z = posture.pelvisPitch || 0;
  neck.rotation.z = (posture.headPitch || 0) * 0.42;
  head.rotation.z = posture.headPitch || 0;
  anatomy.rotation.z = (posture.bodyPitch || 0) + (variant - 0.5) * 0.012;
  visual.userData.rig = {
    anatomy, chest, pelvis, head, legs, tail, profile,
    baseY: anatomy.position.y,
    baseAnatomyZ: anatomy.rotation.z,
    chestScaleY: chest.scale.y,
    headBaseZ: head.rotation.z,
    pelvisBaseZ: pelvis.rotation.z,
    wingPivots: anatomy.children.filter((node) => node.name.startsWith("wing-"))
  };
  visual.userData.morphology = {
    species,
    family: profile.family,
    upperLegRadius: profile.legs.upperRadius,
    lowerLegRadius: profile.legs.lowerRadius,
    tailBaseRadius: profile.tail.radius,
    tailTipRadius: profile.tail.radius * profile.tail.taper,
    chestDepth: profile.chest[5],
    pelvisDepth: profile.pelvis[5]
  };
  return visual;
}

function fitToCollisionBox(group, width, height) {
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const targetWidth = Math.max(0.1, width / 100 * 0.94);
  const targetHeight = Math.max(0.1, height / 100 * 0.94);
  const verticalScale = targetHeight / Math.max(0.01, size.y);
  // Cactus hit boxes are intentionally narrow.  Fitting a quadruped to that
  // width made its torso paper-thin and its load-bearing legs look like wire.
  // A bounded visual overhang keeps gameplay collision unchanged while
  // preserving enough of the animal's side-view anatomy to remain legible.
  const naturalWidth = size.x * verticalScale;
  const visualWidth = THREE.MathUtils.clamp(naturalWidth, targetWidth, targetWidth * 2.55);
  const horizontalScale = visualWidth / Math.max(0.01, size.x);
  group.scale.set(horizontalScale, verticalScale, verticalScale);
  group.position.set(-center.x * horizontalScale, -bounds.min.y * verticalScale, -center.z * verticalScale);
}

function animateBeast(rig, elapsed, speed, variant) {
  if (!rig) return;
  const { profile } = rig;
  const gait = profile.gait;
  const cadence = Math.min(12, gait.cadence + speed / 95);
  const cycle = elapsed * cadence + variant * TAU;
  const flight = Math.sin(cycle * 2);
  rig.anatomy.position.y = rig.baseY + Math.max(-0.35, flight) * gait.bob;
  rig.anatomy.rotation.z = rig.baseAnatomyZ + Math.sin(cycle * 2 + 0.35) * gait.pitch;
  rig.chest.scale.y = rig.chestScaleY * (1 + Math.sin(elapsed * 2.2 + variant) * 0.012);
  const bodyMotion = rig.anatomy.rotation.z - rig.baseAnatomyZ;
  rig.head.rotation.z = rig.headBaseZ - bodyMotion * 0.7 + Math.sin(cycle * 2 + 0.8) * 0.009;
  rig.pelvis.rotation.z = rig.pelvisBaseZ + Math.sin(cycle * 2 + Math.PI) * gait.pitch * 0.48;

  for (const limb of rig.legs) {
    const wave = Math.sin(cycle + limb.phase);
    const recovery = Math.max(0, Math.sin(cycle + limb.phase + 0.35));
    const frontBias = limb.front ? 1 : -0.92;
    limb.hip.rotation.z = limb.baseHip + wave * gait.stride * frontBias;
    limb.knee.rotation.z = limb.baseKnee + recovery * gait.knee * (limb.front ? -0.72 : 1);
    limb.paw.rotation.z = -limb.hip.rotation.z - limb.knee.rotation.z * 0.75;
  }
  rig.tail.joints.forEach((joint, index) => {
    const progress = joint.userData.progress ?? index / Math.max(1, rig.tail.joints.length - 1);
    const flexibility = 0.08 + progress * 0.92;
    // One broad travelling wave reads as a counterbalancing tail. Faster
    // per-segment oscillation made the chain look like a segmented hose.
    const wave = cycle * 0.28 - progress * Math.PI * 1.15;
    joint.rotation.y = Math.sin(wave) * gait.tail * flexibility * 0.48;
    joint.rotation.z = joint.userData.baseZ + Math.cos(wave * 0.82) * gait.tail * flexibility * 0.18;
  });
  rig.wingPivots.forEach((wing, index) => {
    wing.rotation.x = Math.sin(cycle * 0.52 + index * Math.PI) * 0.08;
    wing.rotation.z = Math.sin(cycle * 0.7) * 0.045;
  });
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
  group.userData.morphology = visual.userData.morphology || null;
  group.userData.animate = (elapsed, speed) => animateBeast(visual.userData.rig, elapsed, speed, obstacle.variant);
  group.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  return group;
}
