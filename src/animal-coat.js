import * as THREE from "./vendor/three.module.min.js";
import { ANIMAL_ASSETS, animalAsset } from "./animal-assets.js";

const QUALITY_FACTORS = Object.freeze({ high: 1, balanced: 0.75, low: 0 });
const HARD_SURFACE_PATTERN = /(?:eye|iris|pupil|nose|nostril|tooth|teeth|tusk|ivory|claw|hoof|horn|beak|mouth|tongue|skin|gloss|orange)/i;
const SHADER_REVISION = "animal-coat-v1";

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(min, max, value) {
  if (value <= min) return 0;
  if (value >= max) return 1;
  const unit = (value - min) / (max - min);
  return unit * unit * (3 - 2 * unit);
}

function speciesSeed(species) {
  let hash = 2166136261;
  for (const character of String(species)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

/**
 * Resolve the immutable asset coat description into render-time values. Keeping
 * this pure makes quality selection testable without a WebGL context.
 */
export function resolveAnimalCoat(species, quality = "balanced") {
  const speciesId = Object.hasOwn(ANIMAL_ASSETS, species) ? species : "trex";
  const source = animalAsset(speciesId).coat;
  const tier = Object.hasOwn(QUALITY_FACTORS, quality) ? quality : "balanced";
  const maximumShells = Math.max(0, Math.trunc(finite(source.shells)));
  const shellCount = maximumShells === 0
    ? 0
    : Math.max(0, Math.ceil(maximumShells * QUALITY_FACTORS[tier]));
  return Object.freeze({
    species: speciesId,
    kind: source.kind,
    quality: tier,
    maximumShells,
    shellCount,
    length: Math.max(0, finite(source.length)),
    wind: clamp(finite(source.wind), 0, 1),
    meshCount: Math.max(1, Math.trunc(finite(source.meshCount, 3)))
  });
}

/** Return deterministic, root-to-tip layer positions for shell geometry. */
export function coatLayerValues(shellCount) {
  const count = Math.max(0, Math.trunc(finite(shellCount)));
  return Array.from({ length: count }, (_, index) => (index + 1) / count);
}

/**
 * Advance the small CPU-side wind envelope. Paused frames intentionally only
 * consume the absolute timestamp, preventing a catch-up gust after unpausing.
 */
export function stepAnimalCoatMotion(previous = {}, frame = {}, windFactor = 1) {
  const elapsed = Number.isFinite(frame.elapsed) ? frame.elapsed : null;
  const lastElapsed = Number.isFinite(previous.lastElapsed) ? previous.lastElapsed : null;
  if (frame.paused) {
    return {
      time: finite(previous.time),
      wind: clamp(finite(previous.wind), 0, 1),
      vertical: clamp(finite(previous.vertical), -0.55, 0.55),
      lastElapsed: elapsed ?? lastElapsed
    };
  }

  const inferredDt = elapsed !== null && lastElapsed !== null ? elapsed - lastElapsed : 0;
  const dt = clamp(finite(frame.dt, inferredDt), 0, 0.05);
  const speed = Math.max(0, finite(frame.speed));
  const targetWind = smoothstep(0, 560, speed) * clamp(finite(windFactor, 1), 0, 1);
  const targetVertical = clamp(-finite(frame.verticalVelocity) / 650, -0.55, 0.55);
  const response = 1 - Math.exp(-8 * dt);
  const verticalResponse = 1 - Math.exp(-10 * dt);
  const wind = finite(previous.wind) + (targetWind - finite(previous.wind)) * response;
  const vertical = finite(previous.vertical) + (targetVertical - finite(previous.vertical)) * verticalResponse;
  return {
    time: finite(previous.time) + dt * (1 + wind * 0.75),
    wind: clamp(wind, 0, 1),
    vertical: clamp(vertical, -0.55, 0.55),
    lastElapsed: elapsed ?? lastElapsed
  };
}

function materialName(material) {
  if (Array.isArray(material)) return material.map((item) => item?.name || "").join(" ");
  return material?.name || "";
}

function canGrowCoat(mesh) {
  return Boolean(
    mesh?.isMesh
    && !mesh.isInstancedMesh
    && !mesh.userData?.animalCoatShell
    && mesh.geometry?.attributes?.position
    && mesh.geometry?.attributes?.normal
  );
}

function automaticMeshes(model, limit) {
  const preferred = [];
  const fallback = [];
  model?.traverse?.((node) => {
    if (!canGrowCoat(node) || node.userData?.coat === false) return;
    const vertices = node.geometry.attributes.position.count;
    const entry = { mesh: node, score: vertices + (node.isSkinnedMesh ? 1e7 : 0) };
    if (node.userData?.coat === true) preferred.push({ ...entry, score: entry.score + 1e8 });
    else if (HARD_SURFACE_PATTERN.test(`${node.name} ${materialName(node.material)}`)) fallback.push(entry);
    else preferred.push(entry);
  });
  const byScore = (left, right) => right.score - left.score;
  preferred.sort(byScore);
  fallback.sort(byScore);
  const pool = preferred.length ? preferred : fallback;
  return pool.slice(0, limit).map(({ mesh }) => mesh);
}

function resolveMeshes(model, meshes, limit) {
  if (typeof meshes === "function") {
    const selected = [];
    model?.traverse?.((node) => {
      if (canGrowCoat(node) && meshes(node)) selected.push(node);
    });
    return selected.slice(0, limit);
  }
  if (meshes) {
    const values = Array.isArray(meshes)
      ? meshes
      : typeof meshes[Symbol.iterator] === "function" ? [...meshes] : [meshes];
    return [...new Set(values)].filter(canGrowCoat).slice(0, limit);
  }
  return automaticMeshes(model, limit);
}

function cloneInstancedGeometry(source, layers, coatLength) {
  const geometry = new THREE.InstancedBufferGeometry().copy(source);
  const values = new Float32Array(coatLayerValues(layers));
  geometry.setAttribute("coatLayer", new THREE.InstancedBufferAttribute(values, 1));
  geometry.instanceCount = layers;

  if (!geometry.boundingBox) geometry.computeBoundingBox();
  if (!geometry.boundingSphere) geometry.computeBoundingSphere();
  geometry.boundingBox?.expandByScalar(coatLength * 2.5);
  if (geometry.boundingSphere) geometry.boundingSphere.radius += coatLength * 2.5;
  return geometry;
}

function dominantColor(material) {
  const color = material?.color?.isColor ? material.color.clone() : new THREE.Color(0xffffff);
  return color.lerp(new THREE.Color(0xffffff), color.getHSL({ h: 0, s: 0, l: 0 }).l < 0.22 ? 0.28 : 0.12);
}

function coatMaterial(source, profile, uniforms) {
  const sourceMaterial = source || {};
  const feathered = profile.kind === "feathers";
  const color = sourceMaterial.color?.isColor ? sourceMaterial.color : new THREE.Color(0xffffff);
  const material = new THREE.MeshPhysicalMaterial({
    name: `${sourceMaterial.name || "surface"}-coat`,
    color,
    map: sourceMaterial.map || null,
    normalMap: sourceMaterial.normalMap || null,
    normalMapType: sourceMaterial.normalMapType ?? THREE.TangentSpaceNormalMap,
    normalScale: sourceMaterial.normalScale?.clone?.() || new THREE.Vector2(1, 1),
    roughnessMap: sourceMaterial.roughnessMap || null,
    alphaMap: sourceMaterial.alphaMap || null,
    vertexColors: sourceMaterial.vertexColors === true,
    roughness: feathered ? 0.74 : 0.9,
    metalness: 0,
    envMapIntensity: finite(sourceMaterial.envMapIntensity, 0.38),
    sheen: feathered ? 0.28 : 0.52,
    sheenColor: dominantColor(sourceMaterial),
    sheenRoughness: feathered ? 0.72 : 0.88,
    specularIntensity: feathered ? 0.34 : 0.2,
    alphaTest: feathered ? 0.28 : 0.34,
    alphaToCoverage: true,
    transparent: false,
    depthWrite: true,
    side: THREE.FrontSide,
    dithering: true
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute float coatLayer;
varying float vCoatLayer;
varying vec3 vCoatPosition;
uniform float uCoatLength;
uniform float uCoatTime;
uniform float uCoatWind;
uniform vec3 uCoatDirection;`
      )
      .replace(
        "#include <skinning_vertex>",
        `#include <skinning_vertex>
vCoatLayer = coatLayer;
vCoatPosition = position;
float coatTip = coatLayer * coatLayer;
float coatWave = sin(uCoatTime * (4.4 + uCoatWind * 2.2)
  + dot(position, vec3(11.7, 7.3, 5.1))) * 0.16;
vec3 coatNormal = normalize(objectNormal);
transformed += coatNormal * (uCoatLength * coatLayer);
transformed += uCoatDirection * (uCoatLength * coatTip * uCoatWind
  * (1.55 + coatWave));`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying float vCoatLayer;
varying vec3 vCoatPosition;
uniform float uCoatDensity;
uniform float uCoatSeed;
uniform vec3 uCoatTint;

float animalCoatHash(vec3 value) {
  value = fract(value * 0.1031);
  value += dot(value, value.yzx + 33.33);
  return fract((value.x + value.y) * value.z);
}`
      )
      .replace(
        "#include <alphatest_fragment>",
        `float coatStrand = animalCoatHash(floor(vCoatPosition * uCoatDensity)
  + vec3(uCoatSeed * 37.0));
float coatCutoff = mix(0.08, 0.73, pow(vCoatLayer, 0.72));
float coatCoverage = smoothstep(coatCutoff - 0.055, coatCutoff + 0.055, coatStrand);
diffuseColor.a *= coatCoverage;
#include <alphatest_fragment>`
      )
      .replace(
        "#include <opaque_fragment>",
        `float coatRim = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 2.4);
outgoingLight += uCoatTint * coatRim * (0.025 + 0.07 * vCoatLayer);
#include <opaque_fragment>`
      );
  };
  material.customProgramCacheKey = () => `${SHADER_REVISION}:${profile.kind}`;
  material.userData.animalCoatUniforms = uniforms;
  return material;
}

function geometryDensity(geometry) {
  if (!geometry.boundingSphere) geometry.computeBoundingSphere();
  return 28 / Math.max(0.01, geometry.boundingSphere?.radius || 1);
}

function createUniforms(source, profile) {
  const tint = dominantColor(Array.isArray(source.material) ? source.material[0] : source.material);
  return {
    uCoatLength: { value: profile.length },
    uCoatTime: { value: 0 },
    uCoatWind: { value: 0 },
    uCoatDirection: { value: new THREE.Vector3(-1, 0, 0) },
    uCoatDensity: { value: geometryDensity(source.geometry) },
    uCoatSeed: { value: speciesSeed(profile.species) },
    uCoatTint: { value: tint }
  };
}

function makeShell(source, profile) {
  source.updateWorldMatrix(true, false);
  const worldScale = source.getWorldScale(new THREE.Vector3());
  const scale = Math.max(1e-4, Math.abs(worldScale.x), Math.abs(worldScale.y), Math.abs(worldScale.z));
  const names = materialName(source.material);
  const regionFactor = profile.kind === "mane" ? (/mane/i.test(names) ? 1.5 : 0.42) : 1;
  const localProfile = { ...profile, length: profile.length * regionFactor / scale };
  const geometry = cloneInstancedGeometry(source.geometry, profile.maximumShells, localProfile.length);
  const uniforms = createUniforms(source, localProfile);
  const originals = Array.isArray(source.material) && source.material.length
    ? source.material
    : [source.material];
  const materials = originals.map((material) => coatMaterial(material, localProfile, uniforms));
  const shellMaterial = Array.isArray(source.material) ? materials : materials[0];
  const shell = source.isSkinnedMesh
    ? new THREE.SkinnedMesh(geometry, shellMaterial)
    : new THREE.Mesh(geometry, shellMaterial);

  shell.name = `${source.name || "animal"}-coat`;
  shell.castShadow = false;
  shell.receiveShadow = source.receiveShadow;
  shell.frustumCulled = source.frustumCulled;
  shell.renderOrder = source.renderOrder + 0.01;
  shell.userData.animalCoatShell = true;
  shell.userData.animalCoatSource = source.name || source.uuid;
  if (source.isSkinnedMesh) {
    shell.bindMode = source.bindMode;
    shell.bindMatrix.copy(source.bindMatrix);
    shell.bindMatrixInverse.copy(source.bindMatrixInverse);
    shell.skeleton = source.skeleton;
  }
  if (source.morphTargetInfluences) shell.morphTargetInfluences = source.morphTargetInfluences;
  if (source.morphTargetDictionary) shell.morphTargetDictionary = source.morphTargetDictionary;
  geometry.instanceCount = profile.shellCount;
  source.add(shell);
  return { source, shell, geometry, materials, uniforms };
}

/**
 * Attach lightweight shell fur to the most significant render meshes under a
 * model. Callers can pass an explicit mesh, mesh array, or predicate when the
 * asset has dedicated coat regions.
 */
export function attachAnimalCoat({
  species,
  model,
  meshes = null,
  quality = "balanced",
  maxMeshes = null,
  windDirection = [-1, 0, 0]
} = {}) {
  if (!model?.isObject3D) throw new TypeError("attachAnimalCoat requires a Three.js Object3D model");
  let profile = resolveAnimalCoat(species, quality);
  const limit = Math.max(1, Math.trunc(finite(maxMeshes, profile.meshCount)));
  const sources = profile.maximumShells > 0 ? resolveMeshes(model, meshes, limit) : [];
  const entries = sources.map((source) => makeShell(source, profile));
  let motion = { time: 0, wind: 0, vertical: 0, lastElapsed: null };
  let disposed = false;
  const baseDirection = new THREE.Vector3(...windDirection);
  baseDirection.y = 0;
  if (baseDirection.lengthSq() < 1e-6) baseDirection.set(-1, 0, 0);
  baseDirection.normalize();
  const direction = baseDirection.clone();

  function setQuality(nextQuality) {
    if (disposed) return profile;
    profile = resolveAnimalCoat(species, nextQuality);
    for (const entry of entries) entry.geometry.instanceCount = profile.shellCount;
    return profile;
  }

  function update(frame = {}) {
    if (disposed) return { ...motion };
    motion = stepAnimalCoatMotion(motion, frame, profile.wind);
    direction.set(baseDirection.x, motion.vertical, baseDirection.z).normalize();
    for (const entry of entries) {
      entry.uniforms.uCoatTime.value = motion.time;
      entry.uniforms.uCoatWind.value = motion.wind;
      entry.uniforms.uCoatDirection.value.copy(direction);
    }
    return { ...motion };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const entry of entries) {
      entry.source.remove(entry.shell);
      entry.geometry.dispose();
      for (const material of entry.materials) material.dispose();
    }
    entries.length = 0;
  }

  return {
    get profile() { return profile; },
    get shells() { return entries.map(({ shell }) => shell); },
    get disposed() { return disposed; },
    update,
    setQuality,
    dispose
  };
}
