import { ANIMALS, DEFAULT_ANIMAL_ID } from "./animal-catalog.js";
import { DEFAULT_MANUAL_MODE_SETTINGS, normalizeManualModeSettings } from "./manual-quiz-timer.js";

export const GAME_SETTINGS_STORAGE_KEY = "jump-run-settings-v2";
const LEGACY_STORAGE_KEY = "jump-run-settings-v1";

export const DEFAULT_GAME_SETTINGS = Object.freeze({
  animalId: DEFAULT_ANIMAL_ID,
  manualMode: DEFAULT_MANUAL_MODE_SETTINGS
});

export function normalizeGameSettings(settings = {}) {
  const animalId = ANIMALS.some((animal) => animal.id === settings.animalId) ? settings.animalId : DEFAULT_ANIMAL_ID;
  return { animalId, manualMode: normalizeManualModeSettings(settings.manualMode) };
}

function parseStored(storage, key) {
  try {
    const value = storage.getItem(key);
    return value === null ? null : JSON.parse(value);
  } catch {
    return null;
  }
}

export function hasSavedGameSettings(storage = globalThis.localStorage) {
  const saved = parseStored(storage, GAME_SETTINGS_STORAGE_KEY);
  if (saved) return saved.setupComplete !== false;
  return Boolean(parseStored(storage, LEGACY_STORAGE_KEY));
}

export function loadGameSettings(storage = globalThis.localStorage) {
  const saved = parseStored(storage, GAME_SETTINGS_STORAGE_KEY);
  if (saved) return normalizeGameSettings(saved);

  // The old lock had different semantics. Preserve the chosen animal, but do
  // not silently turn an existing visitor's lock into manual controls.
  const legacy = parseStored(storage, LEGACY_STORAGE_KEY);
  return normalizeGameSettings({ animalId: legacy?.animalId });
}

export function applyGameSettings(settings, {
  persist = false,
  setupComplete = true,
  storage = globalThis.localStorage
} = {}) {
  const normalized = normalizeGameSettings(settings);
  if (!persist) return normalized;
  try {
    storage.setItem(GAME_SETTINGS_STORAGE_KEY, JSON.stringify({
      ...normalized,
      setupComplete: setupComplete === true
    }));
  } catch {
  }
  return normalized;
}

export function saveGameSettings(settings, storage = globalThis.localStorage) {
  return applyGameSettings(settings, { persist: true, storage });
}

export function mergeQuizPolicySettings(currentSettings, remoteSettings) {
  const current = normalizeGameSettings(currentSettings);
  const remote = normalizeGameSettings(remoteSettings);
  return normalizeGameSettings({
    ...current,
    manualMode: {
      ...current.manualMode,
      durationMinutes: remote.manualMode.durationMinutes,
      questionsToUnlock: remote.manualMode.questionsToUnlock
    }
  });
}
