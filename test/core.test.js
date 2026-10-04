import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { ANIMALS, DEFAULT_ANIMAL_ID } from "../src/animal-catalog.js";
import { createAnimalModel, disposeObject3D } from "../src/animal-model.js";
import { OBSTACLE_SPECIES, obstacleSpecies } from "../src/obstacle-catalog.js";
import { createObstacleModel } from "../src/obstacle-model.js";
import { DEFAULT_MANUAL_MODE_SETTINGS, ManualQuizTimer, normalizeManualModeSettings } from "../src/manual-quiz-timer.js";
import {
  applyGameSettings,
  hasSavedGameSettings,
  loadGameSettings,
  mergeQuizPolicySettings,
  saveGameSettings
} from "../src/game-settings.js";
import { QUESTION_BANK, QUESTION_SUBJECTS, localizeQuestion } from "../src/question-bank.js";
import { ENGLISH_QUESTION_BANK } from "../src/question-bank.en.js";
import { createQuizSession } from "../src/quiz-session.js";
import { validateModel } from "../src/jump-features.js";
import { personReady } from "../src/person-ready.js";
import { createDinoGame } from "../src/dino-game.js";
import { ENGLISH_TRANSLATIONS } from "../src/i18n.js";
import { drawPoseOverlay } from "../src/pose-overlay.js";
import { animateAnimalGait } from "../src/animal-gait.js";
import { ANIMAL_AUDIO_PROFILES, GroundCallTimer } from "../src/animal-audio.js";

test("local MediaPipe and trained MLP artifacts are present and compatible", async () => {
  const modelUrl = new URL("../public/models/jump-visible-mlp.json", import.meta.url);
  const poseUrl = new URL("../public/models/pose_landmarker_lite.task", import.meta.url);
  const wasmUrl = new URL("../public/vendor/mediapipe/wasm/vision_wasm_internal.wasm", import.meta.url);
  const model = JSON.parse(await readFile(modelUrl, "utf8"));
  assert.equal(validateModel(model), model);
  assert.ok((await stat(poseUrl)).size > 5_000_000);
  assert.ok((await stat(wasmUrl)).size > 1_000_000);
});

test("the selectable roster has sixteen unique animals and defaults to T. rex", () => {
  assert.equal(ANIMALS.length, 16);
  assert.equal(DEFAULT_ANIMAL_ID, "trex");
  assert.equal(new Set(ANIMALS.map(({ id }) => id)).size, 16);
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

test("animal rigs use the correct number of articulated ground limbs", () => {
  const expectedLegs = { trex: 2, penguin: 2, eagle: 2, godzilla: 2 };
  for (const animal of ANIMALS) {
    const runner = createAnimalModel(animal.id);
    const count = expectedLegs[animal.id] || 4;
    assert.equal(runner.rig.legs.length, count, animal.id);
    for (const leg of runner.rig.legs) {
      assert.ok(leg.hip && leg.knee && leg.ankle && leg.foot, `${animal.id}/${leg.id}`);
      assert.ok(leg.upperLength > 0 && leg.lowerLength > 0, `${animal.id}/${leg.id}`);
      assert.ok(Object.values(leg.rest).every(Number.isFinite), `${animal.id}/${leg.id}`);
    }
    disposeObject3D(runner.root);
  }
});

test("every species gait moves joints on land and changes to an airborne pose", () => {
  for (const animal of ANIMALS) {
    const runner = createAnimalModel(animal.id);
    const angles = () => runner.rig.legs.flatMap(({ hip, knee, ankle, foot }) => [
      hip.rotation.z,
      knee.rotation.z,
      ankle.rotation.z,
      foot.rotation.z
    ]);
    const rest = angles();
    const groundPose = animateAnimalGait(runner.rig, {
      distance: 53,
      elapsed: 1,
      running: true,
      airborne: false,
      verticalVelocity: 0
    });
    const running = angles();
    assert.ok(running.some((value, index) => Math.abs(value - rest[index]) > 1e-3), `${animal.id} run`);
    assert.ok(Object.values(groundPose).every(Number.isFinite), `${animal.id} body pose`);
    animateAnimalGait(runner.rig, {
      distance: 53,
      elapsed: 1.2,
      running: false,
      airborne: true,
      verticalVelocity: 320
    });
    const airborne = angles();
    assert.ok(airborne.some((value, index) => Math.abs(value - running[index]) > 1e-3), `${animal.id} jump`);
    disposeObject3D(runner.root);
  }
});

test("animal calls and unique failure motifs cover the complete roster", async () => {
  assert.deepEqual(Object.keys(ANIMAL_AUDIO_PROFILES), ANIMALS.map(({ id }) => id));
  const motifs = new Set();
  for (const animal of ANIMALS) {
    const profile = ANIMAL_AUDIO_PROFILES[animal.id];
    const audioFile = new URL(`../public/${profile.file}`, import.meta.url);
    const info = await stat(audioFile);
    assert.ok(info.size > 1_000 && info.size < 250 * 1024, animal.id);
    assert.ok(profile.start >= 0 && profile.duration >= 0.5 && profile.duration <= 1, animal.id);
    assert.ok(profile.gain > 0 && profile.gain <= 0.5, animal.id);
    assert.ok(profile.failure.length >= 3, animal.id);
    motifs.add(JSON.stringify(profile.failure));
  }
  assert.equal(motifs.size, ANIMALS.length);
});

test("ground calls count only active running time and never burst after a stall", () => {
  const timer = new GroundCallTimer();
  for (let index = 0; index < 49; index++) assert.equal(timer.tick(0.1, true), false);
  assert.equal(timer.tick(0.1, false), false);
  assert.equal(timer.tick(0.1, true), true);
  timer.reset();
  assert.equal(timer.tick(30, true), false);
  for (let index = 0; index < 18; index++) assert.equal(timer.tick(0.25, true), false);
  assert.equal(timer.tick(0.25, true), true);
  assert.equal(timer.tick(0.25, true), false);
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
  const expectedCounts = { "语文": 16, "数学": 13, "英语": 6, "地理": 13, "物理": 13, "中国历史": 16, "世界历史": 13, "金融": 10 };
  assert.deepEqual(Object.fromEntries(QUESTION_SUBJECTS.map((subject) => [
    subject,
    QUESTION_BANK.filter((item) => item.subject === subject).length
  ])), expectedCounts);
  for (const item of QUESTION_BANK) {
    assert.equal(item.options.length, 4, item.id);
    assert.ok(Number.isInteger(item.answer) && item.answer >= 0 && item.answer < item.options.length, item.id);
    assert.ok(item.explanation.length >= 12, item.id);
  }
});

test("all 100 questions have complete English versions with shared answers", () => {
  assert.equal(ENGLISH_QUESTION_BANK.length, QUESTION_BANK.length);
  assert.deepEqual(ENGLISH_QUESTION_BANK.map(({ id }) => id), QUESTION_BANK.map(({ id }) => id));
  for (const item of QUESTION_BANK) {
    const english = localizeQuestion(item, "en");
    assert.equal(english.options.length, item.options.length, item.id);
    assert.doesNotMatch(`${english.subject}${english.prompt}${english.options.join("")}${english.explanation}`, /[\u3400-\u9fff]/u, item.id);
    assert.equal(localizeQuestion(item, "zh"), item);
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

test("manual controls default off with a three-minute, one-answer quiz", () => {
  assert.deepEqual(normalizeManualModeSettings(), DEFAULT_MANUAL_MODE_SETTINGS);
  assert.equal(new ManualQuizTimer().tick(3600, true), false);
  const timer = new ManualQuizTimer({ enabled: true, durationMinutes: 3, questionsToUnlock: 1 });
  assert.equal(timer.tick(179, true), false);
  assert.equal(timer.tick(1, true), true);
  assert.equal(timer.locked, true);
  timer.unlock();
  assert.equal(timer.locked, false);
  assert.equal(timer.remainingSeconds, 180);
  assert.equal(timer.settings.questionsToUnlock, 1);
});

test("ordinary setup keeps quiz rules behind the administrator gate", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /id="quiz-duration"|id="quiz-correct-count"/);
  assert.match(html, /id="admin-auth-panel"/);
  assert.match(html, /id="admin-settings-panel"[^>]*hidden/);
  assert.match(html, /id="admin-quiz-duration"/);
  assert.match(html, /id="admin-quiz-correct-count"/);
});

test("advanced rules persist without skipping the unfinished first setup", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const staged = applyGameSettings({
    animalId: "trex",
    manualMode: { enabled: false, durationMinutes: 10, questionsToUnlock: 3 }
  }, { persist: true, setupComplete: false, storage });
  assert.equal(hasSavedGameSettings(storage), false);
  assert.equal(staged.manualMode.durationMinutes, 10);
  assert.equal(staged.manualMode.questionsToUnlock, 3);
  assert.deepEqual(loadGameSettings(storage), staged);

  applyGameSettings(staged, { persist: true, setupComplete: true, storage });
  assert.equal(hasSavedGameSettings(storage), true);
  assert.deepEqual(loadGameSettings(storage), staged);
});

test("cross-tab sync merges only parent-managed quiz policy", () => {
  const current = {
    animalId: "lion",
    manualMode: { enabled: true, durationMinutes: 30, questionsToUnlock: 1 }
  };
  const remote = {
    animalId: "rabbit",
    manualMode: { enabled: false, durationMinutes: 1, questionsToUnlock: 3 }
  };
  assert.deepEqual(mergeQuizPolicySettings(current, remote), {
    animalId: "lion",
    manualMode: { enabled: true, durationMinutes: 1, questionsToUnlock: 3 }
  });
});

test("animal and manual quiz choices persist without reconfiguration", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  assert.equal(hasSavedGameSettings(storage), false);
  const saved = saveGameSettings({
    animalId: "leopard",
    manualMode: { enabled: true, durationMinutes: 15, questionsToUnlock: 3 }
  }, storage);
  assert.equal(hasSavedGameSettings(storage), true);
  assert.deepEqual(loadGameSettings(storage), saved);
});

test("legacy visitors keep their animal without being opted into manual controls", () => {
  const legacy = JSON.stringify({
    animalId: "rabbit",
    kidLock: { enabled: true, durationMinutes: 30, questionsToUnlock: 3 }
  });
  const storage = {
    getItem: (key) => key === "jump-run-settings-v1" ? legacy : null,
    setItem() {}
  };
  assert.equal(hasSavedGameSettings(storage), true);
  assert.deepEqual(loadGameSettings(storage), {
    animalId: "rabbit",
    manualMode: DEFAULT_MANUAL_MODE_SETTINGS
  });
});

test("motion readiness cannot bypass the camera while manual mode can", () => {
  const tracking = { tracked: true, ready: true };
  assert.equal(personReady("camera", false, tracking, 1000, 950), false);
  assert.equal(personReady("camera", true, tracking, 1000, 950), true);
  assert.equal(personReady("manual", false, {}, 1000, -Infinity), true);
});

test("camera UI requests one front-facing stream without enumerating lenses", async () => {
  const [main, html] = await Promise.all([
    readFile(new URL("../src/main.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8")
  ]);
  assert.match(main, /cameraConstraints\(\{ exact: "user" \}\)/);
  assert.match(main, /requestVideoFrameCallback/);
  assert.doesNotMatch(main, /enumerateDevices|device-select/);
  assert.doesNotMatch(html, /device-select/);
});

test("pose overlay draws mobile-visible landmarks and skeleton lines", () => {
  const calls = [];
  const context = new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      target[key] = (...args) => calls.push([key, ...args]);
      return target[key];
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    }
  });
  const canvas = { width: 0, height: 0, clientWidth: 100, hidden: true, getContext: () => context };
  const video = { videoWidth: 640, videoHeight: 480, clientWidth: 100 };
  const points = Array.from({ length: 25 }, () => null);
  points[11] = { x: 0.4, y: 0.4, visibility: 0.9 };
  points[12] = { x: 0.6, y: 0.4, visibility: 0.9 };
  assert.equal(drawPoseOverlay(canvas, video, points), 2);
  assert.equal(canvas.hidden, false);
  assert.ok(calls.some(([name]) => name === "lineTo"));
  assert.ok(calls.filter(([name]) => name === "arc").every(([, , , radius]) => radius >= 22));
});

test("every static Chinese UI label has an English translation", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const keys = [...html.matchAll(/data-i18n(?:-label)?="([^"]+)"/g)].map((match) => match[1]);
  for (const key of keys.filter((value) => /[\u3400-\u9fff]/u.test(value))) {
    assert.ok(ENGLISH_TRANSLATIONS[key], key);
  }
});

test("a blocked quiz frame leaves the running game completely paused", () => {
  const game = createDinoGame(() => 0.5);
  game.start();
  const before = structuredClone(game.state);
  game.step(3, false);
  assert.deepEqual(game.state, before);
});
