export const DEFAULT_KID_LOCK_SETTINGS = Object.freeze({
  enabled: true,
  durationMinutes: 10,
  questionsToUnlock: 2
});

const ALLOWED_DURATIONS = Object.freeze([5, 10, 15, 20, 30]);

export function normalizeKidLockSettings(settings = {}) {
  const duration = Number(settings.durationMinutes);
  const questions = Number(settings.questionsToUnlock);
  return {
    enabled: settings.enabled !== false,
    durationMinutes: ALLOWED_DURATIONS.includes(duration) ? duration : DEFAULT_KID_LOCK_SETTINGS.durationMinutes,
    questionsToUnlock: [1, 2, 3].includes(questions) ? questions : DEFAULT_KID_LOCK_SETTINGS.questionsToUnlock
  };
}

export class KidLockTimer {
  constructor(settings) {
    this.configure(settings);
  }

  configure(settings) {
    this.settings = normalizeKidLockSettings(settings);
    this.remainingSeconds = this.settings.durationMinutes * 60;
    this.locked = false;
  }

  tick(seconds, active) {
    if (!this.settings.enabled || this.locked || !active || !Number.isFinite(seconds) || seconds <= 0) return false;
    this.remainingSeconds = Math.max(0, this.remainingSeconds - seconds);
    if (this.remainingSeconds > 0) return false;
    this.locked = true;
    return true;
  }

  unlock() {
    this.locked = false;
    this.remainingSeconds = this.settings.durationMinutes * 60;
  }

  formattedRemaining() {
    if (!this.settings.enabled) return "∞";
    const total = Math.max(0, Math.ceil(this.remainingSeconds));
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }
}
