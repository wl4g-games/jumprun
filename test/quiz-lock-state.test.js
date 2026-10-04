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
import { loadGameSettings, saveGameSettings } from "../src/game-settings.js";

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

test("quiz lock defaults to globally enabled with three-minute and one-minute options", () => {
  const store = createQuizLockStateStore(memoryStorage());
  assert.deepEqual(store.snapshot(), DEFAULT_QUIZ_LOCK_STATE);
  assert.equal(normalizeManualModeSettings().durationMinutes, 3);
  assert.equal(normalizeManualModeSettings({ enabled: true, durationMinutes: 3 }).durationMinutes, 3);
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

  // Increasing to the new default changes only the next cycle.
  timer.configure({ enabled: true, durationMinutes: 3, questionsToUnlock: 3 });
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

test("concurrent tabs cannot add time, clear a lock, or overwrite a newer cycle", () => {
  const storage = memoryStorage();
  const settings = { enabled: true, durationMinutes: 3, questionsToUnlock: 1 };
  const firstStore = createQuizLockStateStore(storage);
  const firstTimer = new ManualQuizTimer(settings, firstStore);
  const staleStore = createQuizLockStateStore(storage);
  const staleTimer = new ManualQuizTimer(settings, staleStore);
  const abandonedTimer = new ManualQuizTimer(settings, createQuizLockStateStore(storage));
  const lateQuizTimer = new ManualQuizTimer(settings, createQuizLockStateStore(storage));

  firstTimer.tick(60, true);
  staleTimer.persist(true);
  assert.equal(createQuizLockStateStore(storage).snapshot().remainingSeconds, 120);

  assert.equal(firstTimer.tick(120, true), true);
  assert.equal(staleTimer.tick(0.25, true), true);
  assert.equal(staleTimer.locked, true);

  // A pagehide-style forced write from the stale tab cannot clear the lock.
  staleTimer.persist(true);
  let persisted = createQuizLockStateStore(storage).snapshot();
  assert.equal(persisted.locked, true);
  assert.equal(persisted.remainingSeconds, 0);
  assert.equal(persisted.cycleId, 0);

  // Only one success for the expired cycle may advance the cycle.
  firstTimer.unlock();
  firstTimer.tick(30, true);
  persisted = createQuizLockStateStore(storage).snapshot();
  assert.equal(persisted.locked, false);
  assert.equal(persisted.remainingSeconds, 150);
  assert.equal(persisted.cycleId, 1);

  // The old quiz succeeding late cannot start another full cycle or add time.
  staleTimer.unlock();
  persisted = createQuizLockStateStore(storage).snapshot();
  assert.equal(persisted.locked, false);
  assert.equal(persisted.remainingSeconds, 150);
  assert.equal(persisted.cycleId, 1);
  assert.equal(staleTimer.locked, false);
  assert.equal(staleTimer.cycleId, 1);

  // Nor can a pagehide-style write from an untouched old-cycle tab relock it.
  abandonedTimer.persist(true);
  persisted = createQuizLockStateStore(storage).snapshot();
  assert.equal(persisted.locked, false);
  assert.equal(persisted.remainingSeconds, 150);
  assert.equal(persisted.cycleId, 1);

  // If the newer cycle has expired, a late old quiz cannot close its lock.
  assert.equal(firstTimer.tick(150, true), true);
  lateQuizTimer.unlock();
  assert.equal(lateQuizTimer.locked, true);
  assert.equal(lateQuizTimer.cycleId, 1);
  assert.equal(lateQuizTimer.tick(0.25, true), true);

  // Timer persistence never overwrites the parent-controlled enabled flag.
  firstStore.setEnabled(false);
  staleTimer.setLockEnabled(true);
  staleTimer.persist(true);
  assert.equal(createQuizLockStateStore(storage).snapshot().enabled, false);
  assert.equal(staleTimer.lockEnabled, false);
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

test("administrator authentication gates advanced settings and main-owned saves persist", async () => {
  const storage = memoryStorage();
  let gameSettings = saveGameSettings({
    animalId: "lion",
    manualMode: { enabled: true, durationMinutes: 1, questionsToUnlock: 1 }
  }, storage);
  let stateStore = createQuizLockStateStore(storage);
  let timer = new ManualQuizTimer(gameSettings.manualMode, stateStore);
  timer.tick(20, true);
  const elements = {
    dialog: fakeElement(),
    title: fakeElement(),
    authPanel: fakeElement(),
    settingsPanel: fakeElement(),
    current: fakeElement(),
    enabled: fakeElement(),
    duration: fakeElement(),
    correctCount: fakeElement(),
    password: fakeElement(),
    confirmRow: fakeElement(),
    confirmation: fakeElement(),
    feedback: fakeElement(),
    cancel: fakeElement(),
    save: fakeElement()
  };
  let saves = 0;
  let language = "zh";
  const controller = createAdminLockDialog(elements, {
    translate: (value) => language === "zh" ? value : `EN:${value}`,
    storage,
    cryptoProvider: webcrypto,
    getQuizSettings: () => ({
      lockEnabled: timer.lockEnabled,
      durationMinutes: gameSettings.manualMode.durationMinutes,
      questionsToUnlock: gameSettings.manualMode.questionsToUnlock
    }),
    onSave: (settings) => {
      gameSettings = saveGameSettings({
        ...gameSettings,
        manualMode: {
          ...gameSettings.manualMode,
          durationMinutes: settings.durationMinutes,
          questionsToUnlock: settings.questionsToUnlock
        }
      }, storage);
      const lockState = stateStore.setEnabled(settings.lockEnabled);
      timer.configure(gameSettings.manualMode);
      timer.setLockEnabled(lockState.enabled);
      saves++;
    }
  });

  controller.open();
  assert.equal(elements.authPanel.hidden, false);
  assert.equal(elements.settingsPanel.hidden, true);
  assert.equal(elements.confirmRow.hidden, false);
  elements.enabled.checked = false;
  elements.password.value = "parent-key";
  elements.confirmation.value = "different";
  await elements.save.onclick();
  assert.equal(elements.dialog.open, true);
  assert.equal(elements.feedback.textContent, "两次输入的密码不一致");
  language = "en";
  controller.refreshLanguage();
  assert.equal(elements.feedback.textContent, "EN:两次输入的密码不一致");
  language = "zh";
  controller.refreshLanguage();

  elements.confirmation.value = "parent-key";
  await elements.save.onclick();
  assert.equal(elements.dialog.open, true);
  assert.equal(elements.authPanel.hidden, true);
  assert.equal(elements.settingsPanel.hidden, false);
  assert.equal(elements.duration.value, "1");
  assert.equal(elements.correctCount.value, "1");
  assert.equal(saves, 0);

  elements.enabled.checked = false;
  elements.duration.value = "10";
  elements.correctCount.value = "3";
  await elements.save.onclick();
  assert.equal(elements.dialog.open, false);
  assert.equal(saves, 1);
  assert.equal(timer.remainingSeconds, 40);
  assert.equal(timer.locked, false);
  assert.equal(timer.lockEnabled, false);
  assert.deepEqual(loadGameSettings(storage).manualMode, {
    enabled: true,
    durationMinutes: 10,
    questionsToUnlock: 3
  });

  // A reload restores both the advanced rule and the independent timer state.
  gameSettings = loadGameSettings(storage);
  stateStore = createQuizLockStateStore(storage);
  timer = new ManualQuizTimer(gameSettings.manualMode, stateStore);
  assert.equal(timer.remainingSeconds, 40);
  assert.equal(timer.lockEnabled, false);

  controller.open();
  assert.equal(elements.confirmRow.hidden, true);
  elements.password.value = "wrong-key";
  await elements.save.onclick();
  assert.equal(elements.dialog.open, true);
  assert.equal(elements.authPanel.hidden, false);
  assert.equal(elements.settingsPanel.hidden, true);
  assert.equal(stateStore.snapshot().enabled, false);

  elements.password.value = "parent-key";
  await elements.save.onclick();
  assert.equal(elements.dialog.open, true);
  assert.equal(elements.authPanel.hidden, true);
  assert.equal(elements.settingsPanel.hidden, false);
  assert.equal(elements.duration.value, "10");
  assert.equal(elements.correctCount.value, "3");

  // Saving advanced settings cannot clear a lock that already fired.
  stateStore.setEnabled(true);
  timer.setLockEnabled(true);
  assert.equal(timer.tick(40, true), true);
  assert.equal(timer.locked, true);
  elements.enabled.checked = false;
  elements.duration.value = "30";
  elements.correctCount.value = "2";
  await elements.save.onclick();
  assert.equal(timer.locked, true);
  assert.equal(timer.remainingSeconds, 0);
  assert.equal(timer.lockEnabled, false);
  assert.equal(saves, 2);

  const refreshedSettings = loadGameSettings(storage);
  const refreshedTimer = new ManualQuizTimer(refreshedSettings.manualMode, createQuizLockStateStore(storage));
  assert.equal(refreshedSettings.manualMode.durationMinutes, 30);
  assert.equal(refreshedSettings.manualMode.questionsToUnlock, 2);
  assert.equal(refreshedTimer.locked, true);
  assert.equal(refreshedTimer.lockEnabled, false);
});
