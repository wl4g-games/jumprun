import test from "node:test";
import assert from "node:assert/strict";
import { OBSTACLE_SPECIES } from "../src/obstacle-catalog.js";
import { createObstacleModel, OBSTACLE_MORPHOLOGY } from "../src/obstacle-model.js";

const BEAST_IDS = OBSTACLE_SPECIES.map(({ id }) => id).filter((id) => id !== "cactus");

function dispose(model) {
  model.traverse((node) => {
    node.geometry?.dispose();
    if (Array.isArray(node.material)) node.material.forEach((item) => item.dispose());
    else node.material?.dispose();
  });
}

test("every beast has species-specific anatomical proportions", () => {
  assert.deepEqual(Object.keys(OBSTACLE_MORPHOLOGY), BEAST_IDS);
  const silhouettes = new Set();
  for (const species of BEAST_IDS) {
    const profile = OBSTACLE_MORPHOLOGY[species];
    assert.ok(profile.chest[3] > profile.waist[4], `${species} needs a readable ribcage`);
    assert.ok(profile.pelvis[3] > 0.2, `${species} needs a load-bearing pelvis`);
    assert.ok(profile.legs.upperRadius > profile.legs.lowerRadius, `${species} legs should taper anatomically`);
    assert.ok(profile.legs.paw[0] > profile.legs.lowerRadius, `${species} needs grounded feet`);
    assert.ok(profile.tail.segments >= 6, `${species} tail should articulate rather than pivot as one cone`);
    assert.ok(profile.posture, `${species} needs an independent resting posture`);
    silhouettes.add([profile.chest[3], profile.chest[4], profile.legs.upperRadius, profile.tail.length, profile.tail.radius].join(":"));
  }
  assert.equal(silhouettes.size, BEAST_IDS.length, "species must not share one generic quadruped silhouette");
});

test("tiger keeps a muscular tail, shoulders, haunches and paws", () => {
  const tiger = OBSTACLE_MORPHOLOGY.tiger;
  assert.ok(tiger.tail.radius >= 0.115, "tiger tail base must not look wire-thin");
  assert.ok(tiger.tail.segments >= 10, "tiger tail needs a smooth articulated curve");
  assert.ok(tiger.tail.taper >= 0.4 && tiger.tail.taper <= 0.48, "tiger tail should taper naturally rather than remain a pipe");
  assert.ok(tiger.tail.radius / tiger.chest[5] >= 0.4, "tail thickness must stay proportional to torso depth");
  assert.ok(tiger.legs.upperRadius >= 0.09, "tiger thighs and shoulders must look powerful");
  assert.ok(tiger.legs.paw[0] >= 0.14, "tiger paws must be broader than canine paws");

  const model = createObstacleModel({ species: "tiger", kind: "regular", width: 88, height: 88, variant: 0.5 });
  const tailSegments = [];
  model.traverse((node) => {
    if (node.name.startsWith("tail-segment-")) tailSegments.push(node);
  });
  assert.equal(tailSegments.length, tiger.tail.segments);
  assert.ok(Math.min(...tailSegments.map((node) => node.userData.radius)) >= tiger.tail.radius * tiger.tail.taper);
  assert.ok(model.getObjectByName("tail-base-muscle"), "tail root should blend into the pelvis");
  assert.ok(model.getObjectByName("ribcage"));
  assert.ok(model.getObjectByName("pelvis"));
  assert.ok(model.getObjectByName("leg-hind-near-muscle"));
  const fittedVisual = model.children[0];
  assert.ok(fittedVisual.scale.x / fittedVisual.scale.y >= 0.45, "narrow cactus hit boxes must not flatten tiger anatomy");
  dispose(model);
});

test("beast surfaces and limbs avoid glossy toy construction", () => {
  for (const species of BEAST_IDS) {
    const model = createObstacleModel({ species, kind: "regular", width: 80, height: 92, variant: 0.5 });
    const upper = model.getObjectByName("leg-front-near-upper");
    const lower = model.getObjectByName("leg-front-near-lower");
    const paw = model.getObjectByName("leg-front-near-paw");
    const eye = model.getObjectByName("eye-mask");
    assert.ok(upper.userData.startRadius > upper.userData.endRadius, `${species} upper limb should taper`);
    assert.ok(lower.userData.startRadius > lower.userData.endRadius, `${species} lower limb should taper`);
    assert.ok(paw.scale.y / paw.scale.x >= 0.35, `${species} paw should not be a flat saucer`);
    assert.ok(eye.scale.x <= 0.042 && eye.scale.y <= 0.034, `${species} eyes should not be cartoon-sized`);
    assert.ok(model.getObjectByName("ribcage").material.roughness >= 0.94, `${species} coat should remain matte`);
    assert.equal(model.getObjectByName("ribcage").material.clearcoat, 0, `${species} coat should not look varnished`);
    dispose(model);
  }
});

test("beast gait articulates knees, grounded paws and the full tail chain", () => {
  const model = createObstacleModel({ species: "leopard", kind: "regular", width: 80, height: 92, variant: 0.37 });
  const hip = model.getObjectByName("leg-front-near");
  const knee = model.getObjectByName("leg-front-near-knee");
  const paw = model.getObjectByName("leg-front-near-paw-pivot");
  const tailRoot = model.getObjectByName("tail-joint-0");
  const tailTip = model.getObjectByName(`tail-joint-${OBSTACLE_MORPHOLOGY.leopard.tail.segments - 1}`);
  assert.ok(hip && knee && paw && tailRoot && tailTip);

  model.userData.animate(0, 360);
  const before = [hip.rotation.z, knee.rotation.z, paw.rotation.z, tailRoot.rotation.y, tailTip.rotation.y, tailTip.rotation.z];
  model.userData.animate(0.31, 360);
  const after = [hip.rotation.z, knee.rotation.z, paw.rotation.z, tailRoot.rotation.y, tailTip.rotation.y, tailTip.rotation.z];
  after.forEach((value, index) => assert.notEqual(value, before[index], `joint ${index} should animate`));
  assert.notEqual(tailRoot.rotation.y, tailTip.rotation.y, "tail segments need a travelling wave");
  dispose(model);
});
