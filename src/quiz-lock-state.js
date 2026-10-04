const STORAGE_KEY = "jump-run-quiz-lock-state-v1";

export const DEFAULT_QUIZ_LOCK_STATE = Object.freeze({
  enabled: true,
  locked: false,
  remainingSeconds: null,
  cycleDurationMinutes: null
});

function finiteNonNegative(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function normalizeQuizLockState(value = {}) {
  const locked = value.locked === true;
  const remainingSeconds = locked ? 0 : finiteNonNegative(value.remainingSeconds);
  const cycleDurationMinutes = finiteNonNegative(value.cycleDurationMinutes);
  return {
    enabled: value.enabled !== false,
    locked,
    remainingSeconds,
    cycleDurationMinutes: cycleDurationMinutes > 0 ? cycleDurationMinutes : null
  };
}

function readState(storage) {
  try {
    const stored = storage?.getItem(STORAGE_KEY);
    return stored === null || stored === undefined
      ? DEFAULT_QUIZ_LOCK_STATE
      : normalizeQuizLockState(JSON.parse(stored));
  } catch {
    return DEFAULT_QUIZ_LOCK_STATE;
  }
}

function writeState(storage, state) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
  }
}

/**
 * Owns the browser-local quiz lock independently from animal/control settings.
 * Keeping one state object also prevents a settings save from starting a new
 * countdown cycle.
 */
export function createQuizLockStateStore(storage = globalThis.localStorage) {
  let state = normalizeQuizLockState(readState(storage));

  function commit(next) {
    state = normalizeQuizLockState(next);
    writeState(storage, state);
    return snapshot();
  }

  function snapshot() {
    return { ...state };
  }

  return Object.freeze({
    snapshot,
    setEnabled(enabled) {
      return commit({ ...state, enabled: enabled === true });
    },
    saveTimer({ locked, remainingSeconds, cycleDurationMinutes }) {
      return commit({ ...state, locked, remainingSeconds, cycleDurationMinutes });
    }
  });
}
