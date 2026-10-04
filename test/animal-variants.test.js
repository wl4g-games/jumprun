import assert from "node:assert/strict";
import test from "node:test";
import { attachAnimalAccents } from "../src/animal-accents.js";
import { ANIMAL_ASSETS } from "../src/animal-assets.js";
import { disposeObject3D } from "../src/animal-model.js";
import * as THREE from "../src/vendor/three.module.min.js";

test("cinematic variants share only their intended legal source meshes", () => {
  assert.equal(ANIMAL_ASSETS.godzilla.file, ANIMAL_ASSETS.trex.file);
  assert.notEqual(ANIMAL_ASSETS.godzilla.morphology, ANIMAL_ASSETS.trex.morphology);
  assert.equal(ANIMAL_ASSETS.godzilla.accents, "dorsal-plates");

  assert.equal(ANIMAL_ASSETS.scar.file, ANIMAL_ASSETS.monkey.file);
  assert.notEqual(ANIMAL_ASSETS.scar.morphology, ANIMAL_ASSETS.monkey.morphology);
  assert.equal(ANIMAL_ASSETS.scar.gait, "primate");
  assert.equal(ANIMAL_ASSETS.scar.rig.hasTail, false);
  assert.equal(ANIMAL_ASSETS.scar.accents, "eye-scar");

  assert.notEqual(ANIMAL_ASSETS.kong.file, ANIMAL_ASSETS.monkey.file);
  assert.equal(ANIMAL_ASSETS.kong.rig.hasTail, false);
  assert.equal(ANIMAL_ASSETS.kong.gait, "primate");
});

test("eagle rig keeps two planted feet, folded wing bones and feather wind", () => {
  const eagle = ANIMAL_ASSETS.eagle;
  assert.equal(eagle.rig.legs, 2);
  assert.equal(eagle.rig.upright, true);
  assert.equal(eagle.rig.hasTail, false);
  assert.equal(eagle.rig.appendages, "wings-folded");
  assert.ok(eagle.coat.shells >= 3);
  assert.ok(eagle.coat.wind > 0.5);
});

test("every hair or feather coat has wind while bare species stay physically bare", () => {
  const movingCoats = [
    "leopard", "rabbit", "lion", "giraffe", "panda", "fox", "monkey",
    "penguin", "tiger", "eagle", "boar", "kong", "scar"
  ];
  for (const id of movingCoats) {
    assert.ok(ANIMAL_ASSETS[id].coat.shells > 0, `${id} coat shells`);
    assert.ok(ANIMAL_ASSETS[id].coat.wind > 0, `${id} coat wind`);
  }
  for (const id of ["trex", "elephant", "godzilla"]) {
    assert.equal(ANIMAL_ASSETS[id].coat.shells, 0, `${id} should not grow artificial fur`);
  }
});

test("character accents are compact and follow generated bones", () => {
  const rootBone = new THREE.Bone();
  const head = new THREE.Bone();
  rootBone.add(head);
  const data = {
    rootBone,
    head,
    size: new THREE.Vector3(1, 2, 3),
    center: new THREE.Vector3(0, 1, 0),
    floor: 0
  };

  const dorsal = attachAnimalAccents("dorsal-plates", data);
  assert.doesNotThrow(() => dorsal.update({ elapsed: 1.2, wind: 0.8 }));
  let plates = 0;
  rootBone.traverse((node) => {
    if (node.isInstancedMesh && node.name === "godzilla-dorsal-plates") plates += node.count;
  });
  assert.equal(plates, 18);

  const scar = attachAnimalAccents("eye-scar", data);
  assert.doesNotThrow(() => scar.update({ elapsed: 1.2, wind: 0.8 }));
  const scarGroup = head.getObjectByName("scar-king-eye-scar");
  assert.ok(scarGroup);
  assert.equal(scarGroup.children.length, 3);

  disposeObject3D(rootBone);
});
