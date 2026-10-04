export const DEFAULT_MANUAL_MODE_SETTINGS = Object.freeze({
  enabled: false,
  durationMinutes: 5,
  questionsToUnlock: 1
});

const ALLOWED_DURATIONS = Object.freeze([1, 5, 10, 15, 20, 30]);
const ALLOWED_QUESTION_COUNTS = Object.freeze([1, 2, 3]);

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
    const state = stateStore?.snapshot?.() || {};
    this.lockEnabled = state.enabled !== false;
    this.locked = state.locked === true;
    const savedRemaining = state.remainingSeconds === null || state.remainingSeconds === undefined
      ? Number.NaN
      : Number(state.remainingSeconds);
    this.remainingSeconds = this.locked ? 0 : savedRemaining;
    if (!Number.isFinite(this.remainingSeconds) || this.remainingSeconds < 0) {
      this.remainingSeconds = this.settings.durationMinutes * 60;
    }
    this.cycleDurationMinutes = Number(state.cycleDurationMinutes) || this.settings.durationMinutes;
    this.lastPersistedSecond = null;
    this.persist(true);
  }

  configure(settings) {
    this.settings = normalizeManualModeSettings(settings);
    const maximum = this.settings.durationMinutes * 60;
    if (!this.locked) this.remainingSeconds = Math.min(this.remainingSeconds, maximum);
    this.cycleDurationMinutes = this.settings.durationMinutes;
    this.persist(true);
  }

  tick(seconds, active) {
    if (!this.settings.enabled || !this.lockEnabled || this.locked || !active || !Number.isFinite(seconds) || seconds <= 0) return false;
    this.remainingSeconds = Math.max(0, this.remainingSeconds - seconds);
    if (this.remainingSeconds > 0) {
      this.persist();
      return false;
    }
    this.locked = true;
    this.persist(true);
    return true;
  }

  unlock() {
    this.reset();
  }

  reset() {
    this.locked = false;
    this.remainingSeconds = this.settings.durationMinutes * 60;
    this.cycleDurationMinutes = this.settings.durationMinutes;
    this.persist(true);
  }

  setLockEnabled(enabled) {
    this.lockEnabled = enabled === true;
  }

  shouldBlock() {
    return this.settings.enabled && this.lockEnabled && this.locked;
  }

  persist(force = false) {
    const displaySecond = Math.max(0, Math.ceil(this.remainingSeconds));
    if (!force && displaySecond === this.lastPersistedSecond) return;
    this.lastPersistedSecond = displaySecond;
    this.stateStore?.saveTimer?.({
      locked: this.locked,
      remainingSeconds: this.remainingSeconds,
      cycleDurationMinutes: this.cycleDurationMinutes
    });
  }

  formattedRemaining() {
    const total = Math.max(0, Math.ceil(this.remainingSeconds));
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }
}
