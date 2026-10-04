const DEGREES = Math.PI / 180;

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function scale(width = 1, height = 1, length = 1) {
  return { width, height, length };
}

function limb(proximalRadius, distalRadius, footScale, stanceWidth = 1) {
  return { proximalRadius, distalRadius, footScale, stanceWidth };
}

/**
 * Anatomical corrections for the compact source studies.
 *
 * - `*At`, heights and `centerOfMass` are normalized to the unscaled model
 *   bounds. The longitudinal axis runs from tail (0) to head (1).
 * - scales, masses and radii are multipliers around the detected anatomy.
 * - posture angles are radians; positive torso pitch raises the chest.
 *
 * Keeping these values independent from the mesh and gait implementations
 * makes the same species silhouette available to previews and gameplay.
 */
const PROFILES = {
  trex: {
    body: {
      chestMass: 1.2,
      abdomenMass: 1.12,
      pelvisMass: 1.34,
      depthScale: 1.12,
      shoulderAt: 0.72,
      pelvisAt: 0.43
    },
    limbs: {
      fore: limb(0.82, 0.76, scale(0.86, 0.9, 0.9), 0.78),
      hind: limb(1.52, 1.2, scale(1.22, 1.08, 1.3), 1.1)
    },
    head: { scale: scale(1.48, 1.42, 1.5) },
    tail: { rootRadius: 1.55, midRadius: 1.32, tipRadius: 1.06, rootAt: 0.43, tipLift: 0.11, stiffness: 0.88, straighten: 0.5 },
    posture: {
      torsoPitch: -6 * DEGREES,
      pelvisHeight: 0.55,
      chestHeight: 0.54,
      headPitch: 2 * DEGREES,
      bodyLift: 0.04,
      centerOfMass: 0.46,
      groundClearance: 0.025
    }
  },
  leopard: {
    body: {
      chestMass: 1.16,
      abdomenMass: 0.98,
      pelvisMass: 1.22,
      depthScale: 1.08,
      shoulderAt: 0.71,
      pelvisAt: 0.37
    },
    limbs: {
      fore: limb(1.18, 1.05, scale(1.13, 1.02, 1.16), 1.03),
      hind: limb(1.28, 1.08, scale(1.15, 1.02, 1.2), 1.05)
    },
    head: { scale: scale(1.06, 1.04, 1.08) },
    tail: { rootRadius: 1.42, midRadius: 1.34, tipRadius: 1.18, rootAt: 0.32, tipLift: 0.08, stiffness: 0.5, straighten: 0.16 },
    posture: {
      torsoPitch: -1 * DEGREES,
      pelvisHeight: 0.58,
      chestHeight: 0.6,
      headPitch: -2 * DEGREES,
      bodyLift: 0.035,
      centerOfMass: 0.51,
      groundClearance: 0.018
    }
  },
  rabbit: {
    body: {
      chestMass: 1.02,
      abdomenMass: 1.08,
      pelvisMass: 1.38,
      depthScale: 1.08,
      shoulderAt: 0.7,
      pelvisAt: 0.36
    },
    limbs: {
      fore: limb(1.04, 0.96, scale(1.04, 0.95, 1.28), 0.94),
      hind: limb(1.4, 1.16, scale(1.2, 1.0, 1.48), 1.08)
    },
    head: { scale: scale(1.08, 1.1, 1.05) },
    tail: { rootRadius: 1.45, midRadius: 1.42, tipRadius: 1.32, rootAt: 0.31, tipLift: 0.18, stiffness: 0.67 },
    posture: {
      torsoPitch: -2 * DEGREES,
      pelvisHeight: 0.53,
      chestHeight: 0.57,
      headPitch: -1 * DEGREES,
      centerOfMass: 0.43,
      groundClearance: 0.014
    }
  },
  lion: {
    body: {
      chestMass: 1.38,
      abdomenMass: 0.94,
      pelvisMass: 1.22,
      depthScale: 1.12,
      shoulderAt: 0.7,
      pelvisAt: 0.38
    },
    limbs: {
      fore: limb(1.34, 1.16, scale(1.2, 1.05, 1.22), 1.08),
      hind: limb(1.34, 1.14, scale(1.2, 1.04, 1.25), 1.08)
    },
    head: { scale: scale(1.08, 1.08, 1.08) },
    tail: { rootRadius: 1.25, midRadius: 1.08, tipRadius: 0.98, rootAt: 0.4, tipLift: 0.08, stiffness: 0.58, straighten: 0.08 },
    posture: {
      torsoPitch: -3 * DEGREES,
      pelvisHeight: 0.6,
      chestHeight: 0.65,
      headPitch: -3 * DEGREES,
      bodyLift: 0.05,
      centerOfMass: 0.52,
      groundClearance: 0.019
    }
  },
  elephant: {
    body: {
      chestMass: 1.32,
      abdomenMass: 1.3,
      pelvisMass: 1.26,
      depthScale: 1.2,
      shoulderAt: 0.7,
      pelvisAt: 0.38
    },
    limbs: {
      fore: limb(1.58, 1.5, scale(1.17, 1.04, 1.18), 1.12),
      hind: limb(1.52, 1.46, scale(1.16, 1.04, 1.17), 1.1)
    },
    head: { scale: scale(1.14, 1.13, 1.12) },
    tail: { rootRadius: 1.18, midRadius: 1.06, tipRadius: 1.22, rootAt: 0.31, tipLift: 0.01, stiffness: 0.62 },
    posture: {
      torsoPitch: 0,
      pelvisHeight: 0.58,
      chestHeight: 0.63,
      headPitch: 2 * DEGREES,
      bodyLift: 0.03,
      centerOfMass: 0.53,
      groundClearance: 0.012
    }
  },
  giraffe: {
    body: {
      chestMass: 1.13,
      abdomenMass: 0.96,
      pelvisMass: 1.1,
      depthScale: 1.02,
      shoulderAt: 0.67,
      pelvisAt: 0.37
    },
    limbs: {
      fore: limb(1.08, 1.0, scale(1.12, 1.02, 1.18), 1.03),
      hind: limb(1.12, 1.0, scale(1.13, 1.02, 1.2), 1.04)
    },
    head: { scale: scale(1.04, 1.04, 1.08) },
    tail: { rootRadius: 1.18, midRadius: 1.1, tipRadius: 1.3, rootAt: 0.31, tipLift: 0.04, stiffness: 0.58 },
    posture: {
      torsoPitch: 0,
      pelvisHeight: 0.48,
      chestHeight: 0.53,
      headPitch: -3 * DEGREES,
      centerOfMass: 0.54,
      groundClearance: 0.012
    }
  },
  panda: {
    body: {
      chestMass: 1.32,
      abdomenMass: 1.3,
      pelvisMass: 1.28,
      depthScale: 1.18,
      shoulderAt: 0.68,
      pelvisAt: 0.38
    },
    limbs: {
      fore: limb(1.34, 1.22, scale(1.22, 1.08, 1.22), 1.1),
      hind: limb(1.4, 1.24, scale(1.24, 1.08, 1.26), 1.12)
    },
    head: { scale: scale(1.18, 1.16, 1.12) },
    tail: { rootRadius: 1.3, midRadius: 1.25, tipRadius: 1.18, rootAt: 0.3, tipLift: 0.11, stiffness: 0.72 },
    posture: {
      torsoPitch: -1 * DEGREES,
      pelvisHeight: 0.49,
      chestHeight: 0.53,
      headPitch: 1 * DEGREES,
      centerOfMass: 0.49,
      groundClearance: 0.014
    }
  },
  fox: {
    body: {
      chestMass: 1.08,
      abdomenMass: 0.96,
      pelvisMass: 1.1,
      depthScale: 0.98,
      shoulderAt: 0.7,
      pelvisAt: 0.37
    },
    limbs: {
      fore: limb(1.06, 0.98, scale(1.07, 1, 1.12), 1.0),
      hind: limb(1.1, 1.0, scale(1.08, 1, 1.15), 1.02)
    },
    head: { scale: scale(1.08, 1.06, 1.1) },
    tail: { rootRadius: 1.22, midRadius: 1.34, tipRadius: 1.12, rootAt: 0.32, tipLift: 0.1, stiffness: 0.48, straighten: 0.04 },
    posture: {
      torsoPitch: -1 * DEGREES,
      pelvisHeight: 0.57,
      chestHeight: 0.6,
      headPitch: -2 * DEGREES,
      bodyLift: 0,
      centerOfMass: 0.5,
      groundClearance: 0.016
    }
  },
  monkey: {
    body: {
      chestMass: 1.12,
      abdomenMass: 1.02,
      pelvisMass: 1.1,
      depthScale: 1.04,
      shoulderAt: 0.68,
      pelvisAt: 0.4
    },
    limbs: {
      fore: limb(1.12, 1.04, scale(1.08, 0.98, 1.2), 1.03),
      hind: limb(1.14, 1.06, scale(1.1, 0.98, 1.22), 1.06)
    },
    head: { scale: scale(1.04, 1.04, 1.04) },
    tail: { rootRadius: 1, midRadius: 1, tipRadius: 1, rootAt: 0.3, tipLift: 0, stiffness: 0.7 },
    posture: {
      torsoPitch: -6 * DEGREES,
      upperBodyLean: 0,
      pelvisHeight: 0.55,
      chestHeight: 0.63,
      headPitch: -2 * DEGREES,
      bodyLift: 0.01,
      centerOfMass: 0.48,
      groundClearance: 0.017
    }
  },
  penguin: {
    body: {
      chestMass: 1.2,
      abdomenMass: 1.24,
      pelvisMass: 1.14,
      depthScale: 1.16,
      shoulderAt: 0.66,
      pelvisAt: 0.39
    },
    limbs: {
      fore: limb(0.94, 0.86, scale(1.08, 0.92, 1.12), 1.1),
      hind: limb(1.12, 1.05, scale(1.3, 0.88, 1.42), 1.18)
    },
    head: { scale: scale(1.08, 1.06, 1.06) },
    tail: { rootRadius: 1.12, midRadius: 1.08, tipRadius: 1.02, rootAt: 0.35, tipLift: 0.02, stiffness: 0.84 },
    posture: {
      torsoPitch: 0,
      pelvisHeight: 0.26,
      chestHeight: 0.53,
      headPitch: 0,
      centerOfMass: 0.49,
      groundClearance: 0.008
    }
  },
  tiger: {
    body: {
      chestMass: 1.34,
      abdomenMass: 1.02,
      pelvisMass: 1.3,
      depthScale: 1.12,
      shoulderAt: 0.71,
      pelvisAt: 0.37
    },
    limbs: {
      fore: limb(1.3, 1.14, scale(1.18, 1.04, 1.22), 1.08),
      hind: limb(1.36, 1.16, scale(1.2, 1.04, 1.28), 1.1)
    },
    head: { scale: scale(1.12, 1.1, 1.12) },
    tail: { rootRadius: 1.56, midRadius: 1.4, tipRadius: 1.16, rootAt: 0.33, tipLift: 0.08, stiffness: 0.52, straighten: 0.08 },
    posture: {
      torsoPitch: -2 * DEGREES,
      pelvisHeight: 0.59,
      chestHeight: 0.64,
      headPitch: -2 * DEGREES,
      bodyLift: 0.035,
      centerOfMass: 0.51,
      groundClearance: 0.018
    }
  },
  eagle: {
    body: {
      chestMass: 1.2,
      abdomenMass: 1.02,
      pelvisMass: 1.04,
      depthScale: 1.08,
      shoulderAt: 0.64,
      pelvisAt: 0.38
    },
    limbs: {
      fore: limb(0.96, 0.9, scale(1, 1, 1), 1),
      hind: limb(1.12, 1.02, scale(1.22, 0.94, 1.34), 1.12)
    },
    head: { scale: scale(1.08, 1.08, 1.1) },
    tail: { rootRadius: 1, midRadius: 1, tipRadius: 1, rootAt: 0.3, tipLift: 0, stiffness: 0.82 },
    posture: {
      torsoPitch: -2 * DEGREES,
      pelvisHeight: 0.32,
      chestHeight: 0.6,
      headPitch: -2 * DEGREES,
      bodyLift: 0.08,
      centerOfMass: 0.5,
      groundClearance: 0.018
    }
  },
  boar: {
    body: {
      chestMass: 1.38,
      abdomenMass: 1.34,
      pelvisMass: 1.3,
      depthScale: 1.18,
      shoulderAt: 0.69,
      pelvisAt: 0.39
    },
    limbs: {
      fore: limb(1.3, 1.18, scale(1.16, 1.02, 1.2), 1.08),
      hind: limb(1.26, 1.14, scale(1.16, 1.02, 1.2), 1.08)
    },
    head: { scale: scale(1.18, 1.12, 1.2) },
    tail: { rootRadius: 1.28, midRadius: 1.18, tipRadius: 1.08, rootAt: 0.31, tipLift: 0.08, stiffness: 0.7 },
    posture: {
      torsoPitch: -2 * DEGREES,
      pelvisHeight: 0.51,
      chestHeight: 0.58,
      headPitch: -4 * DEGREES,
      bodyLift: 0.02,
      centerOfMass: 0.53,
      groundClearance: 0.012
    }
  },
  godzilla: {
    body: {
      chestMass: 1.42,
      abdomenMass: 1.24,
      pelvisMass: 1.56,
      depthScale: 1.22,
      shoulderAt: 0.72,
      pelvisAt: 0.43
    },
    limbs: {
      fore: limb(1.02, 0.92, scale(0.94, 0.92, 0.96), 0.86),
      hind: limb(1.68, 1.36, scale(1.34, 1.08, 1.42), 1.15)
    },
    head: { scale: scale(1.4, 1.36, 1.46) },
    tail: { rootRadius: 1.78, midRadius: 1.5, tipRadius: 1.12, rootAt: 0.44, tipLift: 0.16, stiffness: 0.94, straighten: 0.58 },
    posture: {
      torsoPitch: -2 * DEGREES,
      pelvisHeight: 0.57,
      chestHeight: 0.59,
      headPitch: 1 * DEGREES,
      bodyLift: 0.04,
      centerOfMass: 0.45,
      groundClearance: 0.028
    }
  },
  kong: {
    body: {
      chestMass: 1.48,
      abdomenMass: 1.12,
      pelvisMass: 1.28,
      depthScale: 1.2,
      shoulderAt: 0.68,
      pelvisAt: 0.39
    },
    limbs: {
      fore: limb(1.34, 1.18, scale(1.2, 1, 1.34), 1.1),
      hind: limb(1.26, 1.14, scale(1.16, 1, 1.28), 1.1)
    },
    head: { scale: scale(1.12, 1.1, 1.08) },
    tail: { rootRadius: 1, midRadius: 1, tipRadius: 1, rootAt: 0.3, tipLift: 0, stiffness: 0.8 },
    posture: {
      torsoPitch: -7 * DEGREES,
      upperBodyLean: 0,
      pelvisHeight: 0.55,
      chestHeight: 0.66,
      headPitch: -2 * DEGREES,
      bodyLift: 0.01,
      centerOfMass: 0.5,
      groundClearance: 0.018
    }
  },
  scar: {
    body: {
      chestMass: 1.3,
      abdomenMass: 0.94,
      pelvisMass: 1.12,
      depthScale: 1.08,
      shoulderAt: 0.68,
      pelvisAt: 0.4
    },
    limbs: {
      fore: limb(1.2, 1.08, scale(1.15, 0.98, 1.3), 1.05),
      hind: limb(1.1, 1.02, scale(1.1, 0.98, 1.2), 1.04)
    },
    head: { scale: scale(1.06, 1.08, 1.04) },
    tail: { rootRadius: 1, midRadius: 1, tipRadius: 1, rootAt: 0.3, tipLift: 0, stiffness: 0.8 },
    posture: {
      torsoPitch: -8 * DEGREES,
      upperBodyLean: 0,
      pelvisHeight: 0.56,
      chestHeight: 0.65,
      headPitch: -3 * DEGREES,
      bodyLift: 0.012,
      centerOfMass: 0.49,
      groundClearance: 0.018
    }
  }
};

export const ANIMAL_MORPHOLOGIES = deepFreeze(PROFILES);

export function animalMorphology(id) {
  return ANIMAL_MORPHOLOGIES[id] || ANIMAL_MORPHOLOGIES.trex;
}
