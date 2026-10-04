export const QUIZ_LOCK_STORAGE_KEY = "jump-run-quiz-lock-state-v1";

export const DEFAULT_QUIZ_LOCK_STATE = Object.freeze({
  enabled: true,
  locked: false,
  remainingSeconds: null,
  cycleDurationMinutes: null,
  cycleId: 0
});

function finiteNonNegative(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function normalizeQuizLockState(value = {}) {
  const savedRemaining = finiteNonNegative(value.remainingSeconds);
  const locked = value.locked === true || savedRemaining === 0;
  const remainingSeconds = locked ? 0 : savedRemaining;
  const cycleDurationMinutes = finiteNonNegative(value.cycleDurationMinutes);
  const cycleId = Number(value.cycleId);
  return {
    enabled: value.enabled !== false,
    locked,
    remainingSeconds,
    cycleDurationMinutes: cycleDurationMinutes > 0 ? cycleDurationMinutes : null,
    cycleId: Number.isSafeInteger(cycleId) && cycleId >= 0 ? cycleId : 0
  };
}

function readState(storage) {
  try {
    const stored = storage?.getItem(QUIZ_LOCK_STORAGE_KEY);
    return stored === null || stored === undefined
      ? DEFAULT_QUIZ_LOCK_STATE
      : normalizeQuizLockState(JSON.parse(stored));
  } catch {
    return DEFAULT_QUIZ_LOCK_STATE;
  }
}

function writeState(storage, state) {
  try {
    storage?.setItem(QUIZ_LOCK_STORAGE_KEY, JSON.stringify(state));
  } catch {
  }
}

/**
 * Owns the browser-local quiz lock independently from animal/control settings.
 * Timer writes merge against fresh storage: within one cycle a lock can only
 * engage and remaining time can only decrease. Only startNextCycle may clear
 * a lock, and its expected cycle id rejects late answers from stale tabs.
 */
export function createQuizLockStateStore(storage = globalThis.localStorage) {
  let state = normalizeQuizLockState(readState(storage));

  function copy() {
    return { ...state };
  }

  function refresh() {
    state = normalizeQuizLockState(readState(storage));
    return copy();
  }

  function commit(next) {
    state = normalizeQuizLockState(next);
    writeState(storage, state);
    return copy();
  }

  function snapshot() {
    return refresh();
  }

  return Object.freeze({
    snapshot,
    setEnabled(enabled) {
      const current = refresh();
      return commit({ ...current, enabled: enabled === true });
    },
    saveTimer({ locked, remainingSeconds, cycleDurationMinutes, cycleId }) {
      const current = refresh();
      const incomingCycleId = Number(cycleId);
      if (!Number.isSafeInteger(incomingCycleId) || incomingCycleId !== current.cycleId) return current;

      const incomingRemaining = finiteNonNegative(remainingSeconds);
      const candidates = [current.remainingSeconds, incomingRemaining].filter((value) => value !== null);
      const mergedRemaining = candidates.length ? Math.min(...candidates) : null;
      const mergedLocked = current.locked || locked === true || mergedRemaining === 0;
      const incomingDuration = finiteNonNegative(cycleDurationMinutes);
      return commit({
        ...current,
        locked: mergedLocked,
        remainingSeconds: mergedLocked ? 0 : mergedRemaining,
        cycleDurationMinutes: incomingDuration > 0 ? incomingDuration : current.cycleDurationMinutes
      });
    },
    startNextCycle({ remainingSeconds, cycleDurationMinutes, cycleId }) {
      const current = refresh();
      const incomingCycleId = Number(cycleId);
      if (!Number.isSafeInteger(incomingCycleId) || incomingCycleId !== current.cycleId) return current;

      const nextRemaining = finiteNonNegative(remainingSeconds);
      const nextDuration = finiteNonNegative(cycleDurationMinutes);
      return commit({
        ...current,
        locked: nextRemaining === 0,
        remainingSeconds: nextRemaining,
        cycleDurationMinutes: nextDuration > 0 ? nextDuration : current.cycleDurationMinutes,
        cycleId: current.cycleId + 1
      });
    }
  });
}
