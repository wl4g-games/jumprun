const note = (type, from, to, duration, delay, level, wobble) => Object.freeze({
  type,
  from,
  to,
  duration,
  delay,
  level,
  wobble
});

const profile = (file, start, duration, gain, { playbackRate = 1, highpass = 0 } = {}) => Object.freeze({
  file,
  start,
  duration,
  gain,
  playbackRate,
  highpass
});

export const GROUND_CALL_INTERVAL_SECONDS = 10;
export const GROUND_CALL_GAIN_SCALE = 2.5;
export const COLLISION_CALL_GAIN_SCALE = 0.3;

// One recognizable comic sting keeps collision feedback consistent. The much
// quieter species call layered by game-audio still identifies the runner.
export const FAILURE_JINGLE = Object.freeze([
  note("sine", 220, 720, 0.14, 0, 0.36, 80),
  note("triangle", 740, 294, 0.28, 0.12, 0.3, 45),
  note("sine", 392, 165, 0.2, 0.31, 0.24, 34),
  note("triangle", 196, 73, 0.38, 0.46, 0.32, 18)
]);

export const ANIMAL_AUDIO_PROFILES = Object.freeze({
  trex: profile("audio/animal-calls/trex-alligator.ogg", 0.9, 0.75, 0.45, {
    playbackRate: 0.8,
    highpass: 35
  }),
  leopard: profile("audio/animal-calls/leopard.mp3", 0.82, 0.9, 0.18),
  rabbit: profile("audio/animal-calls/rabbit.wav", 0, 0.55, 0.22),
  lion: profile("audio/animal-calls/lion.ogg", 0.48, 0.88, 0.2),
  elephant: profile("audio/animal-calls/elephant.ogg", 1.18, 0.82, 0.12, { highpass: 35 }),
  giraffe: profile("audio/animal-calls/giraffe.oga", 5.35, 0.9, 0.5),
  panda: profile("audio/animal-calls/panda-growl.mp3", 0, 0.56, 0.22, { highpass: 55 }),
  fox: profile("audio/animal-calls/fox.mp3", 0.42, 0.92, 0.14),
  monkey: profile("audio/animal-calls/monkey.ogg", 0.04, 0.55, 0.18),
  penguin: profile("audio/animal-calls/penguin.ogg", 0.72, 0.9, 0.12),
  tiger: profile("audio/animal-calls/tiger.mp3", 0.3, 0.9, 0.2),
  eagle: profile("audio/animal-calls/eagle.ogg", 0, 0.8, 0.15),
  boar: profile("audio/animal-calls/boar-grunt.mp3", 0, 0.64, 0.2, { highpass: 55 }),
  godzilla: profile("audio/animal-calls/trex-alligator.ogg", 0.9, 0.8, 0.48, {
    playbackRate: 0.62,
    highpass: 30
  }),
  kong: profile("audio/animal-calls/kong-gorilla.mp3", 0, 1.3, 0.18, {
    playbackRate: 0.86,
    highpass: 55
  }),
  scar: profile("audio/animal-calls/scar-orangutan.mp3", 0, 1, 0.2, {
    playbackRate: 0.9,
    highpass: 55
  })
});

export function animalAudioProfile(id) {
  return ANIMAL_AUDIO_PROFILES[id] || ANIMAL_AUDIO_PROFILES.trex;
}

export class GroundCallTimer {
  constructor(intervalSeconds = GROUND_CALL_INTERVAL_SECONDS) {
    this.intervalSeconds = Number.isFinite(intervalSeconds) && intervalSeconds > 0
      ? intervalSeconds
      : GROUND_CALL_INTERVAL_SECONDS;
    this.elapsedSeconds = 0;
  }

  tick(dt, running) {
    if (!running || !Number.isFinite(dt) || dt <= 0) return false;
    this.elapsedSeconds += Math.min(dt, 0.25);
    if (this.elapsedSeconds + 1e-9 < this.intervalSeconds) return false;
    this.elapsedSeconds %= this.intervalSeconds;
    return true;
  }

  reset() {
    this.elapsedSeconds = 0;
  }
}
