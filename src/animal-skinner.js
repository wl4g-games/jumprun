import * as THREE from "./vendor/three.module.min.js";
import { animalById } from "./animal-catalog.js";
import { animalAsset } from "./animal-assets.js";

const UP = new THREE.Vector3(0, 1, 0);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function floatAttribute(attribute, itemSize = attribute.itemSize) {
  const values = new Float32Array(attribute.count * itemSize);
  const getters = ["getX", "getY", "getZ", "getW"];
  for (let index = 0; index < attribute.count; index++) {
    for (let component = 0; component < itemSize; component++) {
      values[index * itemSize + component] = attribute[getters[component]](index);
    }
  }
  return new THREE.BufferAttribute(values, itemSize);
}

function bakeGeometry(source, matrix) {
  const geometry = source.clone();
  geometry.setAttribute("position", floatAttribute(source.attributes.position, 3));
  if (source.attributes.normal) geometry.setAttribute("normal", floatAttribute(source.attributes.normal, 3));
  if (source.attributes.tangent) geometry.setAttribute("tangent", floatAttribute(source.attributes.tangent, 4));
  geometry.applyMatrix4(matrix);
  // The source studies intentionally ship with visibly faceted normals. The
  // silhouette is useful, but recomputing shared-vertex normals gives the
  // softer skin/fur shading expected from an animated character rather than a
  // carved low-poly figurine.
  geometry.deleteAttribute("normal");
  geometry.deleteAttribute("tangent");
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function tuneMaterial(source, species, tint, textureCache) {
  const material = source.clone();
  for (const [key, value] of Object.entries(source)) {
    if (!value?.isTexture) continue;
    if (!textureCache.has(value)) {
      const texture = value.clone();
      texture.needsUpdate = true;
      textureCache.set(value, texture);
    }
    material[key] = textureCache.get(value);
  }
  const name = String(material.name || source.name || "").toLowerCase();
  material.metalness = 0;
  if (Number.isFinite(material.roughness)) {
    const glossyDetail = /eye|nose|claw|hoof|gloss|ivory/.test(name);
    material.roughness = glossyDetail
      ? clamp(material.roughness, 0.28, 0.72)
      : clamp(material.roughness, 0.76, 1);
  }
  if ("envMapIntensity" in material) material.envMapIntensity = /eye|gloss/.test(name) ? 0.72 : 0.46;
  if (species === "fox" && tint && /furwhite|fur|white/.test(name) && material.color) {
    material.color.set(tint);
  }
  material.needsUpdate = true;
  return material;
}

function gatherSourceMeshes(scene, species, tint) {
  scene.updateMatrixWorld(true);
  const sceneInverse = scene.matrixWorld.clone().invert();
  const materialCache = new Map();
  const textureCache = new Map();
  const records = [];
  scene.traverse((node) => {
    if (!node.isMesh || !node.geometry?.attributes?.position) return;
    const matrix = sceneInverse.clone().multiply(node.matrixWorld);
    const geometry = bakeGeometry(node.geometry, matrix);
    const sourceMaterials = Array.isArray(node.material) ? node.material : [node.material];
    const materials = sourceMaterials.map((source) => {
      if (!materialCache.has(source)) materialCache.set(source, tuneMaterial(source, species, tint, textureCache));
      return materialCache.get(source);
    });
    records.push({
      geometry,
      material: Array.isArray(node.material) ? materials : materials[0],
      name: node.name,
      vertexCount: geometry.attributes.position.count,
      materialNames: materials.map((material) => String(material.name || "").toLowerCase())
    });
  });
  return records;
}

function boundsFromRecords(records) {
  const bounds = new THREE.Box3();
  bounds.makeEmpty();
  for (const { geometry } of records) bounds.union(geometry.boundingBox);
  return bounds;
}

function geometryPoints(records, stride = 1) {
  const points = [];
  for (const { geometry } of records) {
    const position = geometry.attributes.position;
    const step = Math.max(1, stride, Math.floor(position.count / 12_000));
    for (let index = 0; index < position.count; index += step) {
      points.push(new THREE.Vector3(position.getX(index), position.getY(index), position.getZ(index)));
    }
  }
  return points;
}

function initialLegSeeds(bounds, legCount) {
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const left = center.x - size.x * 0.27;
  const right = center.x + size.x * 0.27;
  if (legCount === 2) return [
    new THREE.Vector2(left, center.z + size.z * 0.08),
    new THREE.Vector2(right, center.z + size.z * 0.08)
  ];
  const hind = bounds.min.z + size.z * 0.37;
  const fore = bounds.min.z + size.z * 0.69;
  return [
    new THREE.Vector2(left, hind),
    new THREE.Vector2(right, hind),
    new THREE.Vector2(left, fore),
    new THREE.Vector2(right, fore)
  ];
}

/**
 * Finds planted feet from low vertices while retaining anatomical seed order.
 * The stable order is important: an airborne paw must not swap bones between
 * model loads merely because another foot has a few more vertices.
 */
export function inferLegAnchors(points, bounds, legCount, footBand = 0.1) {
  const size = bounds.getSize(new THREE.Vector3());
  const seeds = initialLegSeeds(bounds, legCount);
  const lowCeiling = bounds.min.y + size.y * clamp(footBand, 0.05, 0.17);
  const candidates = points.filter((point) => (
    point.y <= lowCeiling
    && point.z >= bounds.min.z + size.z * 0.12
    && point.z <= bounds.max.z - size.z * 0.08
  ));
  let centers = seeds.map((seed) => seed.clone());
  if (candidates.length < legCount * 8) return centers;

  for (let iteration = 0; iteration < 12; iteration++) {
    const sums = centers.map(() => ({ x: 0, z: 0, count: 0 }));
    for (const point of candidates) {
      let winner = 0;
      let best = Infinity;
      for (let index = 0; index < centers.length; index++) {
        const center = centers[index];
        const dx = (point.x - center.x) / Math.max(size.x, 1e-4);
        const dz = (point.z - center.y) / Math.max(size.z, 1e-4);
        const distance = dx * dx + dz * dz;
        if (distance < best) {
          best = distance;
          winner = index;
        }
      }
      sums[winner].x += point.x;
      sums[winner].z += point.z;
      sums[winner].count++;
    }
    centers = centers.map((center, index) => {
      const sum = sums[index];
      if (sum.count < 4) return center;
      const measured = new THREE.Vector2(sum.x / sum.count, sum.z / sum.count);
      // Static source poses can have a raised foot or a low tail. Blending the
      // measured cluster with its anatomical seed avoids collapsing two legs.
      return measured.lerp(seeds[index], 0.22);
    });
  }
  return centers;
}

function addBone(parent, name, position) {
  const bone = new THREE.Bone();
  bone.name = name;
  bone.position.copy(position);
  parent.add(bone);
  return bone;
}

function makeSkeleton(species, asset, bounds, anchors) {
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const floor = bounds.min.y;
  const hipY = floor + size.y * asset.rig.hipHeight;
  const rootBone = new THREE.Bone();
  rootBone.name = `${species}-body`;
  const bones = [rootBone];
  const legs = anchors.map((anchor, index) => {
    const fore = asset.rig.legs === 4 && index >= 2;
    const side = anchor.x <= center.x ? "near" : "far";
    const hip = addBone(rootBone, `${side}-${fore ? "fore" : "hind"}-hip`, new THREE.Vector3(anchor.x, hipY, anchor.y));
    const legLength = Math.max(size.y * 0.12, hipY - floor);
    const upperLength = legLength * (fore ? 0.48 : 0.45);
    const lowerLength = legLength * (fore ? 0.36 : 0.38);
    const ankleLength = Math.max(legLength - upperLength - lowerLength, legLength * 0.12);
    const knee = addBone(hip, `${side}-${fore ? "fore" : "hind"}-knee`, new THREE.Vector3(0, -upperLength, 0));
    const ankle = addBone(knee, `${side}-${fore ? "fore" : "hind"}-ankle`, new THREE.Vector3(0, -lowerLength, 0));
    const foot = addBone(ankle, `${side}-${fore ? "fore" : "hind"}-foot`, new THREE.Vector3(0, -ankleLength, 0));
    const indices = { hip: bones.push(hip) - 1, knee: bones.push(knee) - 1, ankle: bones.push(ankle) - 1, foot: bones.push(foot) - 1 };
    return {
      id: `${side}-${fore ? "fore" : "hind"}`,
      role: fore ? "fore" : "hind",
      side,
      hip,
      knee,
      ankle,
      foot,
      indices,
      anchor,
      axis: "x",
      bend: fore ? 1 : -1,
      upperLength,
      lowerLength,
      rest: { hip: 0, knee: 0, ankle: 0, foot: 0 }
    };
  });

  const headStart = bounds.min.z + size.z * asset.rig.headStart;
  const headPointsY = floor + size.y * (species === "giraffe" ? 0.66 : 0.58);
  const head = addBone(rootBone, `${species}-head`, new THREE.Vector3(center.x, headPointsY, headStart));
  const headIndex = bones.push(head) - 1;
  const scoreAnchor = new THREE.Object3D();
  scoreAnchor.name = "score-anchor";
  scoreAnchor.position.set(0, size.y * 0.31, size.z * 0.1);
  head.add(scoreAnchor);

  const tailEnd = bounds.min.z + size.z * asset.rig.tailEnd;
  const tailBaseY = floor + size.y * (species === "trex" ? 0.55 : 0.48);
  const tailLength = Math.max(size.z * 0.08, tailEnd - bounds.min.z);
  const tailJoints = [];
  const tailIndices = [];
  let tailParent = rootBone;
  for (let index = 0; index < 3; index++) {
    const position = index === 0
      ? new THREE.Vector3(center.x, tailBaseY, tailEnd)
      : new THREE.Vector3(0, 0, -tailLength / 3);
    const bone = addBone(tailParent, `${species}-tail-${index + 1}`, position);
    const boneIndex = bones.push(bone) - 1;
    tailIndices.push(boneIndex);
    tailJoints.push({ joint: bone, restZ: 0, axis: "x" });
    tailParent = bone;
  }

  const appendages = [];
  const appendageBones = [];
  if (species === "trex" || species === "penguin") {
    for (const [index, sign] of [-1, 1].entries()) {
      const side = sign < 0 ? "near" : "far";
      const shoulder = addBone(rootBone, `${side}-${species === "penguin" ? "wing" : "arm"}`, new THREE.Vector3(
        center.x + sign * size.x * (species === "penguin" ? 0.22 : 0.18),
        floor + size.y * (species === "penguin" ? 0.59 : 0.57),
        bounds.min.z + size.z * (species === "penguin" ? 0.52 : 0.7)
      ));
      const elbow = addBone(shoulder, `${shoulder.name}-tip`, new THREE.Vector3(sign * size.x * 0.22, -size.y * 0.16, 0));
      const shoulderIndex = bones.push(shoulder) - 1;
      const elbowIndex = bones.push(elbow) - 1;
      appendages.push({
        id: shoulder.name,
        side,
        shoulder,
        elbow,
        phase: index * Math.PI,
        kind: species === "penguin" ? "wing" : "arm",
        axis: species === "penguin" ? "z" : "x",
        rest: { shoulder: 0, elbow: 0 }
      });
      appendageBones.push({ shoulderIndex, elbowIndex, sign });
    }
  }

  return {
    bones,
    rootBone,
    legs,
    head,
    headIndex,
    headStart,
    tailEnd,
    tailIndices,
    tailJoints,
    appendages,
    appendageBones,
    scoreAnchor,
    floor,
    hipY,
    size,
    center
  };
}

function nearestLeg(point, skeletonData) {
  const { legs, size } = skeletonData;
  let winner = null;
  let best = Infinity;
  for (const leg of legs) {
    const dx = (point.x - leg.anchor.x) / Math.max(size.x * 0.38, 1e-4);
    const dz = (point.z - leg.anchor.y) / Math.max(size.z * 0.18, 1e-4);
    const distance = dx * dx + dz * dz;
    if (distance < best) {
      best = distance;
      winner = leg;
    }
  }
  return best <= 1.5 ? winner : null;
}

function setInfluences(indices, weights, vertex, influences) {
  influences.sort((a, b) => b[1] - a[1]);
  const total = influences.reduce((sum, item) => sum + item[1], 0) || 1;
  for (let slot = 0; slot < 4; slot++) {
    const influence = influences[slot] || [0, 0];
    indices[vertex * 4 + slot] = influence[0];
    weights[vertex * 4 + slot] = influence[1] / total;
  }
}

function appendageInfluence(point, species, data) {
  if (!data.appendageBones.length) return null;
  const { size, center, floor } = data;
  const side = point.x <= center.x ? data.appendageBones[0] : data.appendageBones[1];
  if (species === "penguin") {
    const wing = Math.abs(point.x - center.x) > size.x * 0.27
      && point.y > floor + size.y * 0.27
      && point.y < floor + size.y * 0.83;
    return wing ? side : null;
  }
  const arm = point.z > data.headStart - size.z * 0.16
    && point.z < data.headStart + size.z * 0.08
    && point.y > floor + size.y * 0.38
    && point.y < floor + size.y * 0.73
    && Math.abs(point.x - center.x) > size.x * 0.08;
  return arm ? side : null;
}

function addSkinAttributes(geometry, species, data) {
  const position = geometry.attributes.position;
  const indices = new Uint16Array(position.count * 4);
  const weights = new Float32Array(position.count * 4);
  const point = new THREE.Vector3();
  const { floor, hipY, size, headStart, tailEnd, headIndex, tailIndices } = data;
  const legLength = Math.max(hipY - floor, 1e-4);

  for (let vertex = 0; vertex < position.count; vertex++) {
    point.fromBufferAttribute(position, vertex);
    let influences = [[0, 1]];

    if (point.z <= tailEnd && point.y > floor + size.y * 0.2) {
      const tailT = clamp((tailEnd - point.z) / Math.max(tailEnd - (data.center.z - size.z * 0.5), 1e-4), 0, 0.999);
      const scaled = tailT * tailIndices.length;
      const part = Math.min(tailIndices.length - 1, Math.floor(scaled));
      const mix = scaled - part;
      influences = [[tailIndices[part], 1 - mix]];
      if (part + 1 < tailIndices.length) influences.push([tailIndices[part + 1], mix]);
    } else if (point.z >= headStart && point.y > floor + size.y * 0.23) {
      const blend = clamp((point.z - headStart) / Math.max(size.z * 0.1, 1e-4), 0, 1);
      influences = [[0, 1 - blend], [headIndex, blend]];
    } else {
      const appendage = appendageInfluence(point, species, data);
      if (appendage) {
        const reach = clamp(Math.abs(point.x - data.center.x) / Math.max(size.x * 0.5, 1e-4), 0, 1);
        influences = [[appendage.shoulderIndex, 1 - reach * 0.5], [appendage.elbowIndex, reach * 0.5]];
      } else if (point.y <= hipY + size.y * 0.035) {
        const leg = nearestLeg(point, data);
        if (leg) {
          const t = clamp((hipY - point.y) / legLength, 0, 1);
          if (t < 0.18) {
            const blend = t / 0.18;
            influences = [[0, 1 - blend], [leg.indices.hip, blend]];
          } else if (t < 0.48) {
            const blend = (t - 0.18) / 0.3;
            influences = [[leg.indices.hip, 1 - blend], [leg.indices.knee, blend]];
          } else if (t < 0.82) {
            const blend = (t - 0.48) / 0.34;
            influences = [[leg.indices.knee, 1 - blend], [leg.indices.ankle, blend]];
          } else {
            const blend = (t - 0.82) / 0.18;
            influences = [[leg.indices.ankle, 1 - blend], [leg.indices.foot, blend]];
          }
        }
      }
    }
    setInfluences(indices, weights, vertex, influences);
  }
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(indices, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weights, 4));
}

/**
 * Converts a static, real-world PBR animal mesh into a small shared skeleton.
 * This keeps the detailed source silhouette and textures while providing
 * species-aware hip/knee/ankle deformation for running and jumping.
 */
export function skinAnimalScene(sourceScene, id) {
  const animal = animalById(id);
  const asset = animalAsset(animal.id);
  const records = gatherSourceMeshes(sourceScene, animal.id, asset.tint);
  if (!records.length) throw new Error(`Animal asset ${animal.id} has no renderable mesh`);
  const bounds = boundsFromRecords(records);
  const size = bounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(size.y) || size.y <= 0) throw new Error(`Animal asset ${animal.id} has invalid bounds`);
  const points = geometryPoints(records);
  const anchors = inferLegAnchors(points, bounds, asset.rig.legs, asset.rig.footBand);
  const data = makeSkeleton(animal.id, asset, bounds, anchors);
  const space = new THREE.Group();
  space.name = `${animal.id}-skeleton-space`;
  space.add(data.rootBone);
  space.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(data.bones);
  const skinnedMeshes = [];

  for (const record of records) {
    addSkinAttributes(record.geometry, animal.id, data);
    const mesh = new THREE.SkinnedMesh(record.geometry, record.material);
    mesh.name = record.name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.userData.vertexCount = record.vertexCount;
    mesh.userData.materialNames = record.materialNames;
    space.add(mesh);
    mesh.bind(skeleton);
    skinnedMeshes.push(mesh);
  }

  const model = new THREE.Group();
  model.name = `${animal.id}-realistic-model`;
  space.position.set(-data.center.x, -bounds.min.y, -data.center.z);
  model.add(space);
  model.rotation.y = asset.yaw;
  const normalizedScale = asset.targetHeight / size.y;
  model.scale.setScalar(normalizedScale);

  const root = new THREE.Group();
  root.name = `runner-${animal.id}`;
  root.userData.species = animal.id;
  root.userData.realistic = true;
  root.userData.visualSize = {
    x: size.z * normalizedScale,
    y: size.y * normalizedScale,
    z: size.x * normalizedScale
  };
  root.add(model);

  const rig = {
    species: animal.id,
    gait: asset.gait,
    realistic: true,
    legs: data.legs,
    appendages: data.appendages,
    tailJoints: data.tailJoints,
    headPivot: data.head,
    headRestZ: 0,
    headAxis: "x",
    scoreAnchor: data.scoreAnchor,
    torso: data.rootBone
  };
  return { animal, root, model, rig, parts: rig, skinnedMeshes, skeleton };
}
