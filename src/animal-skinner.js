import * as THREE from "./vendor/three.module.min.js";
import { animalById } from "./animal-catalog.js";
import { animalAsset } from "./animal-assets.js";
import { attachAnimalAccents } from "./animal-accents.js";
import { buildMorphologyTailCenterline, reshapeAnimalGeometry } from "./animal-anatomy.js";

const UP = new THREE.Vector3(0, 1, 0);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mixNumber(start, end, amount) {
  return Number.isFinite(end) ? start + (end - start) * amount : start;
}

function smoothstep(min, max, value) {
  if (max <= min) return value >= max ? 1 : 0;
  const amount = clamp((value - min) / (max - min), 0, 1);
  return amount * amount * (3 - 2 * amount);
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

function tuneMaterial(source, species, tint, tintStrength, textureCache) {
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
  if (species === "fox" && tint && material.color) {
    if (/wolfgrey|furwhite|fur/.test(name)) material.color.set(tint);
  } else if (species === "boar" && tint && material.color) {
    if (/warthoggrey/.test(name)) material.color.set(tint);
    if (/manebrown/.test(name)) material.color.set("#30251f");
  } else if (tint && material.color && !/eye|nose|claw|hoof|tooth|teeth|tusk|ivory|mouth|tongue/.test(name)) {
    material.color.lerp(new THREE.Color(tint), clamp(tintStrength ?? 0.5, 0, 1));
  }
  material.needsUpdate = true;
  return material;
}

function gatherSourceMeshes(scene, species, tint, tintStrength) {
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
      if (!materialCache.has(source)) {
        materialCache.set(source, tuneMaterial(source, species, tint, tintStrength, textureCache));
      }
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

function initialLegSeeds(bounds, legCount, footSeedWidth = 0.27) {
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const width = clamp(footSeedWidth, 0.035, 0.34);
  const left = center.x - size.x * width;
  const right = center.x + size.x * width;
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
export function inferLegAnchors(points, bounds, legCount, footBand = 0.1, footSeedWidth = 0.27) {
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const seeds = initialLegSeeds(bounds, legCount, footSeedWidth);
  const lowCeiling = bounds.min.y + size.y * clamp(footBand, 0.05, 0.17);
  const candidates = points.filter((point) => (
    point.y <= lowCeiling
    && point.z >= bounds.min.z + size.z * 0.12
    && point.z <= bounds.max.z - size.z * 0.08
    && (legCount !== 2 || footSeedWidth >= 0.15 || Math.abs(point.x - center.x) <= size.x * 0.18)
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

function nearestAnchorIndex(point, anchors, size) {
  let winner = 0;
  let best = Infinity;
  for (let index = 0; index < anchors.length; index++) {
    const anchor = anchors[index];
    const dx = (point.x - anchor.x) / Math.max(size.x * 0.38, 1e-4);
    const dz = (point.z - anchor.y) / Math.max(size.z * 0.2, 1e-4);
    const distance = dx * dx + dz * dz;
    if (distance < best) {
      best = distance;
      winner = index;
    }
  }
  return { index: winner, distance: best };
}

function inferJointCenter(points, bounds, anchors, legIndex, targetY, fallback, limits) {
  const size = bounds.getSize(new THREE.Vector3());
  const band = Math.max(size.y * 0.045, 1e-4);
  const xs = [];
  const zs = [];
  for (const point of points) {
    if (Math.abs(point.y - targetY) > band) continue;
    const nearest = nearestAnchorIndex(point, anchors, size);
    if (nearest.index !== legIndex || nearest.distance > 1.35) continue;
    if (Math.abs(point.x - fallback.x) > limits.x * 1.8) continue;
    if (Math.abs(point.z - fallback.z) > limits.z * 1.8) continue;
    xs.push(point.x);
    zs.push(point.z);
  }
  if (xs.length < 4) return new THREE.Vector3(fallback.x, targetY, fallback.z);
  return new THREE.Vector3(
    clamp(median(xs, fallback.x), fallback.x - limits.x, fallback.x + limits.x),
    targetY,
    clamp(median(zs, fallback.z), fallback.z - limits.z, fallback.z + limits.z)
  );
}

function median(values, fallback) {
  if (!values.length) return fallback;
  values.sort((a, b) => a - b);
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) * 0.5;
}

function inferTailAxis(points, bounds, tailEnd) {
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const floor = bounds.min.y;
  const length = Math.max(tailEnd - bounds.min.z, 1e-4);
  const buckets = Array.from({ length: 16 }, () => []);
  for (const point of points) {
    if (point.z > tailEnd || point.y < floor + size.y * 0.12) continue;
    if (Math.abs(point.x - center.x) > size.x * 0.27) continue;
    const t = clamp((tailEnd - point.z) / length, 0, 0.999);
    buckets[Math.floor(t * buckets.length)].push(point.y);
  }
  const centers = [];
  let previous = floor + size.y * 0.47;
  for (const bucket of buckets) {
    previous = median(bucket, previous);
    centers.push(previous);
  }
  for (let index = centers.length - 2; index >= 0; index--) {
    if (!buckets[index].length) centers[index] = centers[index + 1];
  }
  return (value) => {
    const scaled = clamp(value, 0, 1) * (centers.length - 1);
    const index = Math.floor(scaled);
    return mixNumber(centers[index], centers[Math.min(index + 1, centers.length - 1)], scaled - index);
  };
}

function makeSkeleton(species, asset, bounds, anchors, points) {
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const floor = bounds.min.y;
  const morphology = asset.morphology || {};
  const upright = asset.rig.upright === true || species === "penguin";
  const bodyProfile = morphology.body || {};
  const posture = morphology.posture || {};
  const restAngle = (joint) => {
    const value = asset.rig[`rest${joint[0].toUpperCase()}${joint.slice(1)}`];
    return Number.isFinite(value) ? value : 0;
  };
  const rootBone = new THREE.Bone();
  rootBone.name = `${species}-body`;
  const bones = [rootBone];
  const pelvisPosition = new THREE.Vector3(
    center.x,
    floor + size.y * clamp(posture.pelvisHeight ?? asset.rig.hipHeight, 0.2, 0.78),
    bounds.min.z + size.z * clamp(bodyProfile.pelvisAt ?? 0.38, 0.2, 0.58)
  );
  const chestPosition = new THREE.Vector3(
    center.x,
    floor + size.y * clamp(posture.chestHeight ?? asset.rig.hipHeight, 0.25, 0.84),
    bounds.min.z + size.z * clamp(bodyProfile.shoulderAt ?? 0.7, 0.52, 0.84)
  );
  const spinePosition = pelvisPosition.clone().lerp(chestPosition, 0.52);
  const pelvis = addBone(rootBone, `${species}-pelvis`, pelvisPosition);
  const spine = addBone(rootBone, `${species}-spine`, spinePosition);
  const chest = addBone(rootBone, `${species}-chest`, chestPosition);
  const bodyIndices = {
    pelvis: bones.push(pelvis) - 1,
    spine: bones.push(spine) - 1,
    chest: bones.push(chest) - 1
  };
  const bodyJoints = [
    { joint: pelvis, role: "pelvis", axis: "x", rest: 0 },
    { joint: spine, role: "spine", axis: "x", rest: 0 },
    { joint: chest, role: "chest", axis: "x", rest: 0 }
  ];
  const legs = anchors.map((anchor, index) => {
    const fore = asset.rig.legs === 4 && index >= 2;
    const side = anchor.x <= center.x ? "near" : "far";
    const anatomicalHeight = fore ? posture.chestHeight : posture.pelvisHeight;
    const hipRatio = mixNumber(asset.rig.hipHeight, anatomicalHeight, 0.42);
    const hipY = floor + size.y * clamp(hipRatio, 0.18, 0.74);
    const legLength = Math.max(size.y * 0.12, hipY - floor);
    const zLimitFactor = species === "elephant" ? 0.035 : species === "trex" ? 0.095 : 0.065;
    const limits = { x: size.x * 0.075, z: size.z * zLimitFactor };
    const seed = new THREE.Vector3(anchor.x, floor, anchor.y);
    const footCenter = inferJointCenter(points, bounds, anchors, index, floor + legLength * 0.045, seed, limits);
    const ankleCenter = inferJointCenter(points, bounds, anchors, index, floor + legLength * (fore ? 0.2 : 0.22), footCenter, limits);
    const kneeCenter = inferJointCenter(points, bounds, anchors, index, floor + legLength * (fore ? 0.55 : 0.57), ankleCenter, limits);
    const hipCenter = inferJointCenter(points, bounds, anchors, index, hipY, kneeCenter, limits);
    const parent = fore ? chest : pelvis;
    const hip = addBone(parent, `${side}-${fore ? "fore" : "hind"}-hip`, hipCenter.clone().sub(parent.position));
    const knee = addBone(hip, `${side}-${fore ? "fore" : "hind"}-knee`, kneeCenter.clone().sub(hipCenter));
    const ankle = addBone(knee, `${side}-${fore ? "fore" : "hind"}-ankle`, ankleCenter.clone().sub(kneeCenter));
    const foot = addBone(ankle, `${side}-${fore ? "fore" : "hind"}-foot`, footCenter.clone().sub(ankleCenter));
    const indices = { hip: bones.push(hip) - 1, knee: bones.push(knee) - 1, ankle: bones.push(ankle) - 1, foot: bones.push(foot) - 1 };
    const upperLength = hipCenter.distanceTo(kneeCenter);
    const lowerLength = kneeCenter.distanceTo(ankleCenter);
    const terminalLength = ankleCenter.distanceTo(footCenter);
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
      hipHeight: hipCenter.y,
      axis: "x",
      bend: fore ? 1 : -1,
      upperLength,
      lowerLength,
      terminalLength,
      centers: {
        hip: hipCenter,
        knee: kneeCenter,
        ankle: ankleCenter,
        foot: footCenter
      },
      rest: {
        hip: restAngle("hip"),
        knee: restAngle("knee"),
        ankle: restAngle("ankle"),
        foot: restAngle("foot")
      }
    };
  });

  const headStart = bounds.min.z + size.z * asset.rig.headStart;
  const headPointsY = floor + size.y * (species === "giraffe" ? 0.66 : 0.58);
  const headPosition = upright
    ? new THREE.Vector3(center.x, floor + size.y * 0.66, center.z)
    : new THREE.Vector3(center.x, headPointsY, headStart);
  const head = addBone(chest, `${species}-head`, headPosition.clone().sub(chestPosition));
  const headIndex = bones.push(head) - 1;
  const scoreAnchor = new THREE.Object3D();
  scoreAnchor.name = "score-anchor";
  scoreAnchor.position.set(0, size.y * 0.31, size.z * 0.1);
  head.add(scoreAnchor);

  const tailEnd = bounds.min.z + size.z * asset.rig.tailEnd;
  const tailLength = Math.max(size.z * 0.08, tailEnd - bounds.min.z);
  const hasTail = asset.rig.hasTail !== false;
  const tailAxis = hasTail ? inferTailAxis(points, bounds, tailEnd) : () => floor;
  const tailJoints = [];
  const tailIndices = [];
  let tailParent = pelvis;
  let previousTailPosition = pelvisPosition;
  for (let index = 0; index < (hasTail ? 3 : 0); index++) {
    const t = index / 3;
    const worldPosition = new THREE.Vector3(center.x, tailAxis(t), tailEnd - tailLength * t);
    const position = worldPosition.clone().sub(previousTailPosition);
    const bone = addBone(tailParent, `${species}-tail-${index + 1}`, position);
    const boneIndex = bones.push(bone) - 1;
    tailIndices.push(boneIndex);
    tailJoints.push({ joint: bone, restZ: 0, axis: "x" });
    tailParent = bone;
    previousTailPosition = worldPosition;
  }

  const appendages = [];
  const appendageBones = [];
  const appendageType = asset.rig.appendages
    || (species === "trex" ? "arms" : species === "penguin" ? "wings" : null);
  if (appendageType) {
    const winged = appendageType.startsWith("wings");
    const raptorWing = appendageType === "wings-spread";
    const foldedWing = appendageType === "wings-folded";
    const rootWidth = clamp(asset.rig.appendageRootWidth ?? (winged ? 0.22 : 0.18), 0.035, 0.3);
    const reach = clamp(asset.rig.appendageReach ?? 0.22, 0.12, 0.45);
    for (const [index, sign] of [-1, 1].entries()) {
      const side = sign < 0 ? "near" : "far";
      const shoulderPosition = new THREE.Vector3(
        center.x + sign * size.x * rootWidth,
        floor + size.y * (winged ? 0.59 : 0.57),
        bounds.min.z + size.z * (winged ? 0.52 : 0.7)
      );
      const elbowPosition = shoulderPosition.clone().add(new THREE.Vector3(
        sign * size.x * reach,
        -size.y * (raptorWing ? 0.04 : 0.16),
        0
      ));
      const shoulder = addBone(chest, `${side}-${winged ? "wing" : "arm"}`, shoulderPosition.clone().sub(chestPosition));
      const elbow = addBone(shoulder, `${shoulder.name}-tip`, new THREE.Vector3(sign * size.x * 0.22, -size.y * 0.16, 0));
      const shoulderIndex = bones.push(shoulder) - 1;
      const elbowIndex = bones.push(elbow) - 1;
      appendages.push({
        id: shoulder.name,
        side,
        shoulder,
        elbow,
        phase: index * Math.PI,
        kind: raptorWing ? "raptor-wing" : foldedWing ? "folded-wing" : winged ? "wing" : "arm",
        axis: winged ? "z" : "x",
        rest: { shoulder: 0, elbow: 0 }
      });
      appendageBones.push({ shoulderIndex, elbowIndex, sign, shoulderPosition, elbowPosition });
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
    hipY: Math.max(...legs.map((leg) => leg.hipHeight), floor + size.y * asset.rig.hipHeight),
    size,
    center,
    bodyIndices,
    bodyJoints,
    bodyPositions: { pelvis: pelvisPosition, spine: spinePosition, chest: chestPosition },
    species,
    upright,
    tailAxis,
    tailProfile: morphology.tail || {},
    limbRadius: clamp(asset.rig.limbRadius ?? 0.2, 0.12, 0.3)
  };
}

function setInfluences(indices, weights, vertex, influences) {
  influences.sort((a, b) => b[1] - a[1]);
  const selected = influences.slice(0, 4);
  const total = selected.reduce((sum, item) => sum + item[1], 0) || 1;
  for (let slot = 0; slot < 4; slot++) {
    const influence = selected[slot] || [0, 0];
    indices[vertex * 4 + slot] = influence[0];
    weights[vertex * 4 + slot] = influence[1] / total;
  }
}

function normalizedSegmentDistance(point, start, end, size) {
  const sx = Math.max(size.x, 1e-4);
  const sy = Math.max(size.y, 1e-4);
  const sz = Math.max(size.z, 1e-4);
  const px = (point.x - start.x) / sx;
  const py = (point.y - start.y) / sy;
  const pz = (point.z - start.z) / sz;
  const vx = (end.x - start.x) / sx;
  const vy = (end.y - start.y) / sy;
  const vz = (end.z - start.z) / sz;
  const lengthSquared = vx * vx + vy * vy + vz * vz;
  const along = lengthSquared > 1e-8 ? clamp((px * vx + py * vy + pz * vz) / lengthSquared, 0, 1) : 0;
  return Math.hypot(px - vx * along, py - vy * along, pz - vz * along);
}

function appendageCandidates(point, species, data) {
  const winged = data.appendages.some(({ kind }) => String(kind).includes("wing"));
  const radius = winged ? 0.13 : 0.09;
  return data.appendageBones.map((appendage) => {
    const distance = normalizedSegmentDistance(point, appendage.shoulderPosition, appendage.elbowPosition, data.size);
    const sideDistance = (point.x - data.center.x) * appendage.sign;
    const wingMask = winged
      ? smoothstep(data.size.x * 0.17, data.size.x * 0.3, sideDistance)
        * smoothstep(data.floor + data.size.y * 0.22, data.floor + data.size.y * 0.36, point.y)
        * (1 - smoothstep(data.floor + data.size.y * 0.76, data.floor + data.size.y * 0.86, point.y))
      : 0;
    const reach = clamp(
      point.distanceTo(appendage.shoulderPosition)
        / Math.max(appendage.shoulderPosition.distanceTo(appendage.elbowPosition), 1e-4),
      0,
      1
    );
    return {
      score: Math.max(wingMask, Math.exp(-Math.pow(distance / radius, 2) * 1.6)),
      influences: [[appendage.shoulderIndex, 1 - reach * 0.58], [appendage.elbowIndex, reach * 0.58]]
    };
  });
}

function bodyInfluences(point, data) {
  const candidates = Object.entries(data.bodyPositions).map(([role, position]) => {
    const vertical = data.upright;
    const distance = vertical
      ? Math.abs(point.y - position.y) / Math.max(data.size.y * 0.24, 1e-4)
      : Math.abs(point.z - position.z) / Math.max(data.size.z * 0.24, 1e-4);
    return [data.bodyIndices[role], Math.exp(-distance * distance * 1.7)];
  });
  candidates.sort((a, b) => b[1] - a[1]);
  return candidates.slice(0, 2);
}

function legInfluences(point, leg, data) {
  const legLength = Math.max(leg.hipHeight - data.floor, 1e-4);
  const t = clamp((leg.hipHeight - point.y) / legLength, 0, 1);
  if (t < 0.18) {
    const blend = t / 0.18;
    const parentIndex = leg.role === "fore" ? data.bodyIndices.chest : data.bodyIndices.pelvis;
    return [[parentIndex, 1 - blend], [leg.indices.hip, blend]];
  }
  if (t < 0.48) {
    const blend = (t - 0.18) / 0.3;
    return [[leg.indices.hip, 1 - blend], [leg.indices.knee, blend]];
  }
  if (t < 0.82) {
    const blend = (t - 0.48) / 0.34;
    return [[leg.indices.knee, 1 - blend], [leg.indices.ankle, blend]];
  }
  const blend = (t - 0.82) / 0.18;
  return [[leg.indices.ankle, 1 - blend], [leg.indices.foot, blend]];
}

function legCenterAtY(leg, y, target) {
  const centers = [leg.centers.hip, leg.centers.knee, leg.centers.ankle, leg.centers.foot];
  if (y >= centers[0].y) return target.copy(centers[0]);
  for (let index = 0; index < centers.length - 1; index++) {
    const upper = centers[index];
    const lower = centers[index + 1];
    if (y <= upper.y && y >= lower.y) {
      const span = Math.max(upper.y - lower.y, 1e-4);
      return target.copy(upper).lerp(lower, clamp((upper.y - y) / span, 0, 1));
    }
  }
  return target.copy(centers[centers.length - 1]);
}

function legCandidate(point, leg, data, centerline) {
  legCenterAtY(leg, point.y, centerline);
  const legT = clamp((point.y - data.floor) / Math.max(leg.hipHeight - data.floor, 1e-4), 0, 1);
  const footExpansion = 1 + (1 - smoothstep(0.04, 0.24, legT)) * 0.42;
  const radiusX = Math.max(data.size.x * data.limbRadius * 0.7 * footExpansion, data.size.x * 0.035);
  const radiusZ = Math.max(
    data.size.z * data.limbRadius * (data.legs.length === 2 ? 0.58 : 0.46) * footExpansion,
    data.size.z * 0.028
  );
  const dx = (point.x - centerline.x) / Math.max(radiusX, 1e-4);
  const dz = (point.z - centerline.z) / Math.max(radiusZ, 1e-4);
  const radialSquared = dx * dx + dz * dz;
  const heightFade = 1 - smoothstep(leg.hipHeight - data.size.y * 0.04, leg.hipHeight + data.size.y * 0.075, point.y);
  return {
    leg,
    score: Math.exp(-radialSquared * 1.15) * heightFade,
    influences: legInfluences(point, leg, data)
  };
}

function tailCandidate(point, data) {
  if (data.species === "penguin" || data.tailIndices.length === 0) return null;
  const tailLength = Math.max(data.tailEnd - (data.center.z - data.size.z * 0.5), 1e-4);
  const tailT = clamp((data.tailEnd - point.z) / tailLength, 0, 0.999);
  const tail = data.tailProfile;
  const radiusScale = mixNumber(tail.rootRadius ?? 1, tail.tipRadius ?? 1, tailT);
  const axisY = data.tailAxis(tailT);
  const radiusY = data.size.y * clamp(radiusScale * 0.12, 0.065, 0.19);
  const radiusX = data.size.x * clamp(radiusScale * 0.22, 0.12, 0.34);
  const radialSquared = Math.pow((point.y - axisY) / Math.max(radiusY, 1e-4), 2)
    + Math.pow((point.x - data.center.x) / Math.max(radiusX, 1e-4), 2);
  const lengthMask = 1 - smoothstep(data.tailEnd - tailLength * 0.015, data.tailEnd + tailLength * 0.07, point.z);
  const floorMask = smoothstep(data.floor + data.size.y * 0.09, data.floor + data.size.y * 0.16, point.y);
  const score = Math.exp(-radialSquared * 1.4) * lengthMask * floorMask;
  if (score < 1e-5) return null;
  const scaled = tailT * data.tailIndices.length;
  const part = Math.min(data.tailIndices.length - 1, Math.floor(scaled));
  const mix = scaled - part;
  const rootAt = clamp(tail.rootAt ?? 0.3, 0.12, 0.42);
  const rootBlend = clamp((tailT - rootAt * 0.28) / Math.max(rootAt * 0.72, 1e-4), 0, 1);
  const influences = [[data.bodyIndices.pelvis, 1 - rootBlend], [data.tailIndices[part], rootBlend * (1 - mix)]];
  if (part + 1 < data.tailIndices.length) influences.push([data.tailIndices[part + 1], rootBlend * mix]);
  return { score, influences };
}

function headCandidate(point, data) {
  if (data.upright) {
    const start = data.floor + data.size.y * 0.54;
    const score = smoothstep(start, data.floor + data.size.y * 0.7, point.y);
    if (score < 1e-5) return null;
    const blend = smoothstep(start, data.floor + data.size.y * 0.76, point.y);
    return { score, influences: [[data.bodyIndices.chest, 1 - blend], [data.headIndex, blend]] };
  }
  const frontMask = smoothstep(data.headStart - data.size.z * 0.055, data.headStart + data.size.z * 0.055, point.z);
  let shapeMask = smoothstep(data.floor + data.size.y * 0.18, data.floor + data.size.y * 0.3, point.y);
  if (data.species === "elephant") {
    const centerDistance = Math.abs(point.x - data.center.x) / Math.max(data.size.x * 0.18, 1e-4);
    const trunkMask = Math.exp(-centerDistance * centerDistance * 1.8);
    const upperHead = smoothstep(data.floor + data.size.y * 0.28, data.floor + data.size.y * 0.43, point.y);
    shapeMask = Math.max(trunkMask, upperHead);
  }
  const score = frontMask * shapeMask;
  if (score < 1e-5) return null;
  const blend = smoothstep(data.headStart - data.size.z * 0.025, data.headStart + data.size.z * 0.1, point.z);
  return { score, influences: [[data.bodyIndices.chest, 1 - blend], [data.headIndex, blend]] };
}

function addInfluences(target, influences, amount) {
  if (!(amount > 0)) return;
  const total = influences.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0) || 1;
  for (const [bone, weight] of influences) {
    target.set(bone, (target.get(bone) || 0) + amount * Math.max(0, weight) / total);
  }
}

function normalizeInfluenceMap(influences) {
  let total = 0;
  for (const weight of influences.values()) total += Math.max(0, weight);
  if (!(total > 0)) return influences;
  for (const [bone, weight] of influences) influences.set(bone, Math.max(0, weight) / total);
  return influences;
}

function vertexInfluences(point, species, data, centerline) {
  const result = new Map();
  const head = headCandidate(point, data);
  const tail = tailCandidate(point, data);
  const appendages = appendageCandidates(point, species, data);
  const legs = data.legs.map((leg) => legCandidate(point, leg, data, centerline));
  const headSuppression = head?.score || 0;
  const tailSuppression = tail?.score || 0;
  const appendageSuppression = appendages.reduce((best, candidate) => Math.max(best, candidate.score), 0);
  const nonBody = Math.max(headSuppression, tailSuppression, appendageSuppression, ...legs.map(({ score }) => score));

  addInfluences(result, bodyInfluences(point, data), Math.max(0.12, 1 - nonBody * 0.9));
  if (head) addInfluences(result, head.influences, head.score * 7.5);
  if (tail) addInfluences(result, tail.influences, tail.score * 7);
  for (const appendage of appendages) addInfluences(result, appendage.influences, appendage.score * 7);

  for (const candidate of legs) {
    // A trunk, tail or arm can project onto a planted limb in two dimensions.
    // Let the explicit anatomical tube win gradually rather than changing the
    // entire vertex from one unrelated chain to another at a hard boundary.
    const featureSuppression = Math.max(
      data.species === "elephant" ? headSuppression * 0.995 : headSuppression * 0.86,
      tailSuppression * 0.94,
      appendageSuppression * 0.93
    );
    addInfluences(result, candidate.influences, candidate.score * candidate.score * 8 * (1 - featureSuppression));
  }
  return normalizeInfluenceMap(result);
}

function boneFamilies(data) {
  const families = data.bones.map(() => "body");
  families[data.headIndex] = "head";
  for (const index of data.tailIndices) families[index] = "tail";
  for (const leg of data.legs) {
    for (const index of Object.values(leg.indices)) families[index] = `leg:${leg.id}`;
  }
  data.appendageBones.forEach((appendage, index) => {
    families[appendage.shoulderIndex] = `appendage:${index}`;
    families[appendage.elbowIndex] = `appendage:${index}`;
  });
  return families;
}

function dominantFamily(influences, families) {
  const totals = new Map();
  for (const [bone, weight] of influences) {
    const family = families[bone] || "body";
    totals.set(family, (totals.get(family) || 0) + weight);
  }
  let winner = "body";
  let best = -1;
  for (const [family, weight] of totals) {
    if (weight > best) {
      winner = family;
      best = weight;
    }
  }
  return winner;
}

function familiesCompatible(first, second) {
  if (first === second || first === "body" || second === "body") return true;
  return (first === "head" && second.startsWith("appendage:"))
    || (second === "head" && first.startsWith("appendage:"));
}

function averageMaps(maps) {
  const result = new Map();
  for (const map of maps) {
    for (const [bone, weight] of map) result.set(bone, (result.get(bone) || 0) + weight / maps.length);
  }
  return normalizeInfluenceMap(result);
}

function mixMaps(source, targets, amount) {
  if (!targets.length) return source;
  const target = averageMaps(targets);
  const result = new Map();
  addInfluences(result, [...source], 1 - amount);
  addInfluences(result, [...target], amount);
  return normalizeInfluenceMap(result);
}

function stabilizeTriangleWeights(geometry, influenceMaps, data) {
  const families = boneFamilies(data);
  const index = geometry.index;
  const triangleCount = Math.floor((index ? index.count : influenceMaps.length) / 3);
  let current = influenceMaps;
  for (let pass = 0; pass < 3; pass++) {
    const targets = Array.from({ length: current.length }, () => []);
    for (let triangle = 0; triangle < triangleCount; triangle++) {
      const vertices = [0, 1, 2].map((corner) => index ? index.getX(triangle * 3 + corner) : triangle * 3 + corner);
      const faceFamilies = vertices.map((vertex) => dominantFamily(current[vertex], families));
      let incompatible = false;
      for (let first = 0; first < 3; first++) {
        for (let second = first + 1; second < 3; second++) {
          if (!familiesCompatible(faceFamilies[first], faceFamilies[second])) incompatible = true;
        }
      }
      if (!incompatible) continue;
      const faceAverage = averageMaps(vertices.map((vertex) => current[vertex]));
      for (const vertex of vertices) targets[vertex].push(faceAverage);
    }
    current = current.map((map, vertex) => mixMaps(map, targets[vertex], pass === 0 ? 0.82 : 0.68));
  }
  return current;
}

function addSkinAttributes(geometry, species, data) {
  const position = geometry.attributes.position;
  const indices = new Uint16Array(position.count * 4);
  const weights = new Float32Array(position.count * 4);
  const point = new THREE.Vector3();
  const centerline = new THREE.Vector3();
  let influenceMaps = [];

  for (let vertex = 0; vertex < position.count; vertex++) {
    point.fromBufferAttribute(position, vertex);
    influenceMaps.push(vertexInfluences(point, species, data, centerline));
  }
  influenceMaps = stabilizeTriangleWeights(geometry, influenceMaps, data);
  for (let vertex = 0; vertex < position.count; vertex++) {
    setInfluences(indices, weights, vertex, [...influenceMaps[vertex]]);
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
  const records = gatherSourceMeshes(sourceScene, animal.id, asset.tint, asset.tintStrength);
  if (!records.length) throw new Error(`Animal asset ${animal.id} has no renderable mesh`);
  let bounds = boundsFromRecords(records);
  let size = bounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(size.y) || size.y <= 0) throw new Error(`Animal asset ${animal.id} has invalid bounds`);
  let points = geometryPoints(records);
  let anchors = inferLegAnchors(points, bounds, asset.rig.legs, asset.rig.footBand, asset.rig.footSeedWidth);
  const floor = bounds.min.y;
  const hipY = floor + size.y * asset.rig.hipHeight;
  const headStart = bounds.min.z + size.z * asset.rig.headStart;
  const tailEnd = bounds.min.z + size.z * asset.rig.tailEnd;
  const hasTail = asset.rig.hasTail !== false;
  const tailCenterline = hasTail
    ? buildMorphologyTailCenterline(records.map(({ geometry }) => geometry), bounds, tailEnd, floor)
    : () => floor;
  for (const record of records) {
    reshapeAnimalGeometry(record.geometry, {
      bounds,
      anchors,
      profile: asset.morphology,
      species: animal.id,
      legCount: asset.rig.legs,
      hipY,
      headStart,
      tailEnd,
      tailCenterline,
      hasTail,
      upright: asset.rig.upright === true || animal.id === "penguin"
    });
  }
  bounds = boundsFromRecords(records);
  size = bounds.getSize(new THREE.Vector3());
  points = geometryPoints(records);
  anchors = inferLegAnchors(points, bounds, asset.rig.legs, asset.rig.footBand, asset.rig.footSeedWidth);
  const data = makeSkeleton(animal.id, asset, bounds, anchors, points);
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
  for (const leg of data.legs) {
    Object.defineProperty(leg, "worldReach", {
      value: (leg.upperLength + leg.lowerLength + leg.terminalLength) * normalizedScale,
      enumerable: true,
      writable: false,
      configurable: false
    });
  }

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
  const accents = attachAnimalAccents(asset.accents, data);

  const rig = {
    species: animal.id,
    gait: asset.gait,
    realistic: true,
    legs: data.legs,
    appendages: data.appendages,
    tailJoints: data.tailJoints,
    bodyJoints: data.bodyJoints,
    headPivot: data.head,
    headRestZ: 0,
    headAxis: "x",
    scoreAnchor: data.scoreAnchor,
    torso: data.rootBone,
    profile: {
      ...(asset.gaitProfile || {}),
      tailStiffness: asset.morphology?.tail?.stiffness ?? 0.5
    }
  };
  return { animal, root, model, rig, parts: rig, skinnedMeshes, skeleton, accents };
}
