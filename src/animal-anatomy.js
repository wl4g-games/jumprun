import * as THREE from "./vendor/three.module.min.js";

const EPSILON = 1e-5;

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / Math.max(EPSILON, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function gaussian(value, center, width) {
  const distance = (value - center) / Math.max(width, EPSILON);
  return Math.exp(-distance * distance * 2);
}

function mix(a, b, amount) {
  return a + (b - a) * amount;
}

export function buildMorphologyTailCenterline(geometries, bounds, tailEnd, floor = bounds.min.y) {
  const buckets = Array.from({ length: 18 }, () => ({ y: 0, count: 0 }));
  const size = bounds.getSize(new THREE.Vector3());
  const length = Math.max(tailEnd - bounds.min.z, EPSILON);
  for (const geometry of geometries) {
    const position = geometry?.attributes?.position;
    if (!position) continue;
    for (let index = 0; index < position.count; index++) {
      const z = position.getZ(index);
      const y = position.getY(index);
      if (z > tailEnd || y < floor + size.y * 0.14) continue;
      const t = clamp((tailEnd - z) / length);
      const bucket = buckets[Math.min(buckets.length - 1, Math.floor(t * buckets.length))];
      bucket.y += y;
      bucket.count++;
    }
  }
  let last = floor;
  for (const bucket of buckets) {
    if (bucket.count) last = bucket.y / bucket.count;
    bucket.y = last;
  }
  for (let index = buckets.length - 2; index >= 0; index--) {
    if (!buckets[index].count) buckets[index].y = buckets[index + 1].y;
  }
  return (t) => {
    const scaled = clamp(t) * (buckets.length - 1);
    const index = Math.floor(scaled);
    return mix(buckets[index].y, buckets[Math.min(index + 1, buckets.length - 1)].y, scaled - index);
  };
}

function nearestAnchor(x, z, anchors, size) {
  let winner = null;
  let distance = Infinity;
  for (let index = 0; index < anchors.length; index++) {
    const anchor = anchors[index];
    const dx = (x - anchor.x) / Math.max(size.x * 0.34, EPSILON);
    const dz = (z - anchor.y) / Math.max(size.z * (anchors.length === 2 ? 0.2 : 0.14), EPSILON);
    const candidate = dx * dx + dz * dz;
    if (candidate < distance) {
      distance = candidate;
      winner = { anchor, index, distance };
    }
  }
  return winner;
}

/**
 * Applies restrained, species-specific proportion corrections to a cloned GLB
 * geometry. Source textures and topology stay intact; only anatomical regions
 * are widened, balanced and re-postured before the skeleton is bound.
 */
export function reshapeAnimalGeometry(geometry, context) {
  const { bounds, anchors, profile, species, legCount, hipY, headStart, tailEnd } = context;
  const hasTail = context.hasTail !== false;
  const upright = context.upright === true || species === "penguin";
  if (!geometry?.attributes?.position || !profile) return geometry;
  const position = geometry.attributes.position;
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const floor = bounds.min.y;
  const body = profile.body || {};
  const limbs = profile.limbs || {};
  const head = profile.head || {};
  const tail = profile.tail || {};
  const posture = profile.posture || {};
  const tailY = context.tailCenterline || buildMorphologyTailCenterline([geometry], bounds, tailEnd, floor);
  const tailRootY = tailY(0);
  const tailTipY = tailY(1);
  const tailLength = Math.max(tailEnd - bounds.min.z, EPSILON);
  const headLength = Math.max(bounds.max.z - headStart, EPSILON);
  const bodyCenterY = floor + size.y * mix(0.48, 0.56, clamp(posture.centerOfMass ?? 0.5));
  const bodyFloor = floor + size.y * clamp(0.16 + (posture.groundClearance ?? 0.02) * 2.5, 0.16, 0.3);
  const shoulderAt = clamp(body.shoulderAt ?? 0.68);
  const pelvisAt = clamp(body.pelvisAt ?? 0.36);
  const abdomenAt = (shoulderAt + pelvisAt) * 0.5;
  const point = new THREE.Vector3();

  for (let vertex = 0; vertex < position.count; vertex++) {
    point.fromBufferAttribute(position, vertex);
    const sourceX = point.x;
    const sourceY = point.y;
    const sourceZ = point.z;
    const normalizedZ = clamp((sourceZ - bounds.min.z) / Math.max(size.z, EPSILON));
    const normalizedY = clamp((sourceY - floor) / Math.max(size.y, EPSILON));
    const anchorHit = nearestAnchor(sourceX, sourceZ, anchors, size);

    // Legs retain their source centerline while gaining the characteristic
    // column, thigh, cannon-bone and foot volumes of each species.
    if (sourceY <= hipY + size.y * 0.055 && anchorHit?.distance < 1.65) {
      const fore = legCount === 4 && anchorHit.index >= 2;
      const limb = fore ? (limbs.fore || limbs.hind || {}) : (limbs.hind || limbs.fore || {});
      const legT = clamp((sourceY - floor) / Math.max(hipY - floor, EPSILON));
      const proximal = limb.proximalRadius ?? 1;
      const distal = limb.distalRadius ?? 1;
      const radius = mix(distal, proximal, smoothstep(0.16, 0.88, legT));
      let radiusX = radius;
      let radiusZ = radius;
      const footScale = limb.footScale || {};
      if (legT < 0.16) {
        const footBlend = 1 - smoothstep(0.02, 0.18, legT);
        const footWidth = typeof footScale === "number" ? footScale : (footScale.width ?? 1);
        const footHeight = typeof footScale === "number" ? 1 : (footScale.height ?? 1);
        const footLength = typeof footScale === "number" ? footScale : (footScale.length ?? 1);
        radiusX = mix(radius, footWidth, footBlend);
        radiusZ = mix(radius, footLength, footBlend);
        point.y = floor + (point.y - floor) * mix(1, footHeight, footBlend);
      }
      const radialInfluence = 1 - smoothstep(0.45, 1.65, anchorHit.distance);
      const hipFade = 1 - smoothstep(0.78, 1.06, legT);
      const influence = radialInfluence * hipFade;
      const stance = limb.stanceWidth ?? 1;
      const side = sourceX <= center.x ? -1 : 1;
      const stanceShift = side * size.x * 0.035 * (stance - 1) * (1 - smoothstep(0, 0.35, legT));
      point.x = anchorHit.anchor.x + (sourceX - anchorHit.anchor.x) * mix(1, radiusX, influence) + stanceShift;
      point.z = anchorHit.anchor.y + (sourceZ - anchorHit.anchor.y) * mix(1, radiusZ, influence);
    }

    // Shoulder, abdomen and pelvis are separate masses. This avoids the same
    // featureless tube silhouette being imposed on cats, bears and elephants.
    const massCoordinate = upright ? normalizedY : normalizedZ;
    const tailFade = smoothstep(0.04, 0.15, massCoordinate);
    const headFade = 1 - smoothstep(0.76, 0.94, massCoordinate);
    const bodyHeightMask = smoothstep(bodyFloor, bodyFloor + size.y * 0.12, sourceY);
    const bodyMask = tailFade * headFade * bodyHeightMask;
    if (bodyMask > 0) {
      const chest = gaussian(massCoordinate, shoulderAt, 0.17) * ((body.chestMass ?? 1) - 1);
      const abdomen = gaussian(massCoordinate, abdomenAt, 0.2) * ((body.abdomenMass ?? 1) - 1);
      const pelvis = gaussian(massCoordinate, pelvisAt, 0.17) * ((body.pelvisMass ?? 1) - 1);
      const mass = clamp(1 + chest + abdomen + pelvis, 0.72, 1.58);
      const depth = clamp(body.depthScale ?? 1, 0.72, 1.45);
      point.x = center.x + (point.x - center.x) * mix(1, mass * depth, bodyMask);
      point.y = bodyCenterY + (point.y - bodyCenterY) * mix(1, 1 + (mass - 1) * 0.58, bodyMask);
      point.y += size.y * (
        gaussian(normalizedZ, shoulderAt, 0.14) * ((posture.chestHeight ?? 0.5) - 0.5)
        + gaussian(normalizedZ, pelvisAt, 0.14) * ((posture.pelvisHeight ?? 0.5) - 0.5)
      ) * 0.18 * bodyMask;
    }

    // Scale the skull/muzzle as a coherent volume around the neck junction.
    const penguinHeadStart = floor + size.y * 0.62;
    const inHead = upright
      ? sourceY >= penguinHeadStart
      : sourceZ >= headStart && (species === "elephant" || sourceY > floor + size.y * 0.2);
    if (inHead) {
      const amount = upright
        ? smoothstep(penguinHeadStart, floor + size.y * 0.82, sourceY)
        : smoothstep(headStart, headStart + headLength * 0.55, sourceZ);
      const pivotY = floor + size.y * (posture.chestHeight ?? 0.56);
      const verticalAmount = species === "elephant"
        ? amount * smoothstep(floor + size.y * 0.3, floor + size.y * 0.58, sourceY)
        : amount;
      point.x = center.x + (point.x - center.x) * mix(1, head.scale?.width ?? 1, amount);
      point.y = pivotY + (point.y - pivotY) * mix(1, head.scale?.height ?? 1, verticalAmount);
      const lengthPivot = upright ? center.z : headStart;
      point.z = lengthPivot + (point.z - lengthPivot) * mix(1, head.scale?.length ?? 1, amount);
      if (!upright) point.y += (point.z - headStart) * Math.tan(posture.headPitch ?? 0) * amount;
    }

    // Preserve length while thickening the tail around its measured centerline.
    // A smooth root blend prevents a visible seam at the pelvis.
    if (hasTail && species !== "penguin" && sourceZ <= tailEnd && sourceY > floor + size.y * 0.12) {
      const t = clamp((tailEnd - sourceZ) / tailLength);
      const firstHalf = smoothstep(0, 0.5, t);
      const secondHalf = smoothstep(0.5, 1, t);
      const rootRadius = tail.rootRadius ?? 1;
      const midRadius = tail.midRadius ?? rootRadius;
      const tipRadius = tail.tipRadius ?? midRadius;
      const radius = t < 0.5 ? mix(rootRadius, midRadius, firstHalf) : mix(midRadius, tipRadius, secondHalf);
      const seam = smoothstep(0, 0.12, t);
      const sourceAxisY = tailY(t);
      const straightAxisY = mix(tailRootY, tailTipY, t);
      const axisY = mix(sourceAxisY, straightAxisY, clamp(tail.straighten ?? 0));
      point.x = center.x + (point.x - center.x) * mix(1, radius, seam);
      point.y = axisY + (point.y - sourceAxisY) * mix(1, radius, seam);
      point.y += size.y * (tail.tipLift ?? 0) * t * t;
    }

    const upperBodyLean = Number.isFinite(posture.upperBodyLean) ? posture.upperBodyLean : 0;
    if (upperBodyLean) {
      const pelvisZ = bounds.min.z + size.z * pelvisAt;
      const pelvisY = floor + size.y * (posture.pelvisHeight ?? 0.5);
      const leanMask = smoothstep(0.26, 0.56, normalizedY)
        * smoothstep(pelvisAt - 0.08, pelvisAt + 0.16, normalizedZ);
      const dy = point.y - pelvisY;
      const dz = point.z - pelvisZ;
      const cosine = Math.cos(upperBodyLean);
      const sine = Math.sin(upperBodyLean);
      const leanedY = pelvisY + dy * cosine - dz * sine;
      const leanedZ = pelvisZ + dy * sine + dz * cosine;
      point.y = mix(point.y, leanedY, leanMask);
      point.z = mix(point.z, leanedZ, leanMask);
    }

    const bodyLift = Number.isFinite(posture.bodyLift) ? posture.bodyLift : 0;
    if (bodyLift) {
      const liftMask = smoothstep(floor + size.y * 0.12, floor + size.y * 0.52, sourceY);
      point.y += size.y * bodyLift * liftMask;
    }

    position.setXYZ(vertex, point.x, point.y, point.z);
  }

  position.needsUpdate = true;
  geometry.deleteAttribute("normal");
  geometry.deleteAttribute("tangent");
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
