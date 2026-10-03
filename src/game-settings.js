import { ANIMALS, DEFAULT_ANIMAL_ID } from "./animal-catalog.js";
import { normalizeKidLockSettings } from "./kid-lock.js";

const STORAGE_KEY = "jump-run-settings-v1";

export const DEFAULT_GAME_SETTINGS = Object.freeze({
  animalId: DEFAULT_ANIMAL_ID,
  kidLock: normalizeKidLockSettings()
});

export function normalizeGameSettings(settings = {}) {
  const animalId = ANIMALS.some((animal) => animal.id === settings.animalId) ? settings.animalId : DEFAULT_ANIMAL_ID;
  return { animalId, kidLock: normalizeKidLockSettings(settings.kidLock) };
}

export function loadGameSettings(storage = globalThis.localStorage) {
  try {
    return normalizeGameSettings(JSON.parse(storage.getItem(STORAGE_KEY) || "{}"));
  } catch {
    return normalizeGameSettings();
  }
}

export function saveGameSettings(settings, storage = globalThis.localStorage) {
  const normalized = normalizeGameSettings(settings);
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
  }
  return normalized;
}
