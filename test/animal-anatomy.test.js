import assert from "node:assert/strict";
import test from "node:test";
import { reshapeAnimalGeometry } from "../src/animal-anatomy.js";
import * as THREE from "../src/vendor/three.module.min.js";

const bounds = new THREE.Box3(new THREE.Vector3(-1, 0, -2), new THREE.Vector3(1, 2, 2));

function geometryAt(x, y, z) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    x, y, z,
    x + 0.006, y + 0.004, z + 0.005,
    x - 0.005, y - 0.003, z - 0.004
  ], 3));
  return geometry;
}

function profile(limb) {
  return {
    body: { chestMass: 1, abdomenMass: 1, pelvisMass: 1, depthScale: 1, shoulderAt: 0.7, pelvisAt: 0.35 },
    limbs: { fore: limb, hind: limb },
    head: { scale: { width: 1, height: 1, length: 1 } },
    tail: { rootRadius: 1, midRadius: 1, tipRadius: 1 },
    posture: { pelvisHeight: 0.5, chestHeight: 0.5, centerOfMass: 0.5, groundClearance: 0.15 }
  };
}

function reshape(geometry, limb) {
  return reshapeAnimalGeometry(geometry, {
    bounds,
    anchors: [new THREE.Vector2(0, 0)],
    profile: profile(limb),
    species: "trex",
    legCount: 2,
    hipY: 1,
    headStart: 1.5,
    tailEnd: -1.5
  });
}

test("anatomy correction actually thickens a proximal limb", () => {
  const geometry = reshape(geometryAt(0.1, 0.62, 0), {
    proximalRadius: 2,
    distalRadius: 2,
    footScale: { width: 1, height: 1, length: 1 },
    stanceWidth: 1
  });
  assert.ok(geometry.attributes.position.getX(0) > 0.18);
  geometry.dispose();
});

test("foot width and length survive the final limb transform", () => {
  const geometry = reshape(geometryAt(0.1, 0.05, 0.1), {
    proximalRadius: 1,
    distalRadius: 1,
    footScale: { width: 1.5, height: 1, length: 1.8 },
    stanceWidth: 1
  });
  assert.ok(geometry.attributes.position.getX(0) > 0.14);
  assert.ok(geometry.attributes.position.getZ(0) > 0.16);
  geometry.dispose();
});

test("tail straightening follows one shared anatomical centerline", () => {
  const curvedAxis = (t) => 0.8 + Math.sin(t * Math.PI) * 0.4;
  const makeTail = (straighten) => {
    const geometry = geometryAt(0.05, curvedAxis(0.5), -1.75);
    const animalProfile = profile({
      proximalRadius: 1,
      distalRadius: 1,
      footScale: { width: 1, height: 1, length: 1 },
      stanceWidth: 1
    });
    animalProfile.tail.straighten = straighten;
    return reshapeAnimalGeometry(geometry, {
      bounds,
      anchors: [new THREE.Vector2(0, 0)],
      profile: animalProfile,
      species: "trex",
      legCount: 2,
      hipY: 1,
      headStart: 1.5,
      tailEnd: -1.5,
      tailCenterline: curvedAxis
    });
  };

  const curved = makeTail(0);
  const straight = makeTail(1);
  assert.ok(straight.attributes.position.getY(0) < curved.attributes.position.getY(0) - 0.25);
  curved.dispose();
  straight.dispose();
});
