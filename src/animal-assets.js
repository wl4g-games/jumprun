const asset = (file, options) => Object.freeze({
  file: `models/animals/${file}.glb`,
  yaw: Math.PI / 2,
  targetHeight: 1.08,
  ...options,
  rig: Object.freeze(options.rig),
  coat: Object.freeze({
    ...options.coat,
    ...(options.coat.materials ? { materials: Object.freeze([...options.coat.materials]) } : {})
  })
});

export const ANIMAL_ASSETS = Object.freeze({
  trex: asset("trex", {
    gait: "biped",
    rig: { legs: 2, hipHeight: 0.47, footBand: 0.09, limbRadius: 0.22, headStart: 0.73, tailEnd: 0.43 },
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
    rig: { legs: 4, hipHeight: 0.48, footBand: 0.1, limbRadius: 0.19, headStart: 0.69, tailEnd: 0.32 },
    coat: { kind: "mane", shells: 8, length: 0.032, wind: 0.82, meshCount: 2, materials: ["liontawny", "manedark"] }
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
    rig: { legs: 4, hipHeight: 0.48, footBand: 0.1, limbRadius: 0.21, headStart: 0.72, tailEnd: 0.36 },
    coat: { kind: "long-fur", shells: 9, length: 0.034, wind: 0.92, materials: ["furwhite"] }
  }),
  monkey: asset("monkey", {
    gait: "primate",
    rig: { legs: 4, hipHeight: 0.5, footBand: 0.11, limbRadius: 0.22, headStart: 0.7, tailEnd: 0.32 },
    coat: { kind: "medium-fur", shells: 5, length: 0.018, wind: 0.58, meshCount: 2, materials: ["dark", "brown"] }
  }),
  penguin: asset("penguin", {
    gait: "penguin",
    rig: { legs: 2, hipHeight: 0.2, footBand: 0.08, limbRadius: 0.24, headStart: 0.68, tailEnd: 0.36 },
    coat: { kind: "feathers", shells: 3, length: 0.006, wind: 0.2, meshCount: 2, materials: ["dark", "cream"] }
  })
});

export function animalAsset(id) {
  return ANIMAL_ASSETS[id] || ANIMAL_ASSETS.trex;
}

export function animalAssetUrl(id, base = globalThis.document?.baseURI || globalThis.location?.href || "http://localhost/") {
  return new URL(animalAsset(id).file, base).href;
}
