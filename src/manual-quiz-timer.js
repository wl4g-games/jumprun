export const DEFAULT_MANUAL_MODE_SETTINGS = Object.freeze({
  enabled: false,
  durationMinutes: 3,
  questionsToUnlock: 1
});

const ALLOWED_DURATIONS = Object.freeze([1, 3, 5, 10, 15, 20, 30]);
const ALLOWED_QUESTION_COUNTS = Object.freeze([1, 2, 3]);
const STORE_SYNC_INTERVAL_SECONDS = 0.25;

export function normalizeManualModeSettings(settings = {}) {
  const durationMinutes = Number(settings.durationMinutes);
  const questionsToUnlock = Number(settings.questionsToUnlock);
  return {
    enabled: settings.enabled === true,
    durationMinutes: ALLOWED_DURATIONS.includes(durationMinutes)
      ? durationMinutes
      : DEFAULT_MANUAL_MODE_SETTINGS.durationMinutes,
    questionsToUnlock: ALLOWED_QUESTION_COUNTS.includes(questionsToUnlock)
      ? questionsToUnlock
      : DEFAULT_MANUAL_MODE_SETTINGS.questionsToUnlock
  };
}

export class ManualQuizTimer {
  constructor(settings, stateStore = null) {
    this.stateStore = stateStore;
    this.settings = normalizeManualModeSettings(settings);
    this.lockEnabled = true;
    this.locked = false;
    this.remainingSeconds = this.settings.durationMinutes * 60;
    this.cycleDurationMinutes = this.settings.durationMinutes;
    this.cycleId = -1;
    this.syncElapsed = 0;
    this.lastPersistedSecond = null;
    this.applyStoredState(stateStore?.snapshot?.() || { cycleId: 0 });
    if (this.cycleId < 0) this.cycleId = 0;
    this.persist(true);
  }

  configure(settings) {
    this.sync();
    this.settings = normalizeManualModeSettings(settings);
    const maximum = this.settings.durationMinutes * 60;
    if (!this.locked) this.remainingSeconds = Math.min(this.remainingSeconds, maximum);
    this.cycleDurationMinutes = this.settings.durationMinutes;
    this.persist(true);
  }

  tick(seconds, active) {
    if (!Number.isFinite(seconds) || seconds <= 0) return false;
    if (active) {
      this.syncElapsed += seconds;
      if (this.syncElapsed >= STORE_SYNC_INTERVAL_SECONDS) {
        this.syncElapsed = 0;
        if (this.sync()) return true;
      }
    }
    if (!this.settings.enabled || !this.lockEnabled || !active) return false;
    if (this.locked) return true;
    this.remainingSeconds = Math.max(0, this.remainingSeconds - seconds);
    if (this.remainingSeconds > 0) {
      return this.persist();
    }
    this.locked = true;
    this.persist(true);
    return this.isBlocking();
  }

  unlock() {
    this.reset();
  }

  reset() {
    const remainingSeconds = this.settings.durationMinutes * 60;
    const next = this.stateStore?.startNextCycle?.({
      remainingSeconds,
      cycleDurationMinutes: this.settings.durationMinutes,
      cycleId: this.cycleId
    });
    if (next) {
      this.applyStoredState(next);
    } else {
      this.cycleId = Math.max(0, this.cycleId) + 1;
      this.locked = false;
      this.remainingSeconds = remainingSeconds;
      this.cycleDurationMinutes = this.settings.durationMinutes;
      this.persist(true);
    }
    this.syncElapsed = 0;
    this.lastPersistedSecond = Math.max(0, Math.ceil(this.remainingSeconds));
  }

  setLockEnabled(enabled) {
    this.lockEnabled = enabled === true;
  }

  shouldBlock() {
    this.sync();
    return this.isBlocking();
  }

  persist(force = false) {
    const displaySecond = Math.max(0, Math.ceil(this.remainingSeconds));
    if (!force && displaySecond === this.lastPersistedSecond) return false;
    this.lastPersistedSecond = displaySecond;
    const wasBlocking = this.isBlocking();
    const saved = this.stateStore?.saveTimer?.({
      locked: this.locked,
      remainingSeconds: this.remainingSeconds,
      cycleDurationMinutes: this.cycleDurationMinutes,
      cycleId: this.cycleId
    });
    if (saved) this.applyStoredState(saved);
    return !wasBlocking && this.isBlocking();
  }

  formattedRemaining() {
    const total = Math.max(0, Math.ceil(this.remainingSeconds));
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  isBlocking() {
    return this.settings.enabled && this.lockEnabled && this.locked;
  }

  sync() {
    const wasBlocking = this.isBlocking();
    const saved = this.stateStore?.snapshot?.();
    if (saved) this.applyStoredState(saved);
    return !wasBlocking && this.isBlocking();
  }

  applyStoredState(state) {
    const incomingCycleId = Number(state?.cycleId);
    const cycleId = Number.isSafeInteger(incomingCycleId) && incomingCycleId >= 0 ? incomingCycleId : 0;
    if (cycleId < this.cycleId) return;

    const savedRemaining = state?.remainingSeconds === null || state?.remainingSeconds === undefined
      ? Number.NaN
      : Number(state.remainingSeconds);
    const validRemaining = Number.isFinite(savedRemaining) && savedRemaining >= 0;
    const savedDuration = Number(state?.cycleDurationMinutes);
    this.lockEnabled = state?.enabled !== false;

    if (cycleId > this.cycleId) {
      this.cycleId = cycleId;
      this.locked = state?.locked === true || validRemaining && savedRemaining === 0;
      this.remainingSeconds = this.locked
        ? 0
        : validRemaining ? savedRemaining : this.settings.durationMinutes * 60;
      this.cycleDurationMinutes = Number.isFinite(savedDuration) && savedDuration > 0
        ? savedDuration
        : this.settings.durationMinutes;
      return;
    }

    this.locked = this.locked || state?.locked === true || validRemaining && savedRemaining === 0;
    if (this.locked) {
      this.remainingSeconds = 0;
    } else if (validRemaining) {
      this.remainingSeconds = Math.min(this.remainingSeconds, savedRemaining);
    }
    if (Number.isFinite(savedDuration) && savedDuration > 0) this.cycleDurationMinutes = savedDuration;
  }
}
