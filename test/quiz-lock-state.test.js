import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { ManualQuizTimer, normalizeManualModeSettings } from "../src/manual-quiz-timer.js";
import {
  createQuizLockStateStore,
  DEFAULT_QUIZ_LOCK_STATE,
  normalizeQuizLockState
} from "../src/quiz-lock-state.js";
import {
  hasAdminPassword,
  setAdminPassword,
  validateAdminPassword,
  verifyAdminPassword
} from "../src/admin-lock.js";
import { createAdminLockDialog } from "../src/admin-lock-dialog.js";
import { saveGameSettings } from "../src/game-settings.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    values
  };
}

function fakeElement() {
  const listeners = new Map();
  return {
    open: false,
    hidden: false,
    disabled: false,
    checked: false,
    value: "",
    textContent: "",
    autocomplete: "",
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    showModal() {
      this.open = true;
    },
    close() {
      this.open = false;
    },
    focus() {},
    select() {},
    dispatch(type, event = {}) {
      listeners.get(type)?.(event);
    }
  };
}

test("quiz lock defaults to globally enabled and accepts the one-minute option", () => {
  const store = createQuizLockStateStore(memoryStorage());
  assert.deepEqual(store.snapshot(), DEFAULT_QUIZ_LOCK_STATE);
  assert.equal(normalizeManualModeSettings({ enabled: true, durationMinutes: 1 }).durationMinutes, 1);
});

test("countdown progress and expiry survive settings saves and page reloads", () => {
  const storage = memoryStorage();
  const store = createQuizLockStateStore(storage);
  const timer = new ManualQuizTimer({ enabled: true, durationMinutes: 5, questionsToUnlock: 1 }, store);

  timer.tick(87, true);
  assert.equal(timer.remainingSeconds, 213);

  // Animal preferences live under a different storage key and cannot affect it.
  saveGameSettings({
    animalId: "lion",
    manualMode: { enabled: true, durationMinutes: 5, questionsToUnlock: 1 }
  }, storage);
  const afterAnimalChange = new ManualQuizTimer(
    { enabled: true, durationMinutes: 5, questionsToUnlock: 1 },
    createQuizLockStateStore(storage)
  );
  assert.equal(afterAnimalChange.remainingSeconds, 213);

  // Reopening/saving settings with the same duration must not start a new cycle.
  timer.configure({ enabled: true, durationMinutes: 5, questionsToUnlock: 3 });
  assert.equal(timer.remainingSeconds, 213);

  // A longer duration applies only after a successful quiz; it cannot add time now.
  timer.configure({ enabled: true, durationMinutes: 10, questionsToUnlock: 3 });
  assert.equal(timer.remainingSeconds, 213);

  // A shorter duration is allowed to tighten the current cycle.
  timer.configure({ enabled: true, durationMinutes: 1, questionsToUnlock: 3 });
  assert.equal(timer.remainingSeconds, 60);
  assert.equal(timer.tick(60, true), true);
  assert.equal(timer.locked, true);

  // Reloading and changing any settings cannot clear an expired lock.
  const reloaded = new ManualQuizTimer({ enabled: true, durationMinutes: 30, questionsToUnlock: 2 }, createQuizLockStateStore(storage));
  assert.equal(reloaded.locked, true);
  assert.equal(reloaded.remainingSeconds, 0);
  reloaded.configure({ enabled: false, durationMinutes: 30, questionsToUnlock: 2 });
  reloaded.configure({ enabled: true, durationMinutes: 30, questionsToUnlock: 2 });
  assert.equal(reloaded.locked, true);

  // Only quiz success calls unlock; the newly selected duration starts here.
  reloaded.unlock();
  assert.equal(reloaded.locked, false);
  assert.equal(reloaded.remainingSeconds, 1_800);
});

test("the administrator switch persists without discarding locked progress", () => {
  const storage = memoryStorage();
  const store = createQuizLockStateStore(storage);
  const timer = new ManualQuizTimer({ enabled: true, durationMinutes: 1 }, store);
  assert.equal(timer.tick(60, true), true);

  store.setEnabled(false);
  timer.setLockEnabled(false);
  assert.equal(timer.shouldBlock(), false);
  assert.equal(timer.locked, true);

  const disabledReload = new ManualQuizTimer({ enabled: true, durationMinutes: 1 }, createQuizLockStateStore(storage));
  assert.equal(disabledReload.lockEnabled, false);
  assert.equal(disabledReload.locked, true);

  const reenabledStore = createQuizLockStateStore(storage);
  reenabledStore.setEnabled(true);
  const reenabledReload = new ManualQuizTimer({ enabled: true, durationMinutes: 1 }, reenabledStore);
  assert.equal(reenabledReload.shouldBlock(), true);
});

test("malformed lock data fails closed to the safe enabled default", () => {
  assert.deepEqual(normalizeQuizLockState({ enabled: "no", locked: "yes", remainingSeconds: -4 }), DEFAULT_QUIZ_LOCK_STATE);
  const storage = memoryStorage();
  storage.setItem("jump-run-quiz-lock-state-v1", "not-json");
  assert.deepEqual(createQuizLockStateStore(storage).snapshot(), DEFAULT_QUIZ_LOCK_STATE);
});

test("administrator password is salted, hashed and verified without plaintext storage", async () => {
  const storage = memoryStorage();
  assert.equal(hasAdminPassword(storage), false);
  assert.equal(validateAdminPassword("short"), false);
  assert.equal(await setAdminPassword("family-secret", storage, webcrypto), true);
  assert.equal(hasAdminPassword(storage), true);
  assert.equal(await verifyAdminPassword("family-secret", storage, webcrypto), true);
  assert.equal(await verifyAdminPassword("wrong-secret", storage, webcrypto), false);

  const serialized = [...storage.values.values()].join("\n");
  assert.doesNotMatch(serialized, /family-secret/);
  const credential = JSON.parse(storage.getItem("jump-run-quiz-admin-v1"));
  assert.equal(credential.version, 1);
  assert.ok(credential.iterations >= 200_000);
  assert.notEqual(credential.salt, credential.hash);
});

test("administrator dialog requires first-time confirmation and later verification", async () => {
  const storage = memoryStorage();
  const stateStore = createQuizLockStateStore(storage);
  const elements = {
    dialog: fakeElement(),
    title: fakeElement(),
    current: fakeElement(),
    enabled: fakeElement(),
    password: fakeElement(),
    confirmRow: fakeElement(),
    confirmation: fakeElement(),
    feedback: fakeElement(),
    cancel: fakeElement(),
    save: fakeElement()
  };
  const changes = [];
  const controller = createAdminLockDialog(elements, {
    stateStore,
    translate: (value) => value,
    storage,
    cryptoProvider: webcrypto,
    onChanged: (enabled) => changes.push(enabled)
  });

  controller.open();
  assert.equal(elements.confirmRow.hidden, false);
  elements.enabled.checked = false;
  elements.password.value = "parent-key";
  elements.confirmation.value = "different";
  await elements.save.onclick();
  assert.equal(elements.dialog.open, true);
  assert.equal(elements.feedback.textContent, "两次输入的密码不一致");

  elements.confirmation.value = "parent-key";
  await elements.save.onclick();
  assert.equal(elements.dialog.open, false);
  assert.equal(stateStore.snapshot().enabled, false);
  assert.deepEqual(changes, [false]);

  controller.open();
  assert.equal(elements.confirmRow.hidden, true);
  elements.enabled.checked = true;
  elements.password.value = "wrong-key";
  await elements.save.onclick();
  assert.equal(elements.dialog.open, true);
  assert.equal(stateStore.snapshot().enabled, false);

  elements.password.value = "parent-key";
  await elements.save.onclick();
  assert.equal(elements.dialog.open, false);
  assert.equal(stateStore.snapshot().enabled, true);
  assert.deepEqual(changes, [false, true]);
});
