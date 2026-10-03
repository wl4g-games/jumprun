export const DEFAULT_MANUAL_MODE_SETTINGS = Object.freeze({
  enabled: false,
  durationMinutes: 5,
  questionsToUnlock: 1
});

const ALLOWED_DURATIONS = Object.freeze([5, 10, 15, 20, 30]);
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
  constructor(settings) {
    this.configure(settings);
  }

  configure(settings) {
    this.settings = normalizeManualModeSettings(settings);
    this.reset();
  }

  tick(seconds, active) {
    if (!this.settings.enabled || this.locked || !active || !Number.isFinite(seconds) || seconds <= 0) return false;
    this.remainingSeconds = Math.max(0, this.remainingSeconds - seconds);
    if (this.remainingSeconds > 0) return false;
    this.locked = true;
    return true;
  }

  unlock() {
    this.reset();
  }

  reset() {
    this.locked = false;
    this.remainingSeconds = this.settings.durationMinutes * 60;
  }

  formattedRemaining() {
    const total = Math.max(0, Math.ceil(this.remainingSeconds));
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }
}
