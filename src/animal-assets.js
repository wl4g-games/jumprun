import { animalMorphology } from "./animal-morphology.js";

const asset = (id, options) => {
  const { source = id, ...settings } = options;
  return Object.freeze({
    file: `models/animals/${source}.glb`,
    yaw: Math.PI / 2,
    targetHeight: 1.08,
    ...settings,
    morphology: animalMorphology(id),
    rig: Object.freeze(settings.rig),
    coat: Object.freeze({
      ...settings.coat,
      ...(settings.coat.materials ? { materials: Object.freeze([...settings.coat.materials]) } : {})
    })
  });
};

export const ANIMAL_ASSETS = Object.freeze({
  trex: asset("trex", {
    gait: "biped",
    // The source mesh is authored with deeply folded knees. A positive local
    // knee rest angle opens that silhouette without baking a species branch
    // into the generic runtime skinner.
    rig: { legs: 2, hipHeight: 0.5, footBand: 0.09, limbRadius: 0.22, headStart: 0.59, tailEnd: 0.43, restKnee: 0.34 },
    coat: { kind: "scales", shells: 0, length: 0, wind: 0 }
  }),
  leopard: asset("leopard", {
    gait: "feline",
    rig: { legs: 4, hipHeight: 0.52, footBand: 0.1, limbRadius: 0.2, headStart: 0.74, tailEnd: 0.3 },
    coat: { kind: "short-fur", shells: 3, length: 0.008, wind: 0.28, materials: ["tawny", "cream"] }
  }),
  rabbit: asset("rabbit", {
    gait: "rabbit",
    rig: { legs: 4, hipHeight: 0.45, footBand: 0.13, limbRadius: 0.23, headStart: 0.7, tailEnd: 0.3 },
    coat: { kind: "medium-fur", shells: 8, length: 0.028, wind: 0.78, materials: ["grey", "cream"] }
  }),
  lion: asset("lion", {
    gait: "feline",
    targetHeight: 1.12,
    rig: { legs: 4, hipHeight: 0.52, footBand: 0.09, limbRadius: 0.22, headStart: 0.73, tailEnd: 0.41 },
    coat: { kind: "mane", shells: 8, length: 0.025, wind: 0.82, meshCount: 2, materials: ["liontawny", "manedark"] }
  }),
  elephant: asset("elephant", {
    gait: "elephant",
    rig: { legs: 4, hipHeight: 0.48, footBand: 0.12, limbRadius: 0.2, headStart: 0.7, tailEnd: 0.3 },
    coat: { kind: "skin", shells: 0, length: 0, wind: 0 }
  }),
  giraffe: asset("giraffe", {
    gait: "giraffe",
    rig: { legs: 4, hipHeight: 0.47, footBand: 0.075, limbRadius: 0.16, headStart: 0.67, tailEnd: 0.31 },
    coat: { kind: "short-fur", shells: 2, length: 0.006, wind: 0.18, meshCount: 2, materials: ["giraffecream", "girafferusset"] }
  }),
  panda: asset("panda", {
    gait: "bear",
    rig: { legs: 4, hipHeight: 0.45, footBand: 0.12, limbRadius: 0.23, headStart: 0.7, tailEnd: 0.3 },
    coat: { kind: "dense-fur", shells: 7, length: 0.024, wind: 0.62, meshCount: 2, materials: ["furwhite", "furblack"] }
  }),
  fox: asset("fox", {
    gait: "canid",
    tint: "#c86838",
    rig: { legs: 4, hipHeight: 0.57, footBand: 0.09, limbRadius: 0.18, headStart: 0.78, tailEnd: 0.38 },
    coat: { kind: "long-fur", shells: 9, length: 0.034, wind: 0.92, materials: ["wolfgrey", "wolfcream"] }
  }),
  monkey: asset("monkey", {
    gait: "primate",
    rig: { legs: 4, hipHeight: 0.55, footBand: 0.1, limbRadius: 0.2, headStart: 0.8, tailEnd: 0, hasTail: false },
    coat: { kind: "medium-fur", shells: 5, length: 0.018, wind: 0.58, meshCount: 2, materials: ["apeblack", "apeskin"] }
  }),
  penguin: asset("penguin", {
    gait: "penguin",
    rig: { legs: 2, hipHeight: 0.2, footBand: 0.08, limbRadius: 0.24, headStart: 0.68, tailEnd: 0.36 },
    coat: { kind: "feathers", shells: 3, length: 0.006, wind: 0.2, meshCount: 2, materials: ["dark", "cream"] }
  }),
  tiger: asset("tiger", {
    gait: "feline",
    targetHeight: 1.12,
    rig: { legs: 4, hipHeight: 0.54, footBand: 0.09, limbRadius: 0.21, headStart: 0.73, tailEnd: 0.4 },
    coat: { kind: "short-fur", shells: 4, length: 0.011, wind: 0.36, meshCount: 3, materials: ["tigerorange", "tigercream", "markdark"] }
  }),
  eagle: asset("eagle", {
    gait: "eagle",
    rig: {
      legs: 2,
      hipHeight: 0.32,
      footBand: 0.12,
      limbRadius: 0.2,
      headStart: 0.67,
      tailEnd: 0.2,
      hasTail: false,
      upright: true,
      appendages: "wings-folded",
      footSeedWidth: 0.065,
      appendageRootWidth: 0.18,
      appendageReach: 0.36
    },
    coat: { kind: "feathers", shells: 4, length: 0.009, wind: 0.62, meshCount: 2, materials: ["rust", "snow"] }
  }),
  boar: asset("boar", {
    gait: "bear",
    tint: "#59483a",
    tintStrength: 0.72,
    rig: { legs: 4, hipHeight: 0.49, footBand: 0.12, limbRadius: 0.23, headStart: 0.68, tailEnd: 0.28 },
    coat: { kind: "bristles", shells: 6, length: 0.024, wind: 0.7, meshCount: 2, materials: ["warthoggrey", "manebrown"] }
  }),
  godzilla: asset("godzilla", {
    source: "trex",
    gait: "biped",
    tint: "#263f3d",
    tintStrength: 0.72,
    targetHeight: 1.18,
    accents: "dorsal-plates",
    rig: { legs: 2, hipHeight: 0.52, footBand: 0.09, limbRadius: 0.24, headStart: 0.57, tailEnd: 0.46, appendages: "arms", restKnee: 0.36 },
    coat: { kind: "scales", shells: 0, length: 0, wind: 0 }
  }),
  kong: asset("kong", {
    gait: "primate",
    targetHeight: 1.14,
    rig: { legs: 4, hipHeight: 0.55, footBand: 0.1, limbRadius: 0.23, headStart: 0.8, tailEnd: 0, hasTail: false },
    coat: { kind: "dense-fur", shells: 7, length: 0.026, wind: 0.72, meshCount: 3, materials: ["apeblack", "apesilver"] }
  }),
  scar: asset("scar", {
    source: "monkey",
    gait: "primate",
    tint: "#8f3f27",
    tintStrength: 0.64,
    accents: "eye-scar",
    targetHeight: 1.15,
    rig: { legs: 4, hipHeight: 0.55, footBand: 0.1, limbRadius: 0.2, headStart: 0.8, tailEnd: 0, hasTail: false },
    coat: { kind: "long-fur", shells: 8, length: 0.03, wind: 0.9, meshCount: 2, materials: ["apeblack", "apeskin"] }
  })
});

export function animalAsset(id) {
  return ANIMAL_ASSETS[id] || ANIMAL_ASSETS.trex;
}

export function animalAssetUrl(id, base = globalThis.document?.baseURI || globalThis.location?.href || "http://localhost/") {
  return new URL(animalAsset(id).file, base).href;
}
