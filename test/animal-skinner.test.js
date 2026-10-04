import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import test from "node:test";
import { ANIMAL_ASSETS } from "../src/animal-assets.js";
import { ANIMALS } from "../src/animal-catalog.js";
import { skinAnimalScene } from "../src/animal-skinner.js";
import * as THREE from "../src/vendor/three.module.min.js";

function dominantBoneNames(mesh, skeleton) {
  const skinIndex = mesh.geometry.getAttribute("skinIndex");
  const skinWeight = mesh.geometry.getAttribute("skinWeight");
  return Array.from({ length: skinIndex.count }, (_, vertex) => {
    const weights = [skinWeight.getX(vertex), skinWeight.getY(vertex), skinWeight.getZ(vertex), skinWeight.getW(vertex)];
    const indices = [skinIndex.getX(vertex), skinIndex.getY(vertex), skinIndex.getZ(vertex), skinIndex.getW(vertex)];
    const slot = weights.indexOf(Math.max(...weights));
    return skeleton.bones[indices[slot]].name;
  });
}

test("all realistic runner assets are local, compact GLB files", async () => {
  assert.deepEqual(Object.keys(ANIMAL_ASSETS), ANIMALS.map(({ id }) => id));
  assert.equal(ANIMAL_ASSETS.monkey.rig.hasTail, false, "the chimpanzee runner must not grow a synthetic tail");
  for (const animal of ANIMALS) {
    const file = new URL(`../public/${ANIMAL_ASSETS[animal.id].file}`, import.meta.url);
    const info = await stat(file);
    assert.ok(info.size > 50_000, `${animal.id} should contain a real mesh`);
    assert.ok(info.size < 750_000, `${animal.id} should remain mobile friendly`);
  }
});

test("tailless ape assets build no tail bones", () => {
  const scene = new THREE.Group();
  const geometry = new THREE.BoxGeometry(0.9, 1.4, 1.2, 3, 5, 4);
  geometry.translate(0, 0.7, 0);
  const material = new THREE.MeshStandardMaterial({ color: 0x332b28 });
  scene.add(new THREE.Mesh(geometry, material));

  const runner = skinAnimalScene(scene, "monkey");
  assert.deepEqual(runner.rig.tailJoints, []);
  assert.ok(runner.skeleton.bones.every(({ name }) => !name.includes("tail")));

  runner.root.traverse((node) => node.geometry?.dispose());
  material.dispose();
  geometry.dispose();
});

test("generated biped rigs inherit configured knee rest angles", () => {
  for (const id of ["trex", "godzilla"]) {
    const scene = new THREE.Group();
    const geometry = new THREE.BoxGeometry(0.9, 1.4, 1.8, 4, 7, 8);
    geometry.translate(0, 0.7, 0);
    const material = new THREE.MeshStandardMaterial({ color: 0x53634c });
    scene.add(new THREE.Mesh(geometry, material));

    const runner = skinAnimalScene(scene, id);
    assert.equal(runner.rig.legs.length, 2, `${id} biped limbs`);
    assert.ok(
      runner.rig.legs.every(({ rest }) => rest.knee === ANIMAL_ASSETS[id].rig.restKnee),
      `${id} asset rest angle must reach every generated knee`
    );

    runner.root.traverse((node) => node.geometry?.dispose());
    material.dispose();
    geometry.dispose();
  }
});

test("runtime skinning accepts quantized-style interleaved GLTF attributes", () => {
  const source = new THREE.BoxGeometry(1, 2, 3, 2, 4, 6);
  const position = source.attributes.position;
  const normal = source.attributes.normal;
  const values = new Float32Array(position.count * 6);
  for (let index = 0; index < position.count; index++) {
    values.set([
      position.getX(index), position.getY(index), position.getZ(index),
      normal.getX(index), normal.getY(index), normal.getZ(index)
    ], index * 6);
  }
  const interleaved = new THREE.InterleavedBuffer(values, 6);
  const geometry = source.clone();
  geometry.setAttribute("position", new THREE.InterleavedBufferAttribute(interleaved, 3, 0));
  geometry.setAttribute("normal", new THREE.InterleavedBufferAttribute(interleaved, 3, 3));
  const scene = new THREE.Group();
  scene.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x888888 })));

  const runner = skinAnimalScene(scene, "rabbit");
  assert.equal(runner.root.userData.realistic, true);
  assert.equal(runner.rig.legs.length, 4);
  for (const leg of runner.rig.legs) {
    assert.ok(Number.isFinite(leg.worldReach) && leg.worldReach > 0, `${leg.id} exposes its normalized reach`);
    assert.equal(Object.getOwnPropertyDescriptor(leg, "worldReach")?.writable, false);
  }
  assert.deepEqual(runner.rig.bodyJoints.map(({ role }) => role), ["pelvis", "spine", "chest"]);
  assert.equal(runner.rig.tailJoints.length, 3);
  assert.equal(runner.skinnedMeshes.length, 1);
  assert.ok(runner.rig.scoreAnchor);
  const skinIndex = runner.skinnedMeshes[0].geometry.getAttribute("skinIndex");
  const skinWeight = runner.skinnedMeshes[0].geometry.getAttribute("skinWeight");
  assert.equal(skinIndex.itemSize, 4);
  for (let vertex = 0; vertex < skinWeight.count; vertex++) {
    const total = skinWeight.getX(vertex) + skinWeight.getY(vertex)
      + skinWeight.getZ(vertex) + skinWeight.getW(vertex);
    assert.ok(Math.abs(total - 1) < 1e-5, `vertex ${vertex} must have normalized skin weights`);
  }

  runner.root.traverse((node) => {
    node.geometry?.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) material?.dispose();
  });
  source.dispose();
  geometry.dispose();
});

test("upright penguin wings and head use anatomical masks instead of front/back z slices", () => {
  const scene = new THREE.Group();
  const material = new THREE.MeshStandardMaterial();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2, 0.8, 2, 4, 2), material);
  body.name = "body";
  body.position.y = 1;
  scene.add(body);

  const wingGeometry = new THREE.BufferGeometry();
  wingGeometry.setAttribute("position", new THREE.Float32BufferAttribute([
    0.66, 0.82, -0.34,
    0.67, 1.18, 0,
    0.65, 0.86, 0.34
  ], 3));
  const wing = new THREE.Mesh(wingGeometry, material);
  wing.name = "wing-test";
  scene.add(wing);

  const headGeometry = new THREE.SphereGeometry(0.2, 6, 4);
  headGeometry.translate(0, 1.75, 0);
  const head = new THREE.Mesh(headGeometry, material);
  head.name = "head-test";
  scene.add(head);

  const runner = skinAnimalScene(scene, "penguin");
  const skinnedWing = runner.skinnedMeshes.find(({ name }) => name === "wing-test");
  const skinnedHead = runner.skinnedMeshes.find(({ name }) => name === "head-test");
  assert.ok(dominantBoneNames(skinnedWing, runner.skeleton).every((name) => name.includes("wing")));
  assert.ok(dominantBoneNames(skinnedHead, runner.skeleton).every((name) => name.includes("head") || name.includes("chest")));

  runner.root.traverse((node) => node.geometry?.dispose());
  material.dispose();
  wingGeometry.dispose();
  headGeometry.dispose();
});
