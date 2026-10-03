import { ANIMALS, DEFAULT_ANIMAL_ID } from "./animal-catalog.js";
import { DEFAULT_MANUAL_MODE_SETTINGS, normalizeManualModeSettings } from "./manual-quiz-timer.js";

const STORAGE_KEY = "jump-run-settings-v2";
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
  return Boolean(parseStored(storage, STORAGE_KEY) || parseStored(storage, LEGACY_STORAGE_KEY));
}

export function loadGameSettings(storage = globalThis.localStorage) {
  const saved = parseStored(storage, STORAGE_KEY);
  if (saved) return normalizeGameSettings(saved);

  // The old lock had different semantics. Preserve the chosen animal, but do
  // not silently turn an existing visitor's lock into manual controls.
  const legacy = parseStored(storage, LEGACY_STORAGE_KEY);
  return normalizeGameSettings({ animalId: legacy?.animalId });
}

export function saveGameSettings(settings, storage = globalThis.localStorage) {
  const normalized = normalizeGameSettings(settings);
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
  }
  return normalized;
}
