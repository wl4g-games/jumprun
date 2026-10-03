import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { ANIMALS, DEFAULT_ANIMAL_ID } from "../src/animal-catalog.js";
import { createAnimalModel, disposeObject3D } from "../src/animal-model.js";
import { OBSTACLE_SPECIES, obstacleSpecies } from "../src/obstacle-catalog.js";
import { createObstacleModel } from "../src/obstacle-model.js";
import { DEFAULT_KID_LOCK_SETTINGS, KidLockTimer, normalizeKidLockSettings } from "../src/kid-lock.js";
import { QUESTION_BANK, QUESTION_SUBJECTS } from "../src/question-bank.js";
import { createQuizSession } from "../src/quiz-session.js";
import { validateModel } from "../src/jump-features.js";

test("local MediaPipe and trained MLP artifacts are present and compatible", async () => {
  const modelUrl = new URL("../public/models/jump-visible-mlp.json", import.meta.url);
  const poseUrl = new URL("../public/models/pose_landmarker_lite.task", import.meta.url);
  const wasmUrl = new URL("../public/vendor/mediapipe/wasm/vision_wasm_internal.wasm", import.meta.url);
  const model = JSON.parse(await readFile(modelUrl, "utf8"));
  assert.equal(validateModel(model), model);
  assert.ok((await stat(poseUrl)).size > 5_000_000);
  assert.ok((await stat(wasmUrl)).size > 1_000_000);
});

test("the selectable roster has ten unique animals and defaults to T. rex", () => {
  assert.equal(ANIMALS.length, 10);
  assert.equal(DEFAULT_ANIMAL_ID, "trex");
  assert.equal(new Set(ANIMALS.map(({ id }) => id)).size, 10);
  assert.equal(ANIMALS[0].name, "霸王龙");
});

test("every selectable animal creates a renderable model", () => {
  for (const animal of ANIMALS) {
    const runner = createAnimalModel(animal.id);
    let meshes = 0;
    runner.root.traverse((node) => {
      if (node.isMesh) meshes++;
    });
    assert.ok(meshes >= 8, `${animal.id} should have enough visible parts`);
    assert.equal(runner.animal.id, animal.id);
    disposeObject3D(runner.root);
  }
});

test("obstacles progress from cacti to wild and mythical creatures", () => {
  assert.equal(obstacleSpecies(0, 0, () => 0.99), "cactus");
  assert.notEqual(obstacleSpecies(8, 8, () => 0.99), "cactus");
  assert.equal(obstacleSpecies(25, 10, () => 0), "qilin");
  assert.ok(OBSTACLE_SPECIES.some(({ id }) => id === "tiger"));
  assert.ok(OBSTACLE_SPECIES.some(({ id }) => id === "taotie"));
});

test("every obstacle species creates a visible model", () => {
  for (const obstacle of OBSTACLE_SPECIES) {
    const model = createObstacleModel({ species: obstacle.id, kind: "regular", width: 38, height: 88, variant: 0.5 });
    let meshes = 0;
    model.traverse((node) => {
      if (node.isMesh) meshes++;
    });
    assert.ok(meshes > 0, `${obstacle.id} should render at least one mesh`);
    disposeObject3D(model);
  }
});

test("question bank contains 100 well-formed, balanced questions", () => {
  assert.equal(QUESTION_BANK.length, 100);
  assert.equal(new Set(QUESTION_BANK.map(({ id }) => id)).size, 100);
  assert.equal(new Set(QUESTION_BANK.map(({ prompt }) => prompt)).size, 100);
  for (const subject of QUESTION_SUBJECTS) {
    assert.equal(QUESTION_BANK.filter((item) => item.subject === subject).length, 20);
  }
  for (const item of QUESTION_BANK) {
    assert.equal(item.options.length, 4, item.id);
    assert.ok(Number.isInteger(item.answer) && item.answer >= 0 && item.answer < item.options.length, item.id);
    assert.ok(item.explanation.length >= 12, item.id);
  }
});

test("quiz session counts only correct answers and unlocks at the configured goal", () => {
  const session = createQuizSession(2, () => 0.42);
  const first = session.current();
  const wrongChoice = (first.answer + 1) % first.options.length;
  assert.equal(session.answer(wrongChoice).correct, 0);
  session.next();
  assert.equal(session.answer(session.current().answer).correct, 1);
  session.next();
  const result = session.answer(session.current().answer);
  assert.equal(result.correct, 2);
  assert.equal(result.completed, true);
});

test("study lock defaults to ten minutes and resets after a quiz", () => {
  assert.deepEqual(normalizeKidLockSettings(), DEFAULT_KID_LOCK_SETTINGS);
  const timer = new KidLockTimer({ enabled: true, durationMinutes: 10, questionsToUnlock: 3 });
  assert.equal(timer.tick(599, true), false);
  assert.equal(timer.tick(1, true), true);
  assert.equal(timer.locked, true);
  timer.unlock();
  assert.equal(timer.locked, false);
  assert.equal(timer.remainingSeconds, 600);
  assert.equal(timer.settings.questionsToUnlock, 3);
});
