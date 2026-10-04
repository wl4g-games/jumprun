import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "../src/vendor/three.module.min.js";
import {
  attachAnimalCoat,
  coatLayerValues,
  resolveAnimalCoat,
  stepAnimalCoatMotion
} from "../src/animal-coat.js";

test("coat profiles preserve bare skin and scale species", () => {
  for (const species of ["trex", "elephant"]) {
    const profile = resolveAnimalCoat(species, "high");
    assert.equal(profile.maximumShells, 0);
    assert.equal(profile.shellCount, 0);
  }
  assert.equal(resolveAnimalCoat("fox", "high").shellCount, 9);
  assert.equal(resolveAnimalCoat("fox", "balanced").shellCount, 7);
  assert.equal(resolveAnimalCoat("fox", "low").shellCount, 0);
  assert.equal(resolveAnimalCoat("not-an-animal").species, "trex");
});

test("shell layers are deterministic and ordered from root to tip", () => {
  assert.deepEqual(coatLayerValues(5), [0.2, 0.4, 0.6, 0.8, 1]);
  assert.deepEqual(coatLayerValues(0), []);
  assert.deepEqual(coatLayerValues(Number.NaN), []);
});

test("coat motion freezes while paused and remains bounded", () => {
  const moving = stepAnimalCoatMotion(
    { time: 0, wind: 0, vertical: 0, lastElapsed: 1 },
    { elapsed: 1.5, speed: 1e9, verticalVelocity: -1e9 },
    1
  );
  assert.ok(moving.time > 0);
  assert.ok(moving.wind > 0 && moving.wind <= 1);
  assert.ok(moving.vertical > 0 && moving.vertical <= 0.55);

  const paused = stepAnimalCoatMotion(moving, {
    elapsed: 20,
    dt: 10,
    speed: 0,
    verticalVelocity: 0,
    paused: true
  }, 1);
  assert.equal(paused.time, moving.time);
  assert.equal(paused.wind, moving.wind);
  assert.equal(paused.vertical, moving.vertical);
  assert.equal(paused.lastElapsed, 20);
});

test("plain meshes receive one instanced shell with runtime quality control", () => {
  const model = new THREE.Group();
  const sourceGeometry = new THREE.SphereGeometry(1, 8, 6);
  const sourceMaterial = new THREE.MeshStandardMaterial({ color: 0xa85c35 });
  sourceMaterial.name = "bodyFur";
  const source = new THREE.Mesh(sourceGeometry, sourceMaterial);
  source.name = "body";
  model.add(source);

  const coat = attachAnimalCoat({ species: "fox", model });
  assert.equal(coat.shells.length, 1);
  const shell = coat.shells[0];
  assert.equal(shell.parent, source);
  assert.equal(shell.geometry.isInstancedBufferGeometry, true);
  assert.equal(shell.geometry.instanceCount, 7);
  const layers = Array.from(shell.geometry.getAttribute("coatLayer").array);
  layers.forEach((layer, index) => assert.ok(Math.abs(layer - (index + 1) / 9) < 1e-6));
  assert.equal(shell.material.isMeshPhysicalMaterial, true);
  assert.ok(shell.material.alphaTest > 0);
  assert.equal(shell.material.transparent, false);
  assert.equal(shell.castShadow, false);

  const shader = {
    uniforms: {},
    vertexShader: "#include <common>\n#include <skinning_vertex>",
    fragmentShader: "#include <common>\n#include <alphatest_fragment>\n#include <opaque_fragment>"
  };
  shell.material.onBeforeCompile(shader);
  assert.match(shader.vertexShader, /attribute float coatLayer/);
  assert.match(shader.vertexShader, /coatTip/);
  assert.match(shader.fragmentShader, /animalCoatHash/);
  assert.match(shader.fragmentShader, /coatCoverage/);

  coat.update({ dt: 1 / 60, speed: 320 });
  const frozenAt = shell.material.userData.animalCoatUniforms.uCoatTime.value;
  coat.update({ dt: 1, speed: 700, paused: true });
  assert.equal(shell.material.userData.animalCoatUniforms.uCoatTime.value, frozenAt);
  assert.equal(coat.setQuality("high").shellCount, 9);
  assert.equal(shell.geometry.instanceCount, 9);
  coat.setQuality("low");
  assert.equal(shell.geometry.instanceCount, 0);

  coat.dispose();
  coat.dispose();
  assert.equal(source.children.includes(shell), false);
  assert.equal(coat.disposed, true);
  sourceGeometry.dispose();
  sourceMaterial.dispose();
});

test("skinned coat shells share the source skeleton without cloning bones", () => {
  const geometry = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
  const vertices = geometry.attributes.position.count;
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(new Uint16Array(vertices * 4), 4));
  const weights = new Float32Array(vertices * 4);
  for (let index = 0; index < vertices; index++) weights[index * 4] = 1;
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weights, 4));

  const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
  material.name = "furWhite";
  const source = new THREE.SkinnedMesh(geometry, material);
  source.name = "skinned-body";
  const bone = new THREE.Bone();
  source.add(bone);
  source.bind(new THREE.Skeleton([bone]));
  const model = new THREE.Group();
  model.add(source);

  const coat = attachAnimalCoat({ species: "panda", model, meshes: source });
  const shell = coat.shells[0];
  assert.equal(shell.isSkinnedMesh, true);
  assert.equal(shell.skeleton, source.skeleton);
  assert.equal(shell.parent, source);
  assert.equal(shell.children.length, 0);
  assert.deepEqual(shell.bindMatrix.elements, source.bindMatrix.elements);
  assert.deepEqual(shell.bindMatrixInverse.elements, source.bindMatrixInverse.elements);

  coat.dispose();
  geometry.dispose();
  material.dispose();
});

test("zero-shell animals leave the model hierarchy untouched", () => {
  const model = new THREE.Group();
  const geometry = new THREE.SphereGeometry(1, 6, 4);
  const material = new THREE.MeshStandardMaterial();
  const source = new THREE.Mesh(geometry, material);
  model.add(source);
  const childCount = source.children.length;

  const coat = attachAnimalCoat({ species: "elephant", model, quality: "high" });
  assert.deepEqual(coat.shells, []);
  assert.equal(source.children.length, childCount);
  assert.doesNotThrow(() => coat.update({ dt: 1 / 60, speed: 500 }));
  coat.dispose();
  geometry.dispose();
  material.dispose();
});
