import assert from "node:assert/strict";
import test from "node:test";
import { ANIMAL_ASSETS } from "../src/animal-assets.js";
import { ANIMALS } from "../src/animal-catalog.js";
import { ANIMAL_MORPHOLOGIES, animalMorphology } from "../src/animal-morphology.js";

const SCALE_KEYS = ["width", "height", "length"];

test("every runner exposes a complete immutable morphology profile", () => {
  assert.deepEqual(Object.keys(ANIMAL_MORPHOLOGIES), ANIMALS.map(({ id }) => id));

  for (const { id } of ANIMALS) {
    const morphology = animalMorphology(id);
    assert.equal(ANIMAL_ASSETS[id].morphology, morphology);
    assert.ok(Object.isFrozen(morphology), `${id} profile should be frozen`);
    assert.ok(Object.isFrozen(morphology.body), `${id} body should be frozen`);
    assert.ok(Object.isFrozen(morphology.limbs.fore), `${id} forelimbs should be frozen`);
    assert.ok(Object.isFrozen(morphology.limbs.hind), `${id} hindlimbs should be frozen`);
    assert.ok(Object.isFrozen(morphology.limbs.hind.footScale), `${id} foot scale should be frozen`);
    assert.ok(Object.isFrozen(morphology.head.scale), `${id} head scale should be frozen`);

    for (const role of ["fore", "hind"]) {
      const limbProfile = morphology.limbs[role];
      assert.ok(limbProfile.proximalRadius > 0, `${id} ${role} proximal radius`);
      assert.ok(limbProfile.distalRadius > 0, `${id} ${role} distal radius`);
      assert.ok(limbProfile.stanceWidth > 0, `${id} ${role} stance width`);
      for (const key of SCALE_KEYS) assert.ok(limbProfile.footScale[key] > 0, `${id} ${role} foot ${key}`);
    }

    assert.ok(morphology.body.pelvisAt < morphology.body.shoulderAt, `${id} longitudinal anchors`);
    assert.ok(morphology.tail.rootAt >= 0 && morphology.tail.rootAt <= 1, `${id} tail root`);
    if (morphology.tail.straighten !== undefined) {
      assert.ok(morphology.tail.straighten >= 0 && morphology.tail.straighten <= 1, `${id} tail straightening`);
    }
    assert.ok(morphology.posture.centerOfMass >= 0 && morphology.posture.centerOfMass <= 1, `${id} center of mass`);
    assert.ok(Number.isFinite(morphology.posture.torsoPitch), `${id} torso pitch`);
  }
});

test("unknown morphology ids safely use the default T. rex profile", () => {
  assert.equal(animalMorphology("not-a-species"), ANIMAL_MORPHOLOGIES.trex);
  assert.equal(animalMorphology(), ANIMAL_MORPHOLOGIES.trex);
});

test("signature species corrections encode believable mass and balance", () => {
  const trex = animalMorphology("trex");
  assert.ok(trex.limbs.hind.proximalRadius >= 1.5, "T. rex needs powerful thighs");
  assert.ok(trex.tail.rootRadius >= 1.5, "T. rex tail must counterbalance the torso");
  assert.ok(trex.tail.stiffness >= 0.8, "T. rex tail should not wag like a mammal");
  assert.ok(Math.abs(trex.posture.chestHeight - trex.posture.pelvisHeight) <= 0.02, "T. rex torso should stay horizontal");
  assert.ok(trex.posture.torsoPitch <= -5 * Math.PI / 180, "T. rex should carry its mass forward");

  const elephant = animalMorphology("elephant");
  assert.ok(elephant.limbs.fore.proximalRadius >= 1.5, "elephant forelegs need columnar mass");
  assert.ok(elephant.limbs.fore.distalRadius >= 1.45, "elephant legs should stay thick near the feet");
  assert.ok(elephant.body.chestMass >= 1.3, "elephant shoulder barrel needs sufficient volume");
  assert.ok(elephant.limbs.fore.footScale.width <= 1.2, "elephant feet should blend into columnar legs");

  for (const id of ["leopard", "lion"]) {
    const cat = animalMorphology(id);
    assert.ok(cat.body.chestMass >= 1.15, `${id} needs a powerful shoulder girdle`);
    assert.ok(cat.body.pelvisMass >= 1.15, `${id} needs strong hindquarters`);
    assert.ok(cat.tail.rootRadius >= 1.2, `${id} tail root should not look wiry`);
  }

  const scar = animalMorphology("scar");
  assert.ok(scar.limbs.fore.proximalRadius > scar.limbs.hind.proximalRadius, "Skar King needs long, load-bearing arms");
  assert.ok(scar.body.abdomenMass < scar.body.chestMass, "Skar King should stay lean through the waist");
});
