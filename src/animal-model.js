import * as THREE from "./vendor/three.module.min.js";
import { animalById } from "./animal-catalog.js";

const SPHERE_SEGMENTS = 14;
const SPHERE_RINGS = 10;

function furMaterial(color, { roughness = 0.9, emissive = null } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0,
    emissive: emissive || 0x000000,
    emissiveIntensity: emissive ? 0.08 : 0,
    envMapIntensity: 0.42
  });
}

function shade(color, lightness) {
  return new THREE.Color(color).offsetHSL(0, 0, lightness);
}

function addMesh(parent, geometry, color, {
  name = "",
  position = [0, 0, 0],
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
  roughness = 0.9,
  shadow = true,
  emissive = null
} = {}) {
  const item = new THREE.Mesh(geometry, furMaterial(color, { roughness, emissive }));
  item.name = name;
  item.position.set(...position);
  item.scale.set(...scale);
  item.rotation.set(...rotation);
  item.castShadow = shadow;
  item.receiveShadow = shadow;
  item.userData.noShadow = !shadow;
  parent.add(item);
  return item;
}

function ellipsoid(parent, color, position, scale, name = "", options = {}) {
  return addMesh(parent, new THREE.SphereGeometry(1, SPHERE_SEGMENTS, SPHERE_RINGS), color, {
    ...options,
    name,
    position,
    scale
  });
}

function cone(parent, color, position, scale, rotation = [0, 0, 0], name = "", options = {}) {
  return addMesh(parent, new THREE.ConeGeometry(1, 2, 9), color, {
    ...options,
    name,
    position,
    scale,
    rotation
  });
}

function segment(parent, color, start, end, startRadius, endRadius, name = "", options = {}) {
  const from = new THREE.Vector3(...start);
  const to = new THREE.Vector3(...end);
  const direction = to.clone().sub(from);
  const length = Math.max(1e-4, direction.length());
  const item = addMesh(
    parent,
    new THREE.CylinderGeometry(endRadius, startRadius, length, 10, 1, false),
    color,
    { ...options, name, position: from.clone().add(to).multiplyScalar(0.5).toArray() }
  );
  item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return item;
}

function joint(parent, position, name = "") {
  const item = new THREE.Group();
  item.name = name;
  item.position.set(...position);
  parent.add(item);
  return item;
}

function createRig(species, gait, profile = {}) {
  return {
    species,
    gait,
    profile,
    legs: [],
    appendages: [],
    tailJoints: [],
    headPivot: null,
    headRestZ: 0,
    torso: null
  };
}

function sideColor(color, side) {
  return side === "far" ? shade(color, -0.075) : color;
}

function addLeg(parent, rig, {
  id,
  role,
  side,
  attach,
  upperLength,
  lowerLength,
  ankleLength = 0.045,
  radii = [0.09, 0.066, 0.046],
  foot = [0.13, 0.045, 0.075],
  color,
  footColor = color,
  rest = [0, 0, 0, 0],
  bend,
  phase,
  toes = 0,
  jointScale = 1
}) {
  const limbColor = sideColor(color, side);
  const soleColor = sideColor(footColor, side);
  const hip = joint(parent, attach, `${id}-hip`);
  hip.rotation.z = rest[0];
  segment(hip, limbColor, [0, 0, 0], [0, -upperLength, 0], radii[0], radii[1], `${id}-upper-leg`);

  const knee = joint(hip, [0, -upperLength, 0], `${id}-knee`);
  knee.rotation.z = rest[1];
  ellipsoid(knee, limbColor, [0, 0, 0], [radii[1] * 1.08, radii[1] * 1.02, radii[1] * 1.02], `${id}-knee-cap`);
  segment(knee, limbColor, [0, 0, 0], [0, -lowerLength, 0], radii[1], radii[2], `${id}-lower-leg`);

  const ankle = joint(knee, [0, -lowerLength, 0], `${id}-ankle`);
  ankle.rotation.z = rest[2];
  segment(ankle, soleColor, [0, 0, 0], [0, -ankleLength, 0], radii[2], radii[2] * 0.78, `${id}-metapodial`);

  const footPivot = joint(ankle, [0, -ankleLength, 0], `${id}-foot-joint`);
  footPivot.rotation.z = rest[3];
  ellipsoid(footPivot, soleColor, [foot[0] * 0.28, -foot[1] * 0.12, 0], foot, `${id}-foot`);
  for (let index = 0; index < toes; index++) {
    const spread = toes === 1 ? 0 : (index / (toes - 1) - 0.5) * foot[2] * 1.4;
    cone(
      footPivot,
      shade(soleColor, -0.12),
      [foot[0] * 0.98, -foot[1] * 0.18, spread],
      [foot[1] * 0.16, foot[0] * 0.22, foot[1] * 0.16],
      [0, 0, -Math.PI / 2],
      `${id}-toe`,
      { shadow: false }
    );
  }

  const limb = {
    id,
    role,
    side,
    hip,
    knee,
    ankle,
    foot: footPivot,
    phase,
    bend,
    upperLength,
    lowerLength,
    rest: { hip: rest[0], knee: rest[1], ankle: rest[2], foot: rest[3] }
  };
  hip.userData.groundLimb = true;
  hip.userData.jointScale = jointScale;
  rig.legs.push(limb);
  return limb;
}

function addArm(parent, rig, {
  id,
  side,
  attach,
  upperLength,
  lowerLength = 0,
  radii = [0.045, 0.03, 0.02],
  color,
  rest = [-0.2, 0.35],
  phase = 0,
  kind = "arm",
  hand = true
}) {
  const limbColor = sideColor(color, side);
  const shoulder = joint(parent, attach, `${id}-shoulder`);
  shoulder.rotation.z = rest[0];
  segment(shoulder, limbColor, [0, 0, 0], [0, -upperLength, 0], radii[0], radii[1], `${id}-upper`);
  let elbow = null;
  if (lowerLength > 0) {
    elbow = joint(shoulder, [0, -upperLength, 0], `${id}-elbow`);
    elbow.rotation.z = rest[1];
    ellipsoid(elbow, limbColor, [0, 0, 0], [radii[1], radii[1], radii[1]], `${id}-elbow-cap`);
    segment(elbow, limbColor, [0, 0, 0], [0, -lowerLength, 0], radii[1], radii[2], `${id}-forearm`);
    if (hand) ellipsoid(elbow, limbColor, [radii[2] * 0.55, -lowerLength, 0], [radii[2] * 1.8, radii[2] * 0.85, radii[2] * 1.2], `${id}-hand`);
  }
  rig.appendages.push({
    id,
    side,
    shoulder,
    elbow,
    phase,
    kind,
    rest: { shoulder: rest[0], elbow: rest[1] || 0 }
  });
  return shoulder;
}

function addFlipper(parent, rig, { id, side, attach, color, rest, phase }) {
  const shoulder = joint(parent, attach, `${id}-shoulder`);
  shoulder.rotation.z = rest;
  const wingColor = sideColor(color, side);
  ellipsoid(shoulder, wingColor, [0.015, -0.2, 0], [0.085, 0.27, 0.035], `${id}-flipper`);
  cone(shoulder, wingColor, [0.035, -0.43, 0], [0.045, 0.14, 0.025], [0, 0, Math.PI], `${id}-flipper-tip`);
  rig.appendages.push({
    id,
    side,
    shoulder,
    elbow: null,
    phase,
    kind: "flipper",
    rest: { shoulder: rest, elbow: 0 }
  });
}

function addTail(parent, rig, {
  base,
  lengths,
  radii,
  color,
  colors = [],
  rest = [],
  fluffy = false,
  name = "tail"
}) {
  let holder = parent;
  let position = base;
  for (let index = 0; index < lengths.length; index++) {
    const tailJoint = joint(holder, position, `${name}-${index + 1}-joint`);
    const restZ = rest[index] || 0;
    tailJoint.rotation.z = restZ;
    const length = lengths[index];
    const partColor = colors[index] || color;
    if (fluffy) {
      ellipsoid(
        tailJoint,
        partColor,
        [-length * 0.48, 0, 0],
        [length * 0.58, radii[index] * 1.12, radii[index] * 1.05],
        `${name}-${index + 1}`
      );
    } else {
      segment(
        tailJoint,
        partColor,
        [0, 0, 0],
        [-length, 0, 0],
        radii[index],
        radii[index + 1] ?? radii[index] * 0.5,
        `${name}-${index + 1}`
      );
    }
    rig.tailJoints.push({ joint: tailJoint, restZ });
    holder = tailJoint;
    position = [-length, 0, 0];
  }
  return rig.tailJoints[0]?.joint || null;
}

function addEye(parent, position, size = 0.025, iris = "#171714") {
  ellipsoid(parent, "#e8d7aa", position, [size * 1.22, size, size * 0.42], "eye-rim", { shadow: false });
  ellipsoid(parent, iris, [position[0] + size * 0.22, position[1], position[2] + size * 0.39], [size * 0.66, size * 0.72, size * 0.26], "eye", { shadow: false });
}

function addNose(parent, position, scale, color = "#201b19") {
  return ellipsoid(parent, color, position, scale, "nose", { roughness: 0.72, shadow: false });
}

function addEar(parent, color, position, scale, tilt = 0, name = "ear") {
  return cone(parent, color, position, scale, [0, 0, tilt], name);
}

function addRosette(parent, position, size, bodyColor) {
  ellipsoid(parent, "#3a271d", position, [size, size * 0.72, 0.011], "rosette", { shadow: false });
  ellipsoid(parent, bodyColor, [position[0], position[1], position[2] + 0.009], [size * 0.42, size * 0.3, 0.008], "rosette-center", { shadow: false });
}

function addPatch(parent, color, position, scale, rotation = 0) {
  const patch = ellipsoid(parent, color, position, [...scale.slice(0, 2), scale[2] || 0.012], "marking", { shadow: false });
  patch.rotation.z = rotation;
  return patch;
}

function addQuadrupedLegs(model, rig, config) {
  const sides = [
    { id: "far", z: -config.track, phaseSide: -1 },
    { id: "near", z: config.track, phaseSide: 1 }
  ];
  for (const side of sides) {
    addLeg(model, rig, {
      id: `${side.id}-fore`,
      role: "fore",
      side: side.id,
      attach: [config.foreX, config.foreY, side.z],
      upperLength: config.foreUpper,
      lowerLength: config.foreLower,
      ankleLength: config.foreAnkle ?? config.ankleLength,
      radii: config.foreRadii || config.radii,
      foot: config.foreFoot || config.foot,
      color: config.foreColor || config.color,
      footColor: config.foreFootColor || config.footColor || config.foreColor || config.color,
      rest: config.foreRest,
      bend: config.foreBend ?? 1,
      phase: config.forePhase?.(side.phaseSide),
      toes: config.foreToes ?? config.toes ?? 0
    });
    addLeg(model, rig, {
      id: `${side.id}-hind`,
      role: "hind",
      side: side.id,
      attach: [config.hindX, config.hindY, side.z],
      upperLength: config.hindUpper,
      lowerLength: config.hindLower,
      ankleLength: config.hindAnkle ?? config.ankleLength,
      radii: config.hindRadii || config.radii,
      foot: config.hindFoot || config.foot,
      color: config.hindColor || config.color,
      footColor: config.hindFootColor || config.footColor || config.hindColor || config.color,
      rest: config.hindRest,
      bend: config.hindBend ?? -1,
      phase: config.hindPhase?.(side.phaseSide),
      toes: config.hindToes ?? config.toes ?? 0
    });
  }
}

function setHead(rig, head, restZ = 0) {
  rig.headPivot = head;
  rig.headRestZ = restZ;
  head.rotation.z = restZ;
  return head;
}

function createTrex() {
  const model = new THREE.Group();
  const rig = createRig("trex", "biped", { strideLength: 144, hipSwing: 0.6, kneeLift: 0.78, tailSwing: 0.04 });
  rig.torso = joint(model, [0, 0, 0], "torso");
  ellipsoid(rig.torso, "#557354", [-0.08, 0.78, 0], [0.56, 0.31, 0.25], "ribcage");
  ellipsoid(rig.torso, "#49684c", [-0.28, 0.75, 0], [0.34, 0.34, 0.28], "pelvis");
  ellipsoid(rig.torso, "#728c61", [0.18, 0.7, 0.225], [0.29, 0.19, 0.018], "belly", { shadow: false });
  segment(model, "#567557", [0.25, 0.87, 0], [0.48, 1.05, 0], 0.19, 0.14, "neck");
  const head = setHead(rig, joint(model, [0.54, 1.08, 0], "head"), -0.045);
  ellipsoid(head, "#5d7e58", [0, 0, 0], [0.35, 0.2, 0.22], "skull");
  ellipsoid(head, "#627e57", [0.27, -0.055, 0.012], [0.3, 0.12, 0.19], "snout");
  ellipsoid(head, "#d4c9a4", [0.25, -0.13, 0.018], [0.27, 0.045, 0.17], "lower-jaw");
  addEye(head, [0.075, 0.07, 0.205], 0.034, "#161712");
  addNose(head, [0.48, -0.02, 0.11], [0.035, 0.025, 0.024], "#263126");
  for (let index = 0; index < 4; index++) {
    cone(head, "#eee4c9", [0.13 + index * 0.1, -0.145, 0.145], [0.012, 0.035, 0.012], [0, 0, Math.PI], "tooth", { shadow: false });
  }
  for (const side of [{ id: "far", z: -0.17 }, { id: "near", z: 0.17 }]) {
    addLeg(model, rig, {
      id: `${side.id}-hind`, role: "hind", side: side.id, attach: [-0.12, 0.72, side.z],
      upperLength: 0.34, lowerLength: 0.31, ankleLength: 0.12,
      radii: [0.13, 0.085, 0.045], foot: [0.22, 0.055, 0.09],
      color: "#49694a", footColor: "#3f5b3e", rest: [-0.2, 0.48, -0.26, 0.04],
      bend: -1, toes: 3
    });
    addArm(model, rig, {
      id: `${side.id}-arm`, side: side.id, attach: [0.29, 0.88, side.z * 1.08],
      upperLength: 0.13, lowerLength: 0.105, radii: [0.044, 0.03, 0.017],
      color: "#526f50", rest: [-0.6, 0.72], phase: side.id === "near" ? 0 : Math.PI
    });
  }
  addTail(model, rig, {
    base: [-0.48, 0.82, 0], lengths: [0.38, 0.34, 0.29, 0.22],
    radii: [0.19, 0.145, 0.1, 0.06, 0.018], color: "#4b6b4b",
    rest: [0.06, -0.025, -0.04, -0.025]
  });
  for (const [x, y, s] of [[-0.32, 0.96, 0.035], [-0.11, 1.03, 0.03], [0.1, 1.02, 0.025]]) {
    ellipsoid(model, "#3d5a43", [x, y, 0.23], [s, s * 0.65, 0.014], "scale-mark", { shadow: false });
  }
  return { model, rig };
}

function createLeopard() {
  const model = new THREE.Group();
  const rig = createRig("leopard", "feline", { strideLength: 128, hipSwing: 0.55, kneeLift: 0.76, tailSwing: 0.13 });
  rig.torso = joint(model, [0, 0, 0], "torso");
  ellipsoid(rig.torso, "#c79245", [0.02, 0.61, 0], [0.5, 0.22, 0.2], "ribcage");
  ellipsoid(rig.torso, "#bd823a", [-0.34, 0.61, 0], [0.28, 0.24, 0.22], "pelvis");
  ellipsoid(rig.torso, "#d6a85b", [0.26, 0.64, 0], [0.25, 0.25, 0.22], "shoulder");
  ellipsoid(rig.torso, "#e2bd72", [0.04, 0.48, 0.185], [0.31, 0.095, 0.018], "underbelly", { shadow: false });
  segment(model, "#c69044", [0.32, 0.67, 0], [0.47, 0.76, 0], 0.17, 0.135, "neck");
  const head = setHead(rig, joint(model, [0.54, 0.79, 0], "head"), -0.035);
  ellipsoid(head, "#c99548", [0, 0, 0], [0.23, 0.18, 0.18], "skull");
  ellipsoid(head, "#e8c989", [0.17, -0.065, 0.025], [0.17, 0.095, 0.145], "muzzle");
  addNose(head, [0.315, -0.045, 0.055], [0.036, 0.027, 0.04]);
  addEye(head, [0.075, 0.045, 0.17], 0.025, "#8d6b2e");
  addEar(head, "#8e5b33", [-0.09, 0.19, -0.07], [0.07, 0.12, 0.055], -0.18);
  addEar(head, "#9d6735", [0.09, 0.2, -0.045], [0.07, 0.12, 0.055], 0.14);
  addQuadrupedLegs(model, rig, {
    track: 0.145, foreX: 0.29, foreY: 0.55, hindX: -0.32, hindY: 0.55,
    foreUpper: 0.22, foreLower: 0.22, hindUpper: 0.24, hindLower: 0.23,
    ankleLength: 0.065, radii: [0.068, 0.047, 0.03], foot: [0.105, 0.035, 0.055],
    color: "#b57b38", footColor: "#c3934c", foreRest: [0.08, -0.12, 0.06, 0],
    hindRest: [-0.23, 0.46, -0.25, 0.02], toes: 2
  });
  addTail(model, rig, {
    base: [-0.54, 0.66, 0], lengths: [0.3, 0.28, 0.25, 0.19],
    radii: [0.07, 0.065, 0.055, 0.04, 0.022], color: "#b77d3c",
    rest: [-0.04, -0.08, -0.05, 0.04]
  });
  const spots = [[-0.35, 0.68, .05], [-0.2, .54, .038], [-.05, .7, .047], [.1, .55, .04], [.25, .72, .045], [.38, .61, .032], [-.43, .55, .03], [.03, .63, .025]];
  for (const [x, y, size] of spots) addRosette(model, [x, y, 0.202], size, "#c79245");
  return { model, rig };
}

function createRabbit() {
  const model = new THREE.Group();
  const rig = createRig("rabbit", "rabbit", { strideLength: 150, hipSwing: 0.72, kneeLift: 1.02, bob: 0.065 });
  rig.torso = joint(model, [0, 0, 0], "torso");
  ellipsoid(rig.torso, "#aaa59c", [-0.04, 0.56, 0], [0.43, 0.28, 0.23], "ribcage");
  ellipsoid(rig.torso, "#96928c", [-0.3, 0.55, 0], [0.32, 0.34, 0.27], "powerful-haunches");
  ellipsoid(rig.torso, "#d2cdc4", [0.18, 0.47, 0.21], [0.25, 0.14, 0.018], "belly", { shadow: false });
  const head = setHead(rig, joint(model, [0.36, 0.79, 0], "head"), 0.04);
  ellipsoid(head, "#aaa69f", [0, 0, 0], [0.24, 0.25, 0.21], "skull");
  ellipsoid(head, "#cbc5bc", [0.16, -0.08, 0.035], [0.15, 0.115, 0.15], "muzzle");
  addNose(head, [0.29, -0.045, 0.075], [0.028, 0.023, 0.027], "#765e5d");
  addEye(head, [0.075, 0.06, 0.202], 0.03, "#2b211e");
  for (const [z, tilt] of [[-0.075, -0.09], [0.075, 0.1]]) {
    const ear = ellipsoid(head, "#9f9a93", [-0.04 + z * 0.2, 0.38, z], [0.075, 0.34, 0.055], "ear");
    ear.rotation.z = tilt;
    ellipsoid(ear, "#b88786", [0, 0.06, z > 0 ? 0.052 : -0.052], [0.027, 0.22, 0.009], "inner-ear", { shadow: false });
  }
  addQuadrupedLegs(model, rig, {
    track: 0.145, foreX: 0.26, foreY: 0.5, hindX: -0.26, hindY: 0.52,
    foreUpper: 0.16, foreLower: 0.17, hindUpper: 0.28, hindLower: 0.24,
    foreAnkle: 0.04, hindAnkle: 0.095,
    foreRadii: [0.055, 0.038, 0.026], hindRadii: [0.12, 0.072, 0.04],
    foreFoot: [0.09, 0.032, 0.05], hindFoot: [0.2, 0.045, 0.075],
    color: "#99958e", footColor: "#b8b2a9", foreRest: [0.12, -0.2, 0.08, 0],
    hindRest: [-0.5, 0.92, -0.55, 0.12], foreBend: 1, hindBend: -1
  });
  ellipsoid(model, "#e4dfd6", [-0.47, 0.64, 0], [0.13, 0.13, 0.13], "tail");
  return { model, rig };
}

function createLion() {
  const model = new THREE.Group();
  const rig = createRig("lion", "feline", { strideLength: 142, hipSwing: 0.48, kneeLift: 0.62, bob: 0.024 });
  rig.torso = joint(model, [0, 0, 0], "torso");
  ellipsoid(rig.torso, "#b9874d", [0, 0.66, 0], [0.51, 0.27, 0.23], "ribcage");
  ellipsoid(rig.torso, "#a97643", [-0.34, 0.65, 0], [0.3, 0.29, 0.25], "pelvis");
  ellipsoid(rig.torso, "#c49253", [0.28, 0.69, 0], [0.29, 0.31, 0.25], "deep-chest");
  const mane = joint(model, [0.42, 0.82, 0], "mane-root");
  for (const [x, y, z, sx, sy] of [[-.06, .02, 0, .3, .34], [-.1, -.13, .03, .27, .25], [.08, .13, -.02, .23, .24]]) {
    ellipsoid(mane, "#6e4a32", [x, y, z], [sx, sy, 0.19], "mane");
  }
  const head = setHead(rig, joint(model, [0.54, 0.87, 0.04], "head"), -0.02);
  ellipsoid(head, "#b9864c", [0, 0, 0], [0.24, 0.21, 0.19], "skull");
  ellipsoid(head, "#d8b073", [0.17, -0.07, 0.028], [0.17, 0.11, 0.145], "muzzle");
  addNose(head, [0.31, -0.05, 0.07], [0.04, 0.03, 0.04]);
  addEye(head, [0.07, 0.045, 0.183], 0.026, "#9c7132");
  addEar(head, "#6f4931", [-0.09, 0.19, -0.08], [0.065, 0.1, 0.05], -0.2);
  addEar(head, "#7c5233", [0.1, 0.2, -0.06], [0.065, 0.1, 0.05], 0.2);
  addQuadrupedLegs(model, rig, {
    track: 0.155, foreX: 0.29, foreY: 0.57, hindX: -0.33, hindY: 0.57,
    foreUpper: 0.24, foreLower: 0.23, hindUpper: 0.25, hindLower: 0.23,
    ankleLength: 0.06, radii: [0.085, 0.057, 0.034], foot: [0.12, 0.043, 0.068],
    color: "#a87542", footColor: "#b9864b", foreRest: [0.06, -0.12, 0.06, 0],
    hindRest: [-0.2, 0.42, -0.23, 0.02], toes: 2
  });
  addTail(model, rig, {
    base: [-0.55, 0.68, 0], lengths: [0.31, 0.29, 0.24],
    radii: [0.05, 0.043, 0.034, 0.022], color: "#a97643", rest: [-0.08, -0.1, 0.02]
  });
  const tailEnd = rig.tailJoints.at(-1)?.joint;
  if (tailEnd) ellipsoid(tailEnd, "#5f4230", [-0.25, 0, 0], [0.095, 0.075, 0.07], "tail-tuft");
  return { model, rig };
}

function createElephant() {
  const model = new THREE.Group();
  const rig = createRig("elephant", "elephant", { strideLength: 194, hipSwing: 0.22, kneeLift: 0.18, roll: 0.018 });
  rig.torso = joint(model, [0, 0, 0], "torso");
  ellipsoid(rig.torso, "#718087", [-0.05, 0.72, 0], [0.59, 0.39, 0.33], "barrel-body");
  ellipsoid(rig.torso, "#66767e", [0.27, 0.79, 0], [0.35, 0.41, 0.34], "high-shoulders");
  const head = setHead(rig, joint(model, [0.48, 0.79, 0], "head"), -0.02);
  ellipsoid(head, "#78878d", [0, 0, 0], [0.31, 0.3, 0.28], "skull");
  ellipsoid(head, "#596970", [-0.04, 0.02, -0.22], [0.2, 0.27, 0.04], "far-ear");
  ellipsoid(head, "#87959a", [-0.03, 0.015, 0.265], [0.23, 0.3, 0.045], "near-ear");
  addEye(head, [0.12, 0.07, 0.266], 0.023, "#302b27");
  const trunkBase = joint(head, [0.235, -0.12, 0.04], "trunk-root");
  const trunkLengths = [0.24, 0.21, 0.17];
  let trunkParent = trunkBase;
  for (let index = 0; index < trunkLengths.length; index++) {
    const length = trunkLengths[index];
    segment(trunkParent, "#738389", [0, 0, 0], [0.035, -length, 0], 0.07 - index * 0.014, 0.057 - index * 0.014, `trunk-${index + 1}`);
    const next = joint(trunkParent, [0.035, -length, 0], `trunk-${index + 1}-joint`);
    next.rotation.z = index === 2 ? -0.28 : 0.1;
    trunkParent = next;
  }
  for (const z of [-0.135, 0.135]) cone(head, "#e7dfc6", [0.21, -0.17, z], [0.026, 0.12, 0.026], [0, 0, Math.PI], "tusk");
  addQuadrupedLegs(model, rig, {
    track: 0.22, foreX: 0.3, foreY: 0.58, hindX: -0.35, hindY: 0.57,
    foreUpper: 0.28, foreLower: 0.25, hindUpper: 0.28, hindLower: 0.25,
    ankleLength: 0.04, radii: [0.115, 0.095, 0.082], foot: [0.12, 0.055, 0.105],
    color: "#66777e", footColor: "#596a71", foreRest: [0.02, -0.035, 0.02, 0],
    hindRest: [-0.035, 0.07, -0.03, 0]
  });
  addTail(model, rig, {
    base: [-0.59, 0.74, 0], lengths: [0.24, 0.2], radii: [0.033, 0.025, 0.014],
    color: "#5f7077", rest: [-0.48, -0.05]
  });
  const tailEnd = rig.tailJoints.at(-1)?.joint;
  if (tailEnd) ellipsoid(tailEnd, "#39464a", [-0.19, 0, 0], [0.06, 0.055, 0.05], "tail-brush");
  return { model, rig };
}

function createGiraffe() {
  const model = new THREE.Group();
  const rig = createRig("giraffe", "giraffe", { strideLength: 188, hipSwing: 0.42, kneeLift: 0.3, headNod: 0.008 });
  rig.torso = joint(model, [0, 0, 0], "torso");
  ellipsoid(rig.torso, "#cf9b51", [-0.04, 1.02, 0], [0.48, 0.25, 0.22], "ribcage");
  ellipsoid(rig.torso, "#c28a43", [0.29, 1.09, 0], [0.28, 0.31, 0.24], "high-shoulders");
  segment(model, "#c9964c", [0.27, 1.12, 0], [0.39, 1.72, 0], 0.13, 0.095, "lower-neck");
  segment(model, "#d1a155", [0.39, 1.7, 0], [0.47, 1.97, 0], 0.095, 0.075, "upper-neck");
  const head = setHead(rig, joint(model, [0.49, 2.02, 0], "head"), -0.04);
  ellipsoid(head, "#d2a158", [0, 0, 0], [0.22, 0.14, 0.15], "skull");
  ellipsoid(head, "#e0b878", [0.17, -0.045, 0.02], [0.18, 0.09, 0.13], "muzzle");
  addNose(head, [0.32, -0.025, 0.07], [0.026, 0.019, 0.02], "#644a33");
  addEye(head, [0.06, 0.045, 0.145], 0.022, "#2c241c");
  for (const [z, x] of [[-0.065, -0.03], [0.065, 0.075]]) {
    segment(head, "#a46e35", [x, 0.11, z], [x, 0.26, z], 0.025, 0.02, "ossicone");
    ellipsoid(head, "#60452f", [x, 0.275, z], [0.035, 0.035, 0.035], "ossicone-tip");
  }
  addEar(head, "#b57b3d", [-0.08, 0.13, -0.13], [0.055, 0.11, 0.04], -0.7);
  addEar(head, "#c18a45", [0.02, 0.14, 0.13], [0.055, 0.11, 0.04], 0.7);
  addQuadrupedLegs(model, rig, {
    track: 0.135, foreX: 0.28, foreY: 0.96, hindX: -0.33, hindY: 0.92,
    foreUpper: 0.46, foreLower: 0.43, hindUpper: 0.44, hindLower: 0.41,
    ankleLength: 0.08, radii: [0.062, 0.043, 0.03], foot: [0.09, 0.04, 0.052],
    color: "#c58e47", footColor: "#544332", foreRest: [0.04, -0.08, 0.04, 0],
    hindRest: [-0.08, 0.17, -0.09, 0]
  });
  addTail(model, rig, {
    base: [-0.52, 1.03, 0], lengths: [0.24, 0.2], radii: [0.034, 0.026, 0.014],
    color: "#b57d3e", rest: [-0.36, -0.08]
  });
  const patches = [[-.34, 1.1, .085], [-.12, .95, .07], [.1, 1.09, .072], [.29, 1.16, .06], [.34, 1.47, .048], [.39, 1.68, .042], [.43, 1.87, .035]];
  for (const [x, y, size] of patches) addPatch(model, "#85552d", [x, y, x > .32 ? .105 : .218], [size, size * .8, .012], x * 0.8);
  return { model, rig };
}

function createPanda() {
  const model = new THREE.Group();
  const rig = createRig("panda", "bear", { strideLength: 170, hipSwing: 0.32, kneeLift: 0.38, roll: 0.032 });
  rig.torso = joint(model, [0, 0, 0], "torso");
  ellipsoid(rig.torso, "#dedbd2", [-0.05, 0.65, 0], [0.49, 0.36, 0.31], "barrel-body");
  ellipsoid(rig.torso, "#202725", [0.27, 0.71, 0], [0.29, 0.34, 0.31], "shoulder-band");
  ellipsoid(rig.torso, "#efede7", [0.04, 0.54, 0.28], [0.27, 0.18, 0.018], "belly", { shadow: false });
  const head = setHead(rig, joint(model, [0.42, 0.88, 0], "head"), 0.02);
  ellipsoid(head, "#ebe9e2", [0, 0, 0], [0.3, 0.29, 0.27], "skull");
  ellipsoid(head, "#d8d3c9", [0.2, -0.09, 0.03], [0.16, 0.11, 0.16], "muzzle");
  addNose(head, [0.33, -0.055, 0.075], [0.038, 0.027, 0.038]);
  for (const z of [-0.16, 0.16]) ellipsoid(head, "#1e2524", [-0.09, 0.22, z], [0.105, 0.11, 0.08], "ear");
  addPatch(head, "#222827", [0.08, 0.055, 0.255], [0.074, 0.105, 0.013], -0.42);
  addEye(head, [0.095, 0.062, 0.267], 0.019, "#151918");
  addQuadrupedLegs(model, rig, {
    track: 0.19, foreX: 0.27, foreY: 0.55, hindX: -0.32, hindY: 0.54,
    foreUpper: 0.23, foreLower: 0.21, hindUpper: 0.24, hindLower: 0.21,
    ankleLength: 0.045, radii: [0.105, 0.075, 0.05], foot: [0.13, 0.055, 0.085],
    color: "#222927", footColor: "#171c1b", foreRest: [0.08, -0.14, 0.08, 0],
    hindRest: [-0.15, 0.3, -0.16, 0]
  });
  ellipsoid(model, "#202725", [-0.48, 0.64, 0], [0.1, 0.1, 0.1], "tail");
  return { model, rig };
}

function createFox() {
  const model = new THREE.Group();
  const rig = createRig("fox", "canid", { strideLength: 134, hipSwing: 0.5, kneeLift: 0.68, tailSwing: 0.12 });
  rig.torso = joint(model, [0, 0, 0], "torso");
  ellipsoid(rig.torso, "#b65332", [0, 0.61, 0], [0.45, 0.24, 0.2], "ribcage");
  ellipsoid(rig.torso, "#9f452e", [-0.32, 0.61, 0], [0.27, 0.27, 0.22], "pelvis");
  ellipsoid(rig.torso, "#c26339", [0.27, 0.66, 0], [0.25, 0.29, 0.22], "chest");
  ellipsoid(rig.torso, "#ddd0ba", [0.19, 0.53, 0.19], [0.22, 0.12, 0.016], "chest-white", { shadow: false });
  segment(model, "#b65633", [0.3, 0.7, 0], [0.45, 0.78, 0], 0.15, 0.115, "neck");
  const head = setHead(rig, joint(model, [0.52, 0.82, 0], "head"), -0.02);
  ellipsoid(head, "#b95634", [0, 0, 0], [0.21, 0.2, 0.18], "skull");
  ellipsoid(head, "#d5aa79", [0.2, -0.065, 0.025], [0.24, 0.095, 0.125], "long-muzzle");
  addNose(head, [0.41, -0.045, 0.055], [0.035, 0.026, 0.032]);
  addEye(head, [0.07, 0.045, 0.172], 0.024, "#30231d");
  addEar(head, "#803729", [-0.09, 0.24, -0.065], [0.085, 0.19, 0.058], -0.16);
  addEar(head, "#8f3e2b", [0.1, 0.25, -0.045], [0.085, 0.19, 0.058], 0.15);
  addQuadrupedLegs(model, rig, {
    track: 0.135, foreX: 0.28, foreY: 0.53, hindX: -0.3, hindY: 0.53,
    foreUpper: 0.22, foreLower: 0.22, hindUpper: 0.23, hindLower: 0.22,
    ankleLength: 0.06, radii: [0.06, 0.04, 0.027], foot: [0.1, 0.033, 0.05],
    color: "#9e4630", footColor: "#332d2b", foreRest: [0.08, -0.14, 0.08, 0],
    hindRest: [-0.22, 0.44, -0.24, 0.02], toes: 2
  });
  addTail(model, rig, {
    base: [-0.48, 0.68, 0], lengths: [0.29, 0.27, 0.24], radii: [0.16, 0.14, 0.11, 0.06],
    color: "#a8492f", colors: ["#a8492f", "#a8492f", "#e2d6c3"],
    rest: [-0.1, -0.1, 0.02], fluffy: true
  });
  return { model, rig };
}

function createMonkey() {
  const model = new THREE.Group();
  const rig = createRig("monkey", "primate", { strideLength: 146, hipSwing: 0.5, kneeLift: 0.72, tailSwing: 0.16 });
  rig.torso = joint(model, [0, 0, 0], "torso");
  ellipsoid(rig.torso, "#665044", [-0.05, 0.7, 0], [0.37, 0.38, 0.25], "narrow-torso");
  ellipsoid(rig.torso, "#59443a", [-0.28, 0.57, 0], [0.29, 0.27, 0.24], "pelvis");
  ellipsoid(rig.torso, "#977660", [0.11, 0.65, 0.23], [0.22, 0.25, 0.018], "chest", { shadow: false });
  const head = setHead(rig, joint(model, [0.25, 1.01, 0], "head"), 0.05);
  ellipsoid(head, "#655044", [0, 0, 0], [0.24, 0.24, 0.21], "skull");
  ellipsoid(head, "#a98168", [0.13, -0.085, 0.035], [0.17, 0.13, 0.15], "muzzle");
  addNose(head, [0.27, -0.055, 0.072], [0.035, 0.025, 0.035], "#453932");
  addEye(head, [0.065, 0.04, 0.2], 0.025, "#241e1b");
  for (const z of [-0.19, 0.19]) ellipsoid(head, "#9a7965", [-0.07, -0.01, z], [0.09, 0.12, 0.04], "ear");
  addQuadrupedLegs(model, rig, {
    track: 0.145, foreX: 0.2, foreY: 0.67, hindX: -0.27, hindY: 0.52,
    foreUpper: 0.29, foreLower: 0.28, hindUpper: 0.25, hindLower: 0.24,
    foreAnkle: 0.065, hindAnkle: 0.075,
    foreRadii: [0.066, 0.047, 0.03], hindRadii: [0.085, 0.055, 0.035],
    foreFoot: [0.14, 0.032, 0.06], hindFoot: [0.15, 0.038, 0.065],
    foreColor: "#59443a", hindColor: "#5f493d", footColor: "#3f3732",
    foreRest: [0.24, -0.36, 0.12, 0], hindRest: [-0.35, 0.7, -0.38, 0.08],
    foreBend: 1, hindBend: -1, toes: 2
  });
  addTail(model, rig, {
    base: [-0.48, 0.61, 0], lengths: [0.26, 0.24, 0.22, 0.19],
    radii: [0.045, 0.039, 0.032, 0.025, 0.016], color: "#554137",
    rest: [-0.45, -0.45, -0.38, 0.12]
  });
  return { model, rig };
}

function createPenguin() {
  const model = new THREE.Group();
  const rig = createRig("penguin", "penguin", { strideLength: 112, hipSwing: 0.22, kneeLift: 0.18, roll: 0.12 });
  rig.torso = joint(model, [0, 0, 0], "torso");
  ellipsoid(rig.torso, "#1d292d", [-0.02, 0.59, 0], [0.33, 0.52, 0.27], "streamlined-body");
  ellipsoid(rig.torso, "#ece9df", [0.105, 0.53, 0.255], [0.235, 0.38, 0.018], "white-breast", { shadow: false });
  const head = setHead(rig, joint(model, [0.04, 0.98, 0], "head"), 0.01);
  ellipsoid(head, "#1b272a", [0, 0, 0], [0.28, 0.27, 0.235], "skull");
  ellipsoid(head, "#f0ede3", [0.105, -0.015, 0.22], [0.13, 0.16, 0.016], "face-patch", { shadow: false });
  cone(head, "#c88130", [0.285, -0.025, 0.05], [0.075, 0.18, 0.065], [0, 0, -Math.PI / 2], "beak");
  addEye(head, [0.1, 0.07, 0.225], 0.023, "#171918");
  for (const side of [{ id: "far", z: -0.11 }, { id: "near", z: 0.11 }]) {
    addLeg(model, rig, {
      id: `${side.id}-leg`, role: "hind", side: side.id, attach: [-0.015, 0.23, side.z],
      upperLength: 0.105, lowerLength: 0.085, ankleLength: 0.025,
      radii: [0.058, 0.045, 0.035], foot: [0.16, 0.035, 0.075],
      color: "#b66f2b", footColor: "#d58a32", rest: [-0.05, 0.1, -0.05, 0],
      bend: -1, toes: 3
    });
    addFlipper(model, rig, {
      id: `${side.id}-wing`, side: side.id, attach: [0.01, 0.75, side.z * 2.05],
      color: "#172327", rest: side.id === "near" ? -0.12 : 0.08,
      phase: side.id === "near" ? 0 : Math.PI
    });
  }
  cone(model, "#172326", [-0.27, 0.34, 0], [0.07, 0.14, 0.06], [0, 0, Math.PI / 2], "tail");
  return { model, rig };
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
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse((node) => {
    if (node.geometry) geometries.add(node.geometry);
    const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of nodeMaterials) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) textures.add(value);
      }
    }
  });
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
}

export function createAnimalModel(id) {
  const animal = animalById(id);
  const { model, rig } = creators[animal.id]();
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const targetHeight = 1.08;
  const scale = targetHeight / Math.max(0.1, size.y);
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);

  const root = new THREE.Group();
  root.name = `runner-${animal.id}`;
  root.add(model);
  root.userData.species = animal.id;
  root.userData.visualSize = { x: size.x * scale, y: size.y * scale, z: size.z * scale };
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = !node.userData.noShadow;
    node.receiveShadow = !node.userData.noShadow;
  });
  return { animal, root, model, rig, parts: rig };
}
