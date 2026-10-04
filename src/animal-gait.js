import { animalMorphology } from "./animal-morphology.js";

const TAU = Math.PI * 2;

// Baselines used by the original procedural runners. Legacy per-animal values
// are converted into ratios around these numbers, retaining their character
// without reintroducing the former extreme joint angles.
const LEGACY_PRESETS = Object.freeze({
  biped: Object.freeze({ hipSwing: 0.58, kneeLift: 0.82, ankleFlex: 0.34 }),
  feline: Object.freeze({ hipSwing: 0.52, kneeLift: 0.72, ankleFlex: 0.3 }),
  rabbit: Object.freeze({ hipSwing: 0.7, kneeLift: 0.98, ankleFlex: 0.42 }),
  elephant: Object.freeze({ hipSwing: 0.25, kneeLift: 0.2, ankleFlex: 0.12 }),
  giraffe: Object.freeze({ hipSwing: 0.4, kneeLift: 0.32, ankleFlex: 0.18 }),
  bear: Object.freeze({ hipSwing: 0.34, kneeLift: 0.4, ankleFlex: 0.2 }),
  canid: Object.freeze({ hipSwing: 0.48, kneeLift: 0.64, ankleFlex: 0.29 }),
  primate: Object.freeze({ hipSwing: 0.5, kneeLift: 0.72, ankleFlex: 0.32 }),
  penguin: Object.freeze({ hipSwing: 0.24, kneeLift: 0.2, ankleFlex: 0.3 }),
  eagle: Object.freeze({ hipSwing: 0.3, kneeLift: 0.42, ankleFlex: 0.28 })
});

/*
 * Angles here are deliberately conservative. The production animals are
 * skinned from detailed static meshes, so a believable ten-degree joint
 * change reads better than a rubbery forty-degree bend. Each preset models a
 * real footfall pattern; species overrides only tune weight and flexibility.
 */
const PRESETS = Object.freeze({
  biped: {
    strideLength: 170,
    dutyFactor: 0.43,
    hipForward: 0.42,
    hipBack: 0.38,
    kneeStance: 0.025,
    kneeSwing: 0.27,
    ankleStance: 0.045,
    ankleSwing: 0.15,
    minStrideLength: 115,
    maxStrideLength: 175,
    footPlantTarget: 0.62,
    plantEfficiency: 0.78,
    jumpTuck: 0.31,
    appendageSwing: 0.045,
    bob: 0.018,
    pitch: 0.014,
    posturePitch: -0.085,
    roll: 0.016,
    airPitch: 0.055,
    tailSwing: 0.018,
    tailLift: 0.025,
    tailBounce: 0.008,
    headNod: 0.008,
    headBias: 0.055,
    bodyFlex: 0.006
  },
  feline: {
    strideLength: 148,
    dutyFactor: 0.36,
    hipForward: 0.27,
    hipBack: 0.25,
    kneeStance: 0.025,
    kneeSwing: 0.24,
    ankleStance: 0.035,
    ankleSwing: 0.12,
    minStrideLength: 90,
    maxStrideLength: 145,
    footPlantTarget: 0.65,
    plantEfficiency: 0.9,
    jumpTuck: 0.28,
    appendageSwing: 0.08,
    bob: 0.026,
    pitch: 0.025,
    posturePitch: -0.012,
    roll: 0.009,
    airPitch: 0.06,
    tailSwing: 0.065,
    tailLift: 0.07,
    tailBounce: 0.015,
    headNod: 0.009,
    headBias: -0.012,
    bodyFlex: 0.045
  },
  rabbit: {
    strideLength: 156,
    dutyFactor: 0.24,
    hipForward: 0.29,
    hipBack: 0.25,
    kneeStance: 0.04,
    kneeSwing: 0.34,
    ankleStance: 0.04,
    ankleSwing: 0.17,
    minStrideLength: 110,
    maxStrideLength: 156,
    footPlantTarget: 0.6,
    plantEfficiency: 0.9,
    jumpTuck: 0.4,
    appendageSwing: 0.04,
    bob: 0.058,
    pitch: 0.045,
    posturePitch: -0.015,
    roll: 0.004,
    airPitch: 0.075,
    tailSwing: 0.018,
    tailLift: 0.06,
    tailBounce: 0.018,
    headNod: 0.018,
    headBias: -0.01,
    bodyFlex: 0.052
  },
  elephant: {
    strideLength: 205,
    dutyFactor: 0.64,
    hipForward: 0.16,
    hipBack: 0.145,
    kneeStance: 0.008,
    kneeSwing: 0.042,
    ankleStance: 0.012,
    ankleSwing: 0.028,
    minStrideLength: 125,
    maxStrideLength: 170,
    footPlantTarget: 0.28,
    plantEfficiency: 1,
    jumpTuck: 0.055,
    appendageSwing: 0.025,
    bob: 0.008,
    pitch: 0.005,
    posturePitch: 0,
    roll: 0.014,
    airPitch: 0.018,
    tailSwing: 0.035,
    tailLift: -0.025,
    tailBounce: 0.006,
    headNod: 0.004,
    headBias: 0,
    bodyFlex: 0.004
  },
  giraffe: {
    strideLength: 196,
    dutyFactor: 0.41,
    hipForward: 0.2,
    hipBack: 0.18,
    kneeStance: 0.015,
    kneeSwing: 0.105,
    ankleStance: 0.025,
    ankleSwing: 0.07,
    minStrideLength: 125,
    maxStrideLength: 180,
    footPlantTarget: 0.45,
    plantEfficiency: 1,
    jumpTuck: 0.14,
    appendageSwing: 0.04,
    bob: 0.014,
    pitch: 0.01,
    posturePitch: -0.006,
    roll: 0.01,
    airPitch: 0.032,
    tailSwing: 0.045,
    tailLift: 0.015,
    tailBounce: 0.008,
    headNod: 0.004,
    headBias: -0.008,
    bodyFlex: 0.012
  },
  bear: {
    strideLength: 182,
    dutyFactor: 0.6,
    hipForward: 0.18,
    hipBack: 0.16,
    kneeStance: 0.02,
    kneeSwing: 0.105,
    ankleStance: 0.025,
    ankleSwing: 0.065,
    minStrideLength: 95,
    maxStrideLength: 145,
    footPlantTarget: 0.48,
    plantEfficiency: 1,
    jumpTuck: 0.17,
    appendageSwing: 0.05,
    bob: 0.019,
    pitch: 0.01,
    posturePitch: -0.005,
    roll: 0.026,
    airPitch: 0.038,
    tailSwing: 0.015,
    tailLift: 0,
    tailBounce: 0.004,
    headNod: 0.009,
    headBias: -0.004,
    bodyFlex: 0.012
  },
  canid: {
    strideLength: 150,
    dutyFactor: 0.38,
    hipForward: 0.245,
    hipBack: 0.22,
    kneeStance: 0.025,
    kneeSwing: 0.215,
    ankleStance: 0.035,
    ankleSwing: 0.11,
    minStrideLength: 90,
    maxStrideLength: 135,
    footPlantTarget: 0.62,
    plantEfficiency: 0.95,
    jumpTuck: 0.26,
    appendageSwing: 0.07,
    bob: 0.024,
    pitch: 0.022,
    posturePitch: -0.01,
    roll: 0.008,
    airPitch: 0.055,
    tailSwing: 0.085,
    tailLift: 0.09,
    tailBounce: 0.018,
    headNod: 0.008,
    headBias: -0.008,
    bodyFlex: 0.035
  },
  primate: {
    strideLength: 166,
    dutyFactor: 0.49,
    hipForward: 0.17,
    hipBack: 0.15,
    kneeStance: 0.025,
    kneeSwing: 0.145,
    ankleStance: 0.03,
    ankleSwing: 0.085,
    minStrideLength: 90,
    maxStrideLength: 140,
    footPlantTarget: 0.58,
    plantEfficiency: 0.95,
    jumpTuck: 0.2,
    appendageSwing: 0.08,
    bob: 0.022,
    pitch: 0.018,
    posturePitch: -0.012,
    roll: 0.018,
    airPitch: 0.045,
    tailSwing: 0.075,
    tailLift: 0.055,
    tailBounce: 0.012,
    headNod: 0.012,
    headBias: -0.006,
    bodyFlex: 0.025
  },
  penguin: {
    strideLength: 122,
    dutyFactor: 0.65,
    hipForward: 0.16,
    hipBack: 0.15,
    kneeStance: 0.008,
    kneeSwing: 0.042,
    ankleStance: 0.015,
    ankleSwing: 0.035,
    minStrideLength: 80,
    maxStrideLength: 110,
    footPlantTarget: 0.16,
    plantEfficiency: 1,
    jumpTuck: 0.075,
    appendageSwing: 0.11,
    bob: 0.018,
    pitch: 0.006,
    posturePitch: 0,
    roll: 0.075,
    airPitch: 0.032,
    tailSwing: 0.008,
    tailLift: 0,
    tailBounce: 0.003,
    headNod: 0.006,
    headBias: 0,
    bodyFlex: 0.003
  },
  eagle: {
    strideLength: 105,
    dutyFactor: 0.58,
    hipForward: 0.19,
    hipBack: 0.17,
    kneeStance: 0.018,
    kneeSwing: 0.18,
    ankleStance: 0.025,
    ankleSwing: 0.105,
    minStrideLength: 82,
    maxStrideLength: 118,
    footPlantTarget: 0.36,
    plantEfficiency: 0.92,
    jumpTuck: 0.14,
    appendageSwing: 0.34,
    bob: 0.02,
    pitch: 0.009,
    posturePitch: -0.02,
    roll: 0.018,
    airPitch: 0.065,
    tailSwing: 0,
    tailLift: 0,
    tailBounce: 0,
    headNod: 0.008,
    headBias: -0.012,
    bodyFlex: 0.008
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
  penguin: "penguin",
  tiger: "feline",
  eagle: "eagle",
  boar: "bear",
  godzilla: "biped",
  kong: "primate",
  scar: "primate"
});

const SPECIES_PROFILES = Object.freeze({
  // Leopards are more elastic than lions; lions keep a heavier, lower stride.
  leopard: Object.freeze({ strideLength: 142, minStrideLength: 105, hipForward: 0.29, hipBack: 0.27, kneeSwing: 0.255, bodyFlex: 0.05 }),
  lion: Object.freeze({ strideLength: 170, minStrideLength: 112, hipForward: 0.275, hipBack: 0.25, kneeSwing: 0.22, bob: 0.018, bodyFlex: 0.04, tailSwing: 0.048 }),
  monkey: Object.freeze({
    dutyFactor: 0.55,
    hipForward: 0.3,
    hipBack: 0.27,
    kneeSwing: 0.18,
    ankleSwing: 0.1,
    bodyFlex: 0.035
  }),
  tiger: Object.freeze({ strideLength: 166, minStrideLength: 112, hipForward: 0.3, hipBack: 0.28, kneeSwing: 0.25, bob: 0.021, bodyFlex: 0.05 }),
  eagle: Object.freeze({ strideLength: 105, dutyFactor: 0.58, hipForward: 0.19, hipBack: 0.17, kneeSwing: 0.18 }),
  boar: Object.freeze({ strideLength: 138, dutyFactor: 0.5, hipForward: 0.25, hipBack: 0.22, kneeSwing: 0.15, bob: 0.018, pitch: 0.018, bodyFlex: 0.012 }),
  godzilla: Object.freeze({
    strideLength: 220,
    minStrideLength: 190,
    maxStrideLength: 230,
    dutyFactor: 0.64,
    hipForward: 0.34,
    hipBack: 0.31,
    kneeStance: 0.018,
    kneeSwing: 0.2,
    ankleStance: 0.04,
    ankleSwing: 0.1,
    jumpTuck: 0.12,
    bob: 0.009,
    pitch: 0.008,
    roll: 0.014,
    bodyFlex: 0.008,
    tailSwing: 0.012
  }),
  kong: Object.freeze({
    strideLength: 178,
    dutyFactor: 0.58,
    hipForward: 0.24,
    hipBack: 0.22,
    kneeSwing: 0.16,
    ankleSwing: 0.09,
    bodyFlex: 0.028,
    foreDutyOffset: 0.04,
    hindDutyOffset: -0.04
  }),
  scar: Object.freeze({
    strideLength: 184,
    dutyFactor: 0.54,
    hipForward: 0.3,
    hipBack: 0.27,
    kneeSwing: 0.17,
    ankleSwing: 0.1,
    bodyFlex: 0.04,
    foreDutyOffset: 0.02,
    hindDutyOffset: -0.05
  })
});

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

function mod1(value) {
  return ((value % 1) + 1) % 1;
}

function smoothstep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
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

function legacyRatio(value, reference) {
  if (!Number.isFinite(value) || !Number.isFinite(reference) || reference <= 0) return null;
  return clamp(value / reference, 0, 1.35);
}

function migratedRigProfile(gait, base, source = {}) {
  const migrated = { ...source };
  const legacy = LEGACY_PRESETS[gait];
  const hipRatio = legacyRatio(source.hipSwing, legacy.hipSwing);
  if (hipRatio !== null) {
    if (!Number.isFinite(source.hipForward)) migrated.hipForward = base.hipForward * hipRatio;
    if (!Number.isFinite(source.hipBack)) migrated.hipBack = base.hipBack * hipRatio;
  }
  const kneeRatio = legacyRatio(source.kneeLift, legacy.kneeLift);
  if (kneeRatio !== null && !Number.isFinite(source.kneeSwing)) {
    migrated.kneeSwing = base.kneeSwing * kneeRatio;
  }
  const ankleRatio = legacyRatio(source.ankleFlex, legacy.ankleFlex);
  if (ankleRatio !== null && !Number.isFinite(source.ankleSwing)) {
    migrated.ankleSwing = base.ankleSwing * ankleRatio;
  }
  return migrated;
}

function profileFor(rig, gait) {
  const species = String(rig?.species || "").toLowerCase();
  const morphology = animalMorphology(species);
  const base = { ...PRESETS[gait], ...(SPECIES_PROFILES[species] || {}) };
  return {
    ...base,
    posturePitch: finite(morphology.posture?.torsoPitch, base.posturePitch),
    tailStiffness: clamp(finite(morphology.tail?.stiffness, 0.5), 0, 1),
    ...migratedRigProfile(gait, base, rig.profile)
  };
}

function sideSign(side, index = 0) {
  const value = String(side || "").toLowerCase();
  if (["far", "right", "back"].includes(value)) return -1;
  if (["near", "left", "front"].includes(value)) return 1;
  return index % 2 ? -1 : 1;
}

// Positive anatomical angles move a limb rearward. The generated GLB rigs
// bend about X while the procedural fallback bends about Z, hence the sign.
function axisDirection(axis) {
  return axis === "x" ? 1 : -1;
}

function bendSign(leg) {
  if (Number.isFinite(leg.bend)) return clamp(leg.bend, -1.5, 1.5);
  return leg.role === "hind" ? -1 : 1;
}

function setLegPose(leg, offsets = {}) {
  const rest = leg.rest || {};
  const axis = leg.axis || "z";
  const direction = axisDirection(axis);
  writeRotation(leg.hip, angle(rest.hip) + finite(offsets.hip) * direction, axis);
  writeRotation(leg.knee, angle(rest.knee) + finite(offsets.knee) * direction, axis);
  writeRotation(leg.ankle, angle(rest.ankle) + finite(offsets.ankle) * direction, axis);
  writeRotation(leg.foot, angle(rest.foot) + finite(offsets.foot) * direction, axis);
}

/* Contact times are fractions of a complete stride. Gallopers place the two
 * hind feet, enter collection, then place the two forefeet. Walkers retain a
 * long stance interval so at least two or three feet visually carry weight. */
function contactFraction(gait, leg, index) {
  if (Number.isFinite(leg.phase)) return mod1(leg.phase / TAU);
  const near = sideSign(leg.side, index) > 0;
  const fore = leg.role === "fore";
  switch (gait) {
    case "rabbit":
      return fore ? (near ? 0.47 : 0.43) : (near ? 0.035 : 0);
    case "elephant":
    case "bear":
      if (near && !fore) return 0;
      if (near && fore) return 0.25;
      if (!near && !fore) return 0.5;
      return 0.75;
    case "giraffe":
      return fore ? (near ? 0.54 : 0.44) : (near ? 0.085 : 0);
    case "feline":
      return fore ? (near ? 0.55 : 0.45) : (near ? 0.09 : 0);
    case "canid":
      return fore ? (near ? 0.54 : 0.44) : (near ? 0.1 : 0);
    case "primate":
      return fore ? (near ? 0.6 : 0.49) : (near ? 0.12 : 0);
    case "biped":
    case "penguin":
    case "eagle":
      return near ? 0 : 0.5;
    default:
      return near === fore ? 0.5 : 0;
  }
}

function gaitLegProfile(gait, profile, leg) {
  const hind = leg.role === "hind";
  const result = {
    dutyFactor: profile.dutyFactor,
    hipForward: profile.hipForward,
    hipBack: profile.hipBack,
    kneeStance: profile.kneeStance,
    kneeSwing: profile.kneeSwing,
    ankleStance: profile.ankleStance,
    ankleSwing: profile.ankleSwing
  };
  if (gait === "rabbit") {
    const scale = hind ? 1.16 : 0.68;
    result.hipForward *= scale;
    result.hipBack *= scale;
    result.kneeSwing *= hind ? 1.2 : 0.54;
    result.ankleSwing *= hind ? 1.12 : 0.62;
    result.dutyFactor += hind ? 0.035 : -0.015;
  } else if (gait === "feline" || gait === "canid") {
    result.hipForward *= hind ? 1.08 : 0.92;
    result.hipBack *= hind ? 1.08 : 0.92;
    result.kneeSwing *= hind ? 1.08 : 0.9;
  } else if (gait === "giraffe") {
    result.hipForward *= hind ? 1.02 : 0.92;
    result.hipBack *= hind ? 1.02 : 0.92;
    result.kneeSwing *= hind ? 1 : 0.82;
  } else if (gait === "bear") {
    result.hipForward *= hind ? 0.92 : 1;
    result.hipBack *= hind ? 0.92 : 1;
    result.kneeSwing *= hind ? 0.9 : 1;
  } else if (gait === "primate") {
    result.hipForward *= hind ? 0.95 : 1.06;
    result.hipBack *= hind ? 0.95 : 1.06;
    result.kneeSwing *= hind ? 0.94 : 1.08;
  }
  result.dutyFactor += hind
    ? finite(profile.hindDutyOffset)
    : finite(profile.foreDutyOffset);
  result.dutyFactor = clamp(result.dutyFactor, 0.2, 0.82);
  return result;
}

function median(values) {
  if (!values.length) return null;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) * 0.5;
}

function resolveStrideMetrics(rig, gait, profile) {
  const fallbackStride = Math.max(24, finite(profile.strideLength, PRESETS[gait].strideLength));
  const target = clamp(finite(profile.footPlantTarget, 0.6), 0.1, 0.9);
  const efficiency = clamp(finite(profile.plantEfficiency, 1), 0.5, 1);
  const measured = [];

  for (const leg of rig?.legs || []) {
    const worldReach = finite(leg.worldReach, -1);
    if (worldReach <= 0.05) continue;
    const anatomy = gaitLegProfile(gait, profile, leg);
    const footCoverage = worldReach
      * (Math.sin(anatomy.hipForward) + Math.sin(anatomy.hipBack))
      * efficiency;
    measured.push({ leg, anatomy, worldReach, footCoverage });
  }

  const suggested = median(measured.map(({ anatomy, footCoverage }) => (
    footCoverage * 100 / Math.max(0.01, anatomy.dutyFactor * target)
  )));
  const minimum = Math.max(24, finite(profile.minStrideLength, fallbackStride * 0.65));
  const maximum = Math.max(minimum, finite(profile.maxStrideLength, fallbackStride));
  const strideLength = suggested === null ? fallbackStride : clamp(suggested, minimum, maximum);

  return {
    gait,
    species: String(rig?.species || ""),
    measured: measured.length > 0,
    fallbackStrideLength: fallbackStride,
    strideLength,
    legs: measured.map(({ leg, anatomy, worldReach, footCoverage }) => {
      const stanceTravel = strideLength * anatomy.dutyFactor / 100;
      return {
        id: leg.id || "leg",
        role: leg.role || "hind",
        worldReach,
        dutyFactor: anatomy.dutyFactor,
        footCoverage,
        stanceTravel,
        coverageRatio: footCoverage / Math.max(0.001, stanceTravel)
      };
    })
  };
}

/**
 * Reports the distance-based stride chosen for a rig. Real rigs provide
 * `worldReach`; lightweight fallbacks retain their authored stride unchanged.
 */
export function animalGaitMetrics(rig) {
  if (!rig) return null;
  const gait = resolveGait(rig);
  return resolveStrideMetrics(rig, gait, profileFor(rig, gait));
}

function groundedLegPose(gait, profile, leg, stridePhase, index, motionScale) {
  const anatomy = gaitLegProfile(gait, profile, leg);
  const phase = mod1(stridePhase - contactFraction(gait, leg, index));
  const bend = bendSign(leg);
  let hip;
  let knee;
  let ankle;
  let support = 0;

  if (phase < anatomy.dutyFactor) {
    const stance = phase / anatomy.dutyFactor;
    support = Math.sin(Math.PI * stance);
    // A planted foot travels rearward at almost constant speed. Interpolating
    // sin(angle), rather than angle with easing, approximates that trajectory
    // without a brittle per-frame IK solver.
    hip = Math.asin(lerp(-Math.sin(anatomy.hipForward), Math.sin(anatomy.hipBack), stance));
    // A loaded leg remains almost straight. Compression peaks near mid-stance.
    knee = bend * (anatomy.kneeStance * (0.45 + support * 0.55));
    ankle = -bend * anatomy.ankleStance * (0.35 + support * 0.65);
  } else {
    const swing = (phase - anatomy.dutyFactor) / (1 - anatomy.dutyFactor);
    const travel = smoothstep(swing);
    const clearance = Math.sin(Math.PI * swing) ** 1.15;
    hip = lerp(anatomy.hipBack, -anatomy.hipForward, travel);
    // Flex early for toe clearance, then extend before the next contact.
    knee = bend * (anatomy.kneeStance * 0.35 + anatomy.kneeSwing * clearance);
    ankle = -bend * (anatomy.ankleStance * 0.25 + anatomy.ankleSwing * clearance);
  }

  // Keep the paw/sole visually near level instead of letting every joint curl.
  const foot = -hip * (0.56 + support * 0.16) - knee * 0.24 - ankle * 0.62;
  setLegPose(leg, {
    hip: hip * motionScale,
    knee: knee * motionScale,
    ankle: ankle * motionScale,
    foot: foot * motionScale
  });
}

function airborneLegPose(gait, profile, leg, index, verticalVelocity, motionScale) {
  const trend = clamp(verticalVelocity / 650, -1, 1);
  const apex = 1 - Math.abs(trend);
  const landing = Math.max(0, -trend);
  const bend = bendSign(leg);
  const hind = leg.role === "hind";
  const side = sideSign(leg.side, index);
  let hip = side * 0.018;
  let knee = bend * profile.jumpTuck;
  let ankle = -bend * profile.ankleSwing * 0.72;

  switch (gait) {
    case "biped":
      // Power stroke trails on ascent; feet reach beneath the body for landing.
      hip = trend * 0.18 + side * 0.018;
      knee = bend * (profile.jumpTuck * (0.55 + apex * 0.45) - landing * 0.035);
      ankle = -bend * (0.07 + apex * 0.045);
      break;
    case "feline":
    case "canid":
      hip = hind ? trend * 0.16 - landing * 0.035 : -0.145 - landing * 0.035;
      hip += side * 0.012;
      knee = bend * ((hind ? 0.19 : 0.145) + apex * (hind ? 0.11 : 0.075));
      ankle = -bend * ((hind ? 0.085 : 0.065) + apex * 0.035);
      break;
    case "rabbit":
      hip = hind ? trend * 0.2 - landing * 0.045 : -0.14 - landing * 0.025;
      hip += side * 0.008;
      knee = bend * ((hind ? 0.27 : 0.105) + apex * (hind ? 0.12 : 0.045));
      ankle = -bend * ((hind ? 0.12 : 0.05) + apex * 0.045);
      break;
    case "elephant":
      // Elephants cannot anatomically tuck; the game jump reads as a heavy vault.
      hip = (hind ? 0.025 : -0.025) + side * 0.012 - landing * 0.018;
      knee = bend * (0.018 + apex * 0.018);
      ankle = -bend * (0.012 + apex * 0.008);
      break;
    case "giraffe":
      hip = (hind ? trend * 0.075 : -0.065) + side * 0.012;
      knee = bend * (0.075 + apex * 0.045);
      ankle = -bend * (0.045 + apex * 0.02);
      break;
    case "bear":
      hip = (hind ? trend * 0.09 : -0.075) + side * 0.014;
      knee = bend * (0.095 + apex * 0.065);
      ankle = -bend * (0.05 + apex * 0.025);
      break;
    case "primate":
      hip = (hind ? trend * 0.105 : -0.09) + side * 0.018;
      knee = bend * (0.11 + apex * 0.075);
      ankle = -bend * (0.055 + apex * 0.03);
      break;
    case "penguin":
      hip = trend * 0.04 + side * 0.016;
      knee = bend * (0.035 + apex * 0.025);
      ankle = -bend * (0.025 + apex * 0.012);
      break;
    case "eagle":
      hip = trend * 0.055 + side * 0.014;
      knee = bend * (0.09 + apex * 0.08 - landing * 0.025);
      ankle = -bend * (0.055 + apex * 0.035);
      break;
  }

  const foot = -hip * 0.52 - knee * 0.22 - ankle * 0.64;
  setLegPose(leg, {
    hip: hip * motionScale,
    knee: knee * motionScale,
    ankle: ankle * motionScale,
    foot: foot * motionScale
  });
}

function setAppendages(rig, gait, profile, stridePhase, airborne, running, verticalVelocity, motionScale) {
  const cycle = stridePhase * TAU;
  for (let index = 0; index < (rig.appendages || []).length; index++) {
    const appendage = rig.appendages[index];
    const rest = appendage.rest || {};
    const kind = String(appendage.kind || "arm").toLowerCase();
    const side = sideSign(appendage.side, index);
    let shoulder = 0;
    let elbow = 0;

    if (gait === "eagle" && kind.includes("wing")) {
      const vertical = clamp(verticalVelocity / 650, -1, 1);
      const glide = 1 - Math.abs(vertical);
      const sourceFolded = kind.includes("folded");
      const fold = sourceFolded
        ? airborne ? -side * 0.94 : 0
        : airborne ? side * 0.06 : side * 1.04;
      const flap = airborne
        ? -side * Math.sin(cycle * 2 + index * Math.PI) * profile.appendageSwing * (0.3 + Math.max(0, vertical) * 0.7)
        : -side * Math.sin(cycle + index * Math.PI) * profile.appendageSwing * 0.08;
      writeRotation(appendage.shoulder, fold * motionScale, "y");
      writeRotation(appendage.shoulder, flap * motionScale, "z");
      writeRotation(appendage.elbow, (airborne ? 0.06 + glide * 0.09 : 0.02) * motionScale, "z");
      continue;
    }

    if (gait === "penguin" || kind.includes("wing") || kind.includes("flipper")) {
      const spread = airborne ? 0.36 : 0.07;
      shoulder = -side * spread;
      if (running && !airborne) shoulder += -side * Math.sin(cycle + index * Math.PI) * profile.appendageSwing * 0.22;
      elbow = airborne ? 0.035 : 0;
    } else if (gait === "biped") {
      // T. rex arms remain guarded against the chest rather than pumping like a person.
      shoulder = airborne ? -0.035 : running ? Math.sin(cycle + index * Math.PI) * profile.appendageSwing : 0;
      elbow = airborne ? 0.055 : running ? 0.025 : 0;
    } else if (airborne) {
      shoulder = -0.12;
      elbow = 0.15;
    } else if (running) {
      const phase = finite(appendage.phase, index * Math.PI);
      shoulder = -Math.sin(cycle + phase) * profile.appendageSwing;
      elbow = 0.04 + Math.max(0, Math.cos(cycle + phase)) * 0.08;
    }

    const axis = appendage.axis || "z";
    const direction = axisDirection(axis);
    writeRotation(appendage.shoulder, angle(rest.shoulder) + shoulder * direction * motionScale, axis);
    writeRotation(appendage.elbow, angle(rest.elbow) + elbow * direction * motionScale, axis);
  }
}

function rootMotion(gait, profile, stridePhase, airborne, verticalVelocity, running, motionScale) {
  const cycle = stridePhase * TAU;
  if (airborne) {
    const trend = clamp(verticalVelocity / 650, -1, 1);
    return {
      bob: 0,
      pitch: profile.posturePitch + trend * profile.airPitch * motionScale,
      roll: (gait === "penguin" ? Math.sin(cycle) * profile.roll * 0.22 : 0) * motionScale
    };
  }
  if (!running) return { bob: 0, pitch: profile.posturePitch, roll: 0 };

  let beats = 1;
  if (["biped", "penguin", "eagle"].includes(gait)) beats = 2;
  if (["elephant", "bear"].includes(gait)) beats = 4;
  const pulse = (1 - Math.cos(cycle * beats)) * 0.5;
  let bob = profile.bob * pulse;
  let pitch = Math.sin(cycle) * profile.pitch;
  let roll = Math.sin(cycle) * profile.roll;

  if (gait === "rabbit") {
    bob = profile.bob * smoothstep(Math.max(0, Math.sin(cycle)));
    pitch = Math.sin(cycle) * profile.pitch;
    roll *= 0.28;
  } else if (gait === "feline" || gait === "canid" || gait === "primate") {
    pitch = Math.sin(cycle) * profile.pitch;
    roll *= 0.65;
  } else if (gait === "elephant") {
    pitch = Math.sin(cycle * 2) * profile.pitch;
    roll = Math.sin(cycle) * profile.roll;
  } else if (gait === "giraffe") {
    pitch = Math.sin(cycle) * profile.pitch;
    roll *= 0.65;
  } else if (gait === "bear") {
    pitch = Math.sin(cycle * 2) * profile.pitch * 0.45;
    roll = Math.sin(cycle) * profile.roll;
  } else if (gait === "penguin") {
    bob = profile.bob * Math.abs(Math.sin(cycle));
    pitch = Math.sin(cycle * 2) * profile.pitch;
    roll = Math.sin(cycle) * profile.roll;
  } else if (gait === "eagle") {
    bob = profile.bob * Math.abs(Math.sin(cycle));
    pitch = Math.sin(cycle * 2) * profile.pitch;
    roll *= 0.35;
  } else if (gait === "biped") {
    // A running T. rex lowers into its stride; it never rocks upright like a
    // human runner. The cosine form is zero at the idle/run seam.
    pitch = -profile.pitch * (1 - Math.cos(cycle));
    roll *= 0.7;
  }
  return {
    bob: bob * motionScale,
    pitch: profile.posturePitch + pitch * motionScale,
    roll: roll * motionScale
  };
}

function setBodyJoints(rig, gait, profile, stridePhase, airborne, verticalVelocity, running, motionScale) {
  const bodyJoints = rig.bodyJoints || [];
  const cycle = stridePhase * TAU;
  let wave = 0;
  if (airborne) wave = -clamp(verticalVelocity / 650, -1, 1) * 0.55;
  else if (running) wave = Math.sin(cycle - 0.35);

  for (const entry of bodyJoints) {
    const role = String(entry.role || "spine").toLowerCase();
    let influence = 1;
    if (role.includes("pelvis")) influence = -0.62;
    else if (role.includes("chest") || role.includes("shoulder")) influence = 0.42;
    if (["elephant", "penguin", "eagle", "biped"].includes(gait)) influence *= 0.45;
    const value = running || airborne ? wave * profile.bodyFlex * influence * motionScale : 0;
    writeRotation(entry.joint, angle(entry.rest) + value, entry.axis || "x");
  }
}

function setTailAndHead(rig, gait, profile, frame, stridePhase, pose, motionScale) {
  const cycle = stridePhase * TAU;
  const active = frame.running || frame.airborne;
  // Distance remains monotonic across takeoff, so the tail never changes its
  // oscillator clock merely because the feet left the ground.
  const locomotionTime = active ? cycle : 0;
  const verticalDirection = axisDirection(rig.tailJoints?.[0]?.axis || "z");
  const stiffness = clamp(finite(profile.tailStiffness, 0.5), 0, 1);
  const tailFreedom = clamp(1 - stiffness * 0.82, 0.12, 1);

  for (let index = 0; index < (rig.tailJoints || []).length; index++) {
    const part = rig.tailJoints[index];
    const delay = index * 0.48 * (0.4 + tailFreedom * 0.6);
    const runningWave = Math.sin(locomotionTime - delay);
    const lift = profile.tailLift * Math.exp(-index * 0.38);
    const vertical = lift + runningWave * profile.tailBounce * tailFreedom * motionScale;
    writeRotation(
      part.joint,
      finite(part.restZ) + vertical * verticalDirection,
      part.axis || "z"
    );
    // Yaw supplies the balancing side-to-side sweep missing from a one-axis tail.
    if (part.joint?.rotation && (part.axis || "z") === "x") {
      const lateral = Math.sin(locomotionTime - delay - 0.3) * profile.tailSwing * tailFreedom;
      writeRotation(part.joint, finite(part.restY) + lateral * motionScale, "y");
    }
  }

  if (rig.headPivot) {
    const runningNod = active ? Math.sin(cycle * (gait === "elephant" ? 2 : 1)) * profile.headNod : 0;
    // Counter a little body pitch to keep the gaze steady without freezing it.
    const downAngle = profile.headBias + runningNod + pose.pitch * 0.42;
    const axis = rig.headAxis || "z";
    writeRotation(rig.headPivot, finite(rig.headRestZ) + downAngle * axisDirection(axis) * motionScale, axis);
  }
}

/**
 * Writes a complete local-space pose from the rig's rest angles. Leg `phase`
 * values remain radians, interpreted as the instant of foot contact. All
 * writes are absolute, so pausing or switching species cannot accumulate pose
 * drift. Returned body motion is in the runner scene's existing units.
 */
export function animateAnimalGait(rig, frame = {}) {
  if (!rig) return { bob: 0, pitch: 0, roll: 0 };
  const gait = resolveGait(rig);
  const profile = profileFor(rig, gait);
  const distance = finite(frame.distance);
  const strideLength = resolveStrideMetrics(rig, gait, profile).strideLength;
  const stridePhase = mod1(distance / strideLength);
  const airborne = Boolean(frame.airborne);
  const running = Boolean(frame.running) && !airborne;
  const motionScale = frame.reducedMotion ? 0.28 : 1;
  const verticalVelocity = finite(frame.verticalVelocity);

  for (let index = 0; index < (rig.legs || []).length; index++) {
    const leg = rig.legs[index];
    if (airborne) airborneLegPose(gait, profile, leg, index, verticalVelocity, motionScale);
    else if (running) groundedLegPose(gait, profile, leg, stridePhase, index, motionScale);
    else setLegPose(leg);
  }

  setAppendages(rig, gait, profile, stridePhase, airborne, running, verticalVelocity, motionScale);
  setBodyJoints(rig, gait, profile, stridePhase, airborne, verticalVelocity, running, motionScale);
  const pose = rootMotion(gait, profile, stridePhase, airborne, verticalVelocity, running, motionScale);
  setTailAndHead(rig, gait, profile, { ...frame, airborne, running }, stridePhase, pose, motionScale);
  return pose;
}
