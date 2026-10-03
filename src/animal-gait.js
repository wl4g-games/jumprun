const TAU = Math.PI * 2;

const PRESETS = Object.freeze({
  biped: {
    strideLength: 148,
    hipSwing: 0.58,
    kneeLift: 0.82,
    ankleFlex: 0.34,
    appendageSwing: 0.28,
    jumpTuck: 0.72,
    bob: 0.035,
    pitch: 0.035,
    roll: 0.012,
    airPitch: 0.11,
    tailSwing: 0.055,
    headNod: 0.025
  },
  feline: {
    strideLength: 132,
    hipSwing: 0.52,
    kneeLift: 0.72,
    ankleFlex: 0.3,
    appendageSwing: 0.22,
    jumpTuck: 0.78,
    bob: 0.028,
    pitch: 0.03,
    roll: 0.012,
    airPitch: 0.08,
    tailSwing: 0.12,
    headNod: 0.018
  },
  rabbit: {
    strideLength: 154,
    hipSwing: 0.7,
    kneeLift: 0.98,
    ankleFlex: 0.42,
    appendageSwing: 0.18,
    jumpTuck: 0.94,
    bob: 0.075,
    pitch: 0.065,
    roll: 0.008,
    airPitch: 0.12,
    tailSwing: 0.025,
    headNod: 0.04
  },
  elephant: {
    strideLength: 188,
    hipSwing: 0.25,
    kneeLift: 0.2,
    ankleFlex: 0.12,
    appendageSwing: 0.1,
    jumpTuck: 0.2,
    bob: 0.015,
    pitch: 0.012,
    roll: 0.022,
    airPitch: 0.035,
    tailSwing: 0.075,
    headNod: 0.012
  },
  giraffe: {
    strideLength: 184,
    hipSwing: 0.4,
    kneeLift: 0.32,
    ankleFlex: 0.18,
    appendageSwing: 0.12,
    jumpTuck: 0.34,
    bob: 0.02,
    pitch: 0.018,
    roll: 0.018,
    airPitch: 0.055,
    tailSwing: 0.08,
    headNod: 0.01
  },
  bear: {
    strideLength: 166,
    hipSwing: 0.34,
    kneeLift: 0.4,
    ankleFlex: 0.2,
    appendageSwing: 0.14,
    jumpTuck: 0.48,
    bob: 0.038,
    pitch: 0.025,
    roll: 0.035,
    airPitch: 0.065,
    tailSwing: 0.025,
    headNod: 0.024
  },
  canid: {
    strideLength: 138,
    hipSwing: 0.48,
    kneeLift: 0.64,
    ankleFlex: 0.29,
    appendageSwing: 0.2,
    jumpTuck: 0.68,
    bob: 0.026,
    pitch: 0.03,
    roll: 0.012,
    airPitch: 0.08,
    tailSwing: 0.15,
    headNod: 0.018
  },
  primate: {
    strideLength: 146,
    hipSwing: 0.5,
    kneeLift: 0.72,
    ankleFlex: 0.32,
    appendageSwing: 0.3,
    jumpTuck: 0.74,
    bob: 0.04,
    pitch: 0.042,
    roll: 0.025,
    airPitch: 0.1,
    tailSwing: 0.17,
    headNod: 0.03
  },
  penguin: {
    strideLength: 116,
    hipSwing: 0.24,
    kneeLift: 0.2,
    ankleFlex: 0.3,
    appendageSwing: 0.2,
    jumpTuck: 0.3,
    bob: 0.026,
    pitch: 0.02,
    roll: 0.13,
    airPitch: 0.065,
    tailSwing: 0.02,
    headNod: 0.018
  }
});

const SPECIES_GAITS = Object.freeze({
  trex: "biped",
  leopard: "feline",
  rabbit: "rabbit",
  lion: "feline",
  elephant: "elephant",
  giraffe: "giraffe",
  panda: "bear",
  fox: "canid",
  monkey: "primate",
  penguin: "penguin"
});

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function angle(value) {
  if (Number.isFinite(value)) return value;
  return Number.isFinite(value?.z) ? value.z : 0;
}

function writeRotation(joint, value, axis = "z") {
  if (joint?.rotation && ["x", "y", "z"].includes(axis)) joint.rotation[axis] = finite(value);
}

function resolveGait(rig) {
  const requested = String(rig?.gait || "").toLowerCase();
  for (const gait of Object.keys(PRESETS)) {
    if (requested === gait || requested.includes(gait)) return gait;
  }
  return SPECIES_GAITS[String(rig?.species || "").toLowerCase()] || "feline";
}

function sideSign(side, index = 0) {
  const value = String(side || "").toLowerCase();
  if (["far", "right", "back"].includes(value)) return -1;
  if (["near", "left", "front"].includes(value)) return 1;
  return index % 2 ? -1 : 1;
}

function defaultLegPhase(gait, leg, index) {
  const near = sideSign(leg.side, index) > 0;
  const fore = leg.role === "fore";
  switch (gait) {
    case "rabbit":
      return fore ? Math.PI : 0;
    case "elephant":
      if (near && !fore) return 0;
      if (!near && !fore) return Math.PI / 2;
      if (near && fore) return Math.PI;
      return Math.PI * 1.5;
    case "giraffe":
      return near ? 0 : Math.PI;
    case "bear":
      if (near && !fore) return 0;
      if (near && fore) return Math.PI / 2;
      if (!near && !fore) return Math.PI;
      return Math.PI * 1.5;
    case "biped":
    case "penguin":
      return near ? 0 : Math.PI;
    default:
      return near === fore ? Math.PI : 0;
  }
}

function bendSign(leg) {
  if (Number.isFinite(leg.bend)) return clamp(leg.bend, -1.5, 1.5);
  return leg.role === "hind" ? -1 : 1;
}

function setLegPose(leg, offsets = {}) {
  const rest = leg.rest || {};
  const axis = leg.axis || "z";
  writeRotation(leg.hip, angle(rest.hip) + finite(offsets.hip), axis);
  writeRotation(leg.knee, angle(rest.knee) + finite(offsets.knee), axis);
  writeRotation(leg.ankle, angle(rest.ankle) + finite(offsets.ankle), axis);
  writeRotation(leg.foot, angle(rest.foot) + finite(offsets.foot), axis);
}

function groundedLegPose(gait, profile, leg, cycle, index, motionScale) {
  const theta = cycle + finite(leg.phase, defaultLegPhase(gait, leg, index));
  const swing = Math.sin(theta);
  const advancing = Math.max(0, Math.cos(theta));
  const planted = Math.max(0, -Math.cos(theta));
  const bend = bendSign(leg);
  const hind = leg.role === "hind";
  let hip = profile.hipSwing * swing;
  let knee = bend * profile.kneeLift * advancing ** 0.72;
  let ankle = -bend * profile.ankleFlex * advancing;
  let foot = -hip * (0.42 + planted * 0.28) - knee * 0.24 - ankle * 0.55;

  switch (gait) {
    case "biped":
      knee *= 1 + (hind ? 0.12 : 0);
      ankle -= bend * planted * profile.ankleFlex * 0.25;
      break;
    case "feline":
      hip *= hind ? 1.08 : 0.92;
      knee *= hind ? 1.12 : 0.88;
      ankle *= hind ? 1.08 : 0.86;
      break;
    case "rabbit": {
      const compression = Math.max(0, -Math.sin(theta));
      hip *= hind ? 1.18 : 0.72;
      knee = bend * profile.kneeLift * (0.35 + advancing * 0.65 + compression * (hind ? 0.34 : 0.12));
      ankle = -bend * profile.ankleFlex * (0.3 + advancing * 0.7);
      foot = -hip * 0.34 - knee * 0.2 - ankle * 0.62;
      break;
    }
    case "elephant":
      knee = bend * profile.kneeLift * advancing ** 1.7;
      ankle = -bend * profile.ankleFlex * advancing ** 1.4;
      foot = -hip * (0.72 + planted * 0.14) - knee * 0.12 - ankle * 0.45;
      break;
    case "giraffe":
      hip *= hind ? 1.04 : 0.96;
      knee *= 0.72;
      ankle *= 0.75;
      foot = -hip * (0.68 + planted * 0.16) - knee * 0.18 - ankle * 0.45;
      break;
    case "bear":
      hip *= hind ? 0.92 : 1.02;
      knee *= 0.78;
      ankle *= 0.82;
      foot = -hip * (0.58 + planted * 0.2) - knee * 0.18 - ankle * 0.5;
      break;
    case "canid":
      hip *= hind ? 1.08 : 0.94;
      knee *= hind ? 1.12 : 0.9;
      break;
    case "primate":
      hip *= hind ? 1.02 : 1.12;
      knee *= hind ? 1.05 : 1.18;
      ankle *= hind ? 1 : 0.82;
      foot = -hip * 0.38 - knee * 0.28 - ankle * 0.5;
      break;
    case "penguin":
      hip *= 0.78;
      knee *= 0.65;
      ankle = -hip * 0.46 - bend * profile.ankleFlex * advancing * 0.32;
      foot = -ankle * 0.75;
      break;
  }

  setLegPose(leg, {
    hip: hip * motionScale,
    knee: knee * motionScale,
    ankle: ankle * motionScale,
    foot: foot * motionScale
  });
}

function airborneLegPose(gait, profile, leg, index, verticalVelocity, motionScale) {
  const trend = clamp(verticalVelocity / 650, -1, 1);
  const bend = bendSign(leg);
  const hind = leg.role === "hind";
  const side = sideSign(leg.side, index);
  let hip = side * 0.1 - trend * 0.05;
  let tuck = profile.jumpTuck * (0.88 - Math.abs(trend) * 0.14);
  let knee = bend * tuck;
  let ankle = -bend * profile.ankleFlex * 0.72;
  let foot = -ankle * 0.65 - hip * 0.2;

  if (["feline", "canid", "bear", "elephant", "giraffe", "primate"].includes(gait)) {
    hip = (hind ? -0.3 : 0.26) + (hind ? trend * 0.1 : -trend * 0.04) + side * 0.035;
    knee = bend * tuck * (hind ? 1.08 : 0.84);
  } else if (gait === "rabbit") {
    const descentTuck = 0.68 + (1 - trend) * 0.18;
    hip = hind ? -0.48 + trend * 0.16 : 0.38 - trend * 0.08;
    knee = bend * tuck * descentTuck * (hind ? 1.08 : 0.72);
    ankle = -bend * profile.ankleFlex * (hind ? 1 : 0.62);
  } else if (gait === "penguin") {
    hip = -0.12 + side * 0.055 - trend * 0.035;
    knee = bend * tuck * 0.52;
    ankle = -bend * profile.ankleFlex * 0.42;
    foot = -ankle * 0.72;
  }

  setLegPose(leg, {
    hip: hip * motionScale,
    knee: knee * motionScale,
    ankle: ankle * motionScale,
    foot: foot * motionScale
  });
}

function setAppendages(rig, gait, profile, cycle, airborne, running, motionScale) {
  for (let index = 0; index < (rig.appendages || []).length; index++) {
    const appendage = rig.appendages[index];
    const rest = appendage.rest || {};
    const kind = String(appendage.kind || "arm").toLowerCase();
    let shoulder = 0;
    let elbow = 0;
    if (airborne) {
      if (kind.includes("wing") || kind.includes("flipper")) {
        shoulder = -0.62;
        elbow = 0.1;
      } else {
        shoulder = -0.34;
        elbow = 0.42;
      }
    } else if (running) {
      const phase = finite(appendage.phase, index * Math.PI);
      shoulder = -Math.sin(cycle + phase) * profile.appendageSwing;
      elbow = (0.12 + Math.max(0, Math.cos(cycle + phase)) * 0.24) * (kind.includes("wing") ? 0.35 : 1);
      if (gait === "penguin") shoulder += Math.sin(cycle + phase) * 0.08;
    }
    const axis = appendage.axis || "z";
    writeRotation(appendage.shoulder, angle(rest.shoulder) + shoulder * motionScale, axis);
    writeRotation(appendage.elbow, angle(rest.elbow) + elbow * motionScale, axis);
  }
}

function rootMotion(gait, profile, cycle, airborne, verticalVelocity, running, motionScale) {
  if (airborne) {
    return {
      bob: 0,
      pitch: clamp(verticalVelocity / 650, -1, 1) * profile.airPitch * motionScale,
      roll: gait === "penguin" ? Math.sin(cycle) * profile.roll * 0.3 * motionScale : 0
    };
  }
  if (!running) return { bob: 0, pitch: 0, roll: 0 };

  const twice = cycle * 2;
  let bob = profile.bob * (1 - Math.cos(twice)) * 0.5;
  let pitch = profile.pitch * Math.sin(twice);
  let roll = profile.roll * Math.sin(cycle);
  if (gait === "rabbit") {
    bob = profile.bob * Math.max(0, Math.sin(cycle));
    pitch = profile.pitch * Math.sin(cycle + 0.35);
    roll *= 0.4;
  } else if (["elephant", "bear"].includes(gait)) {
    bob = profile.bob * (1 - Math.cos(cycle * 4)) * 0.5;
    pitch *= 0.45;
  } else if (gait === "giraffe") {
    pitch *= 0.42;
    roll *= 0.72;
  } else if (gait === "penguin") {
    bob = profile.bob * Math.abs(Math.sin(cycle));
    pitch = profile.pitch * Math.sin(twice) * 0.45;
    roll = profile.roll * Math.sin(cycle);
  } else if (gait === "biped") {
    roll *= 0.62;
  }
  return { bob: bob * motionScale, pitch: pitch * motionScale, roll: roll * motionScale };
}

function setTailAndHead(rig, profile, frame, cycle, pose, motionScale) {
  const elapsed = finite(frame.elapsed);
  const tailFrequency = frame.running ? cycle : elapsed * 1.7;
  for (let index = 0; index < (rig.tailJoints || []).length; index++) {
    const part = rig.tailJoints[index];
    const wave = Math.sin(tailFrequency - index * 0.48) * profile.tailSwing;
    const lift = frame.airborne ? 0.1 * Math.exp(-index * 0.42) : 0;
    writeRotation(part.joint, finite(part.restZ) + (wave * (frame.airborne ? 0.35 : 1) + lift) * motionScale, part.axis || "z");
  }
  if (rig.headPivot) {
    const nod = frame.running ? Math.sin(cycle * 2 + 0.45) * profile.headNod : Math.sin(elapsed * 1.5) * profile.headNod * 0.2;
    writeRotation(rig.headPivot, finite(rig.headRestZ) + nod * motionScale - pose.pitch * 0.72, rig.headAxis || "z");
  }
}

/**
 * Writes a complete local-space pose from the rig's rest angles. `phase` values
 * are radians; callers may omit them to use the gait's anatomical footfall order.
 */
export function animateAnimalGait(rig, frame = {}) {
  if (!rig) return { bob: 0, pitch: 0, roll: 0 };
  const gait = resolveGait(rig);
  const profile = { ...PRESETS[gait], ...(rig.profile || {}) };
  const distance = finite(frame.distance);
  const strideLength = Math.max(24, finite(profile.strideLength, PRESETS[gait].strideLength));
  const cycle = distance / strideLength * TAU;
  const airborne = Boolean(frame.airborne);
  const running = Boolean(frame.running) && !airborne;
  const motionScale = frame.reducedMotion ? 0.28 : 1;
  const verticalVelocity = finite(frame.verticalVelocity);

  for (let index = 0; index < (rig.legs || []).length; index++) {
    const leg = rig.legs[index];
    if (airborne) airborneLegPose(gait, profile, leg, index, verticalVelocity, motionScale);
    else if (running) groundedLegPose(gait, profile, leg, cycle, index, motionScale);
    else setLegPose(leg);
  }

  setAppendages(rig, gait, profile, cycle, airborne, running, motionScale);
  const pose = rootMotion(gait, profile, cycle, airborne, verticalVelocity, running, motionScale);
  setTailAndHead(rig, profile, { ...frame, airborne, running }, cycle, pose, motionScale);
  return pose;
}
