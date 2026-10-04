import test from "node:test";
import assert from "node:assert/strict";
import { ANIMAL_ASSETS } from "../src/animal-assets.js";
import { animalGaitMetrics, animateAnimalGait } from "../src/animal-gait.js";
import { animalMorphology } from "../src/animal-morphology.js";

function joint() {
  return { rotation: { x: 0, y: 0, z: 0 } };
}

function leg(side, role, rest = {}) {
  return {
    side,
    role,
    axis: "x",
    bend: role === "hind" ? -1 : 1,
    hip: joint(),
    knee: joint(),
    ankle: joint(),
    foot: joint(),
    rest: { hip: 0, knee: 0, ankle: 0, foot: 0, ...rest }
  };
}

function rig(species, gait, legs = 4) {
  const settings = ANIMAL_ASSETS[species]?.rig || {};
  const rest = {
    hip: settings.restHip || 0,
    knee: settings.restKnee || 0,
    ankle: settings.restAnkle || 0,
    foot: settings.restFoot || 0
  };
  const groundLimbs = legs === 2
    ? [leg("near", "hind", rest), leg("far", "hind", rest)]
    : [leg("near", "hind", rest), leg("far", "hind", rest), leg("near", "fore", rest), leg("far", "fore", rest)];
  return {
    species,
    gait,
    legs: groundLimbs,
    headPivot: joint(),
    headAxis: "x",
    headRestZ: 0,
    bodyJoints: [
      { joint: joint(), role: "pelvis", axis: "x", rest: 0 },
      { joint: joint(), role: "spine", axis: "x", rest: 0 },
      { joint: joint(), role: "chest", axis: "x", rest: 0 }
    ]
  };
}

function tailRig(species, gait, tailStiffness) {
  const subject = rig(species, gait);
  subject.profile = {
    tailStiffness,
    tailSwing: 0.2,
    tailBounce: 0.08,
    tailLift: 0
  };
  subject.tailJoints = Array.from({ length: 3 }, () => ({
    joint: joint(),
    axis: "x",
    restZ: 0,
    restY: 0
  }));
  return subject;
}

function sampleMaximums(subject, strideLength, frames = 80) {
  const maximums = { hip: 0, knee: 0, ankle: 0, foot: 0 };
  for (let index = 0; index < frames; index++) {
    animateAnimalGait(subject, {
      distance: strideLength * index / frames,
      elapsed: index / 60,
      running: true,
      airborne: false
    });
    for (const limb of subject.legs) {
      for (const name of Object.keys(maximums)) {
        maximums[name] = Math.max(maximums[name], Math.abs(limb[name].rotation.x - limb.rest[name]));
      }
    }
  }
  return maximums;
}

test("T. rex runs with alternating power strokes and an assertive forward posture", () => {
  const subject = rig("trex", "biped", 2);
  const pose = animateAnimalGait(subject, {
    distance: 170 * 0.17,
    elapsed: 0.2,
    running: true,
    airborne: false
  });
  const [near, far] = subject.legs;
  assert.ok(
    pose.pitch < animalMorphology("trex").posture.torsoPitch,
    "running should lower the static forward posture rather than rocking upright like a person"
  );
  assert.ok(near.hip.rotation.x < 0 && far.hip.rotation.x > 0, "legs should oppose each other");
  const nearFlex = Math.abs(near.knee.rotation.x - near.rest.knee);
  const farFlex = Math.abs(far.knee.rotation.x - far.rest.knee);
  assert.ok(farFlex > nearFlex * 5, "only the swinging leg should flex deeply");
  assert.ok(near.knee.rotation.x > 0.3, "the supporting leg should retain its extended rest silhouette");

  const maximums = sampleMaximums(subject, 170);
  assert.ok(maximums.hip >= 0.4 && maximums.hip <= 0.43, "stride should be long but not rubbery");
  assert.ok(maximums.knee < 0.3, "knees should not curl into the old hunched pose");
});

test("biped rest extension keeps T. rex and Godzilla powerful without freezing the swing leg", () => {
  const cases = [
    { id: "trex", restKnee: 0.34, minimumSwing: 0.24 },
    { id: "godzilla", restKnee: 0.36, minimumSwing: 0.15 }
  ];

  for (const expected of cases) {
    assert.equal(ANIMAL_ASSETS[expected.id].rig.restKnee, expected.restKnee, `${expected.id} asset rest`);
    assert.ok(Object.isFrozen(ANIMAL_ASSETS[expected.id].rig), `${expected.id} rig contract should be immutable`);
    const subject = rig(expected.id, "biped", 2);
    animateAnimalGait(subject, { running: false, airborne: false });
    assert.ok(subject.legs.every(({ knee }) => knee.rotation.x === expected.restKnee), `${expected.id} idle extension`);

    const stride = animalGaitMetrics(subject).strideLength;
    animateAnimalGait(subject, { distance: stride * 0.25, running: true, airborne: false });
    const kneeFlex = subject.legs.map((limb) => Math.abs(limb.knee.rotation.x - limb.rest.knee));
    assert.ok(Math.min(...kneeFlex) < 0.03, `${expected.id} supporting leg stays nearly straight`);
    assert.ok(Math.max(...kneeFlex) > expected.minimumSwing, `${expected.id} swing leg still clears the ground`);

    animateAnimalGait(subject, { distance: stride * 0.18, running: true, airborne: false });
    const early = subject.legs.map(({ hip }) => hip.rotation.x);
    animateAnimalGait(subject, { distance: stride * 0.43, running: true, airborne: false });
    const late = subject.legs.map(({ hip }) => hip.rotation.x);
    const silhouetteChange = early.reduce((total, value, index) => total + Math.abs(value - late[index]), 0);
    assert.ok(silhouetteChange > 0.7, `${expected.id} stride phases need clearly different silhouettes`);
  }

  const trex = rig("trex", "biped", 2);
  const godzilla = rig("godzilla", "biped", 2);
  const trexMaximums = sampleMaximums(trex, animalGaitMetrics(trex).strideLength);
  const godzillaMaximums = sampleMaximums(godzilla, animalGaitMetrics(godzilla).strideLength);
  assert.ok(godzillaMaximums.hip < trexMaximums.hip, "Godzilla should take steadier hip strokes than T. rex");
  assert.ok(godzillaMaximums.knee < trexMaximums.knee, "Godzilla should lift its mass with a restrained knee stroke");
  assert.ok(animalGaitMetrics(godzilla).strideLength > animalGaitMetrics(trex).strideLength, "Godzilla should cover ground in slower, longer strides");
});

test("feline gallop is a four-beat hind-to-fore sequence, not a mirrored trot", () => {
  const subject = rig("leopard", "feline");
  const stride = 142;
  const contacts = [0.09, 0, 0.55, 0.45];
  for (let index = 0; index < contacts.length; index++) {
    animateAnimalGait(subject, {
      distance: stride * contacts[index],
      running: true,
      airborne: false
    });
    assert.ok(subject.legs[index].hip.rotation.x < -0.18, `limb ${index} should reach forward at contact`);
  }
  animateAnimalGait(subject, { distance: stride * 0.17, running: true, airborne: false });
  assert.notEqual(subject.legs[0].hip.rotation.x, subject.legs[1].hip.rotation.x);
  assert.notEqual(subject.legs[2].hip.rotation.x, subject.legs[3].hip.rotation.x);
});

test("rabbit bounds in paired groups while retaining a slight natural lead", () => {
  const subject = rig("rabbit", "rabbit");
  animateAnimalGait(subject, { distance: 0, running: true, airborne: false });
  const [nearHind, farHind, nearFore, farFore] = subject.legs;
  assert.ok(Math.abs(nearHind.hip.rotation.x - farHind.hip.rotation.x) < 0.08);
  assert.ok(Math.abs(nearFore.hip.rotation.x - farFore.hip.rotation.x) < 0.08);
  assert.ok(Math.abs(nearHind.hip.rotation.x - nearFore.hip.rotation.x) > 0.12);

  animateAnimalGait(subject, { airborne: true, verticalVelocity: 0 });
  assert.ok(Math.abs(nearHind.knee.rotation.x) > Math.abs(nearFore.knee.rotation.x) * 2);
});

test("elephant walk keeps weight-bearing legs columnar and never uses a tuck jump", () => {
  const subject = rig("elephant", "elephant");
  const maximums = sampleMaximums(subject, 205);
  assert.ok(maximums.hip <= 0.165);
  assert.ok(maximums.knee < 0.05);
  assert.ok(maximums.ankle < 0.035);

  animateAnimalGait(subject, { airborne: true, verticalVelocity: 0 });
  assert.ok(subject.legs.every(({ knee }) => Math.abs(knee.rotation.x) < 0.04));
});

test("generated spine poses are absolute and reset cleanly when running stops", () => {
  const subject = rig("fox", "canid");
  const frame = { distance: 31, elapsed: 1, running: true, airborne: false };
  animateAnimalGait(subject, frame);
  const first = subject.bodyJoints.map(({ joint: item }) => item.rotation.x);
  assert.ok(first.some((value) => Math.abs(value) > 0.005));

  animateAnimalGait(subject, frame);
  assert.deepEqual(subject.bodyJoints.map(({ joint: item }) => item.rotation.x), first);
  animateAnimalGait(subject, { distance: 31, elapsed: 1.1, running: false, airborne: false });
  assert.deepEqual(subject.bodyJoints.map(({ joint: item }) => item.rotation.x), [0, 0, 0]);
});

test("idle, first running frame and jump apex share each species static posture", () => {
  const species = [
    ["trex", "biped", 2],
    ["leopard", "feline", 4],
    ["rabbit", "rabbit", 4],
    ["lion", "feline", 4],
    ["elephant", "elephant", 4],
    ["giraffe", "giraffe", 4],
    ["panda", "bear", 4],
    ["fox", "canid", 4],
    ["monkey", "primate", 4],
    ["penguin", "penguin", 2],
    ["tiger", "feline", 4],
    ["eagle", "eagle", 2],
    ["boar", "bear", 4],
    ["godzilla", "biped", 2],
    ["kong", "primate", 4],
    ["scar", "primate", 4]
  ];
  for (const [id, gait, legs] of species) {
    const subject = rig(id, gait, legs);
    const expected = animalMorphology(id).posture.torsoPitch;
    const idle = animateAnimalGait(subject, { distance: 0, running: false, airborne: false });
    const start = animateAnimalGait(subject, { distance: 0, running: true, airborne: false });
    const apex = animateAnimalGait(subject, { distance: 0, running: false, airborne: true, verticalVelocity: 0 });
    const reduced = animateAnimalGait(subject, { distance: 0, running: false, reducedMotion: true });
    assert.equal(idle.pitch, expected, `${id} idle`);
    assert.equal(start.pitch, expected, `${id} run boundary`);
    assert.equal(apex.pitch, expected, `${id} jump apex`);
    assert.equal(reduced.pitch, expected, `${id} reduced motion`);
    assert.equal(start.bob, idle.bob, `${id} vertical boundary`);
    assert.equal(start.roll, idle.roll, `${id} roll boundary`);
  }
});

test("tail phase remains continuous from ground to air and follows distance", () => {
  const subject = tailRig("fox", "canid", 0.2);
  animateAnimalGait(subject, { distance: 47, elapsed: 2, running: true, airborne: false });
  const grounded = subject.tailJoints.map(({ joint: item }) => [item.rotation.x, item.rotation.y]);
  animateAnimalGait(subject, { distance: 47, elapsed: 200, running: false, airborne: true, verticalVelocity: 430 });
  const airborne = subject.tailJoints.map(({ joint: item }) => [item.rotation.x, item.rotation.y]);
  assert.deepEqual(airborne, grounded);

  animateAnimalGait(subject, { distance: 58, elapsed: 200, running: false, airborne: true, verticalVelocity: 430 });
  assert.notDeepEqual(subject.tailJoints.map(({ joint: item }) => [item.rotation.x, item.rotation.y]), airborne);
});

test("tail stiffness limits dynamic sweep and idle-to-run phase starts continuously", () => {
  const flexible = tailRig("fox", "canid", 0);
  const stiff = tailRig("fox", "canid", 1);
  animateAnimalGait(flexible, { distance: 37, running: true });
  animateAnimalGait(stiff, { distance: 37, running: true });
  const flexibleSweep = Math.max(...flexible.tailJoints.map(({ joint: item }) => Math.abs(item.rotation.y)));
  const stiffSweep = Math.max(...stiff.tailJoints.map(({ joint: item }) => Math.abs(item.rotation.y)));
  assert.ok(stiffSweep < flexibleSweep * 0.25);

  const boundary = tailRig("fox", "canid", 0.4);
  animateAnimalGait(boundary, { distance: 0, elapsed: 42, running: false });
  const idle = boundary.tailJoints.map(({ joint: item }) => [item.rotation.x, item.rotation.y]);
  animateAnimalGait(boundary, { distance: 0, elapsed: 42, running: true });
  assert.deepEqual(boundary.tailJoints.map(({ joint: item }) => [item.rotation.x, item.rotation.y]), idle);
});

test("legacy procedural swing fields migrate to the conservative gait scale", () => {
  const regular = rig("trex", "biped", 2);
  const legacy = rig("trex", "biped", 2);
  legacy.profile = { hipSwing: 0.29, kneeLift: 0.41, ankleFlex: 0.17 };
  const regularMaximums = sampleMaximums(regular, 170);
  const legacyMaximums = sampleMaximums(legacy, 170);
  assert.ok(legacyMaximums.hip > regularMaximums.hip * 0.45 && legacyMaximums.hip < regularMaximums.hip * 0.55);
  assert.ok(legacyMaximums.knee < regularMaximums.knee * 0.65);
  assert.ok(legacyMaximums.ankle < regularMaximums.ankle * 0.65);
});

test("real leg reach selects grounded strides without turning heavy animals into rapid shuffles", () => {
  const cases = [
    { id: "trex", gait: "biped", legs: 2, reach: 0.726, minimum: 150, maximum: 175, coverage: 0.55 },
    { id: "elephant", gait: "elephant", legs: 4, reach: 0.55, minimum: 125, maximum: 150, coverage: 0.2 },
    { id: "giraffe", gait: "giraffe", legs: 4, reach: 0.51, minimum: 125, maximum: 145, coverage: 0.3 },
    { id: "panda", gait: "bear", legs: 4, reach: 0.52, minimum: 95, maximum: 115, coverage: 0.25 },
    { id: "penguin", gait: "penguin", legs: 2, reach: 0.25, minimum: 80, maximum: 100, coverage: 0.13 }
  ];
  for (const expected of cases) {
    const subject = rig(expected.id, expected.gait, expected.legs);
    for (const limb of subject.legs) limb.worldReach = expected.reach;
    const metrics = animalGaitMetrics(subject);
    assert.equal(metrics.measured, true, expected.id);
    assert.ok(metrics.strideLength >= expected.minimum && metrics.strideLength <= expected.maximum, `${expected.id} stride`);
    assert.ok(metrics.legs.every(({ coverageRatio }) => coverageRatio >= expected.coverage), `${expected.id} foot plant`);
  }
});

test("procedural fallback keeps its authored stride when world reach is unavailable", () => {
  const subject = rig("trex", "biped", 2);
  subject.profile = { strideLength: 144 };
  assert.deepEqual(animalGaitMetrics(subject), {
    gait: "biped",
    species: "trex",
    measured: false,
    fallbackStrideLength: 144,
    strideLength: 144,
    legs: []
  });
});

test("a tailless ape remains finite through idle, grounded run and jump poses", () => {
  const subject = rig("monkey", "primate");
  subject.tailJoints = [];
  const frames = [
    { distance: 0, elapsed: 0, running: false, airborne: false },
    { distance: 42, elapsed: 0.4, running: true, airborne: false },
    { distance: 42, elapsed: 0.55, running: false, airborne: true, verticalVelocity: 180 }
  ];
  for (const frame of frames) {
    const pose = animateAnimalGait(subject, frame);
    assert.ok([pose.bob, pose.pitch, pose.roll].every(Number.isFinite));
    for (const limb of subject.legs) {
      assert.ok([limb.hip, limb.knee, limb.ankle, limb.foot]
        .flatMap(({ rotation }) => [rotation.x, rotation.y, rotation.z])
        .every(Number.isFinite));
    }
  }
});
