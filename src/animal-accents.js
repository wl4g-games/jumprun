import * as THREE from "./vendor/three.module.min.js";

function dorsalPlateGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    -0.5, 0, -0.5,  -0.5, 0, 0.5,  -0.5, 1, 0,
     0.5, 0, -0.5,   0.5, 0, 0.5,   0.5, 1, 0
  ], 3));
  geometry.setIndex([
    0, 1, 2, 3, 5, 4,
    0, 3, 4, 0, 4, 1,
    1, 4, 5, 1, 5, 2,
    2, 5, 3, 2, 3, 0
  ]);
  geometry.computeVertexNormals();
  return geometry;
}

function attachDorsalPlates(data) {
  const count = 18;
  const geometry = dorsalPlateGeometry();
  const material = new THREE.MeshStandardMaterial({
    name: "godzilla-dorsal-plates",
    color: 0x718a78,
    emissive: 0x1c3934,
    emissiveIntensity: 0.22,
    roughness: 0.92,
    metalness: 0,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = "godzilla-dorsal-plates";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const plates = [];

  for (let index = 0; index < count; index++) {
    const t = index / (count - 1);
    const bodyPeak = Math.exp(-Math.pow((t - 0.56) / 0.26, 2));
    const neckPeak = Math.exp(-Math.pow((t - 0.78) / 0.13, 2)) * 0.34;
    const height = data.size.y * (0.07 + bodyPeak * 0.23 + neckPeak * 0.1);
    const width = data.size.z * (0.026 + bodyPeak * 0.018);
    const thickness = data.size.x * (0.038 + bodyPeak * 0.022);
    const z = data.center.z - data.size.z * 0.48 + data.size.z * 0.92 * t;
    const back = data.floor + data.size.y * (0.54 + bodyPeak * 0.17 + neckPeak * 0.08);
    plates.push({ t, z, back, height, width, thickness });
  }

  function update(frame = {}) {
    const elapsed = Number.isFinite(frame.elapsed) ? frame.elapsed : 0;
    const wind = Math.min(1, Math.max(0, Number(frame.wind) || 0));
    plates.forEach((plate, index) => {
      dummy.position.set(0, plate.back, plate.z);
      dummy.rotation.set(
        Math.sin(elapsed * 2.2 - index * 0.23) * 0.006 * wind,
        0,
        Math.sin(elapsed * 1.7 - index * 0.17) * 0.004 * wind
      );
      dummy.scale.set(plate.thickness, plate.height, plate.width);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }

  update();
  data.rootBone.add(mesh);
  return { update };
}

function attachEyeScar(data) {
  const group = new THREE.Group();
  group.name = "scar-king-eye-scar";
  const material = new THREE.MeshStandardMaterial({
    name: "scar-mark",
    color: 0x3b1713,
    roughness: 0.86,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
  const geometry = new THREE.BoxGeometry(
    Math.max(data.size.x * 0.012, 0.002),
    data.size.y * 0.13,
    data.size.z * 0.012
  );
  for (let index = 0; index < 3; index++) {
    const mark = new THREE.Mesh(geometry, material);
    mark.position.set(
      -data.size.x * 0.29,
      data.size.y * (0.055 + index * 0.017),
      data.size.z * (0.045 + index * 0.014)
    );
    mark.rotation.x = -0.38;
    mark.rotation.z = 0.08;
    mark.castShadow = false;
    group.add(mark);
  }
  data.head.add(group);
  return { update() {} };
}

/**
 * Adds small character-specific silhouette details without contaminating the
 * shared source GLB. Decorations live on generated bones, so reused assets can
 * keep independent identities and follow the same runtime pose.
 */
export function attachAnimalAccents(kind, data) {
  if (kind === "dorsal-plates") return attachDorsalPlates(data);
  if (kind === "eye-scar") return attachEyeScar(data);
  return null;
}
