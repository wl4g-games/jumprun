import { animalById } from "./animal-catalog.js";
import { animalAsset, animalAssetUrl } from "./animal-assets.js";
import { attachAnimalCoat } from "./animal-coat.js";
import { createAnimalModel, disposeObject3D } from "./animal-model.js";
import { skinAnimalScene } from "./animal-skinner.js";
import { GLTFLoader } from "./vendor/GLTFLoader.js";

const loader = new GLTFLoader();
const sourceLoads = new Map();

function loadSource(url) {
  if (sourceLoads.has(url)) return sourceLoads.get(url);
  const load = loader.loadAsync(url)
    .then(({ scene }) => scene)
    .finally(() => sourceLoads.delete(url));
  sourceLoads.set(url, load);
  return load;
}

function finishInstance(instance, quality) {
  const coatProfile = animalAsset(instance.animal.id).coat;
  const materialNames = new Set(coatProfile.materials || []);
  const selectedCoatMeshes = instance.skinnedMeshes && materialNames.size
    ? instance.skinnedMeshes.filter((mesh) => mesh.userData.materialNames?.some((name) => materialNames.has(name)))
    : null;
  const coatMeshes = selectedCoatMeshes?.length ? selectedCoatMeshes : null;
  const coat = attachAnimalCoat({
    species: instance.animal.id,
    model: instance.model,
    meshes: coatMeshes,
    quality,
    windDirection: instance.rig.realistic ? [0, 0, -1] : [-1, 0, 0]
  });
  return { ...instance, coat };
}

/**
 * Load a locally bundled PBR animal and generate its small runtime skeleton.
 * The procedural model remains a deliberate offline/corrupt-asset fallback so
 * a failed optional visual never prevents the game itself from starting.
 */
export async function loadAnimalModel(id, { quality = "balanced", base } = {}) {
  const animal = animalById(id);
  try {
    const source = await loadSource(animalAssetUrl(animal.id, base));
    return finishInstance(skinAnimalScene(source, animal.id), quality);
  } catch (error) {
    console.warn(`Could not load realistic ${animal.id}; using the lightweight fallback.`, error);
    const fallback = createAnimalModel(animal.id);
    fallback.root.userData.fallback = true;
    return finishInstance(fallback, quality);
  }
}

export function disposeAnimalModel(instance) {
  if (!instance) return;
  instance.coat?.dispose();
  instance.skeleton?.dispose?.();
  disposeObject3D(instance.root);
}
