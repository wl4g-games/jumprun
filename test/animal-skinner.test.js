import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import test from "node:test";
import { ANIMAL_ASSETS } from "../src/animal-assets.js";
import { ANIMALS } from "../src/animal-catalog.js";
import { skinAnimalScene } from "../src/animal-skinner.js";
import * as THREE from "../src/vendor/three.module.min.js";

test("all realistic runner assets are local, compact GLB files", async () => {
  assert.deepEqual(Object.keys(ANIMAL_ASSETS), ANIMALS.map(({ id }) => id));
  for (const animal of ANIMALS) {
    const file = new URL(`../public/${ANIMAL_ASSETS[animal.id].file}`, import.meta.url);
    const info = await stat(file);
    assert.ok(info.size > 50_000, `${animal.id} should contain a real mesh`);
    assert.ok(info.size < 750_000, `${animal.id} should remain mobile friendly`);
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
