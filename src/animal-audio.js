const note = (type, from, to, duration, delay, level, wobble) => Object.freeze({
  type,
  from,
  to,
  duration,
  delay,
  level,
  wobble
});

const profile = (file, start, duration, gain, failure, { playbackRate = 1, highpass = 0 } = {}) => Object.freeze({
  file,
  start,
  duration,
  gain,
  playbackRate,
  highpass,
  failure: Object.freeze(failure)
});

export const ANIMAL_AUDIO_PROFILES = Object.freeze({
  trex: profile("audio/animal-calls/trex-alligator.ogg", 0.9, 0.75, 0.45, [
    note("sawtooth", 152, 54, 0.38, 0, 0.16, 16),
    note("triangle", 96, 42, 0.58, 0.08, 0.25, 8),
    note("sine", 62, 36, 0.7, 0.2, 0.2, 4)
  ], { playbackRate: 0.8, highpass: 35 }),
  leopard: profile("audio/animal-calls/leopard.mp3", 0.82, 0.9, 0.18, [
    note("triangle", 784, 587, 0.12, 0, 0.17, 48),
    note("square", 554, 415, 0.13, 0.1, 0.08, 20),
    note("triangle", 392, 196, 0.3, 0.22, 0.2, 34)
  ]),
  rabbit: profile("audio/animal-calls/rabbit.wav", 0, 0.55, 0.22, [
    note("sine", 174, 698, 0.18, 0, 0.24, 84),
    note("triangle", 698, 233, 0.32, 0.15, 0.18, 56),
    note("sine", 294, 220, 0.16, 0.46, 0.1, 18)
  ]),
  lion: profile("audio/animal-calls/lion.ogg", 0.48, 0.88, 0.2, [
    note("sawtooth", 262, 196, 0.24, 0, 0.12, 10),
    note("sawtooth", 196, 147, 0.3, 0.18, 0.15, 14),
    note("triangle", 131, 55, 0.52, 0.42, 0.24, 22)
  ]),
  elephant: profile("audio/animal-calls/elephant.ogg", 1.18, 0.82, 0.12, [
    note("sawtooth", 220, 98, 0.42, 0, 0.13, 52),
    note("triangle", 165, 73, 0.5, 0.16, 0.2, 38),
    note("sine", 82, 49, 0.38, 0.54, 0.2, 9)
  ], { highpass: 35 }),
  giraffe: profile("audio/animal-calls/giraffe.oga", 5.35, 0.9, 0.5, [
    note("sine", 1175, 880, 0.11, 0, 0.14, 24),
    note("sine", 880, 659, 0.12, 0.12, 0.15, 20),
    note("triangle", 659, 330, 0.28, 0.25, 0.18, 30)
  ]),
  panda: profile("audio/animal-calls/panda.ogg", 0.78, 0.9, 0.2, [
    note("sine", 392, 294, 0.3, 0, 0.17, 7),
    note("triangle", 294, 220, 0.34, 0.2, 0.15, 12),
    note("sine", 147, 110, 0.55, 0.4, 0.2, 5)
  ]),
  fox: profile("audio/animal-calls/fox.mp3", 0.42, 0.92, 0.14, [
    note("square", 988, 740, 0.08, 0, 0.07, 26),
    note("triangle", 740, 494, 0.09, 0.09, 0.13, 38),
    note("triangle", 587, 247, 0.24, 0.2, 0.18, 44)
  ]),
  monkey: profile("audio/animal-calls/monkey.ogg", 0.04, 0.55, 0.18, [
    note("square", 523, 659, 0.09, 0, 0.08, 32),
    note("triangle", 659, 440, 0.11, 0.1, 0.14, 36),
    note("square", 392, 494, 0.09, 0.23, 0.07, 28),
    note("triangle", 494, 196, 0.26, 0.34, 0.18, 48)
  ]),
  penguin: profile("audio/animal-calls/penguin.ogg", 0.72, 0.9, 0.12, [
    note("sine", 1397, 1760, 0.18, 0, 0.12, 18),
    note("sine", 1175, 880, 0.24, 0.11, 0.14, 22),
    note("triangle", 880, 440, 0.34, 0.3, 0.17, 28)
  ]),
  tiger: profile("audio/animal-calls/tiger.mp3", 0.3, 0.9, 0.2, [
    note("sawtooth", 196, 147, 0.24, 0, 0.14, 18),
    note("triangle", 147, 98, 0.34, 0.18, 0.2, 24),
    note("sine", 82, 55, 0.48, 0.44, 0.18, 9)
  ]),
  eagle: profile("audio/animal-calls/eagle.ogg", 0, 0.8, 0.15, [
    note("triangle", 1760, 1319, 0.11, 0, 0.16, 72),
    note("sine", 1568, 1047, 0.16, 0.12, 0.14, 54),
    note("triangle", 988, 659, 0.25, 0.3, 0.13, 32)
  ]),
  boar: profile("audio/animal-calls/boar.ogg", 0, 0.65, 0.18, [
    note("square", 123, 92, 0.16, 0, 0.11, 21),
    note("sawtooth", 110, 73, 0.22, 0.13, 0.15, 17),
    note("triangle", 82, 49, 0.36, 0.32, 0.2, 8)
  ]),
  godzilla: profile("audio/animal-calls/trex-alligator.ogg", 0.9, 0.8, 0.48, [
    note("sawtooth", 98, 31, 0.58, 0, 0.2, 12),
    note("square", 55, 27, 0.7, 0.12, 0.12, 7),
    note("sine", 42, 24, 0.88, 0.25, 0.24, 3)
  ], { playbackRate: 0.62, highpass: 30 }),
  kong: profile("audio/animal-calls/monkey.ogg", 0.04, 0.55, 0.22, [
    note("square", 220, 165, 0.2, 0, 0.13, 16),
    note("triangle", 196, 131, 0.3, 0.18, 0.19, 12),
    note("sine", 98, 65, 0.5, 0.42, 0.22, 5)
  ], { playbackRate: 0.72 }),
  scar: profile("audio/animal-calls/monkey.ogg", 0.04, 0.55, 0.2, [
    note("square", 294, 196, 0.2, 0, 0.12, 22),
    note("sawtooth", 247, 123, 0.34, 0.17, 0.18, 17),
    note("triangle", 110, 41, 0.64, 0.42, 0.23, 9)
  ], { playbackRate: 0.82 })
});

export function animalAudioProfile(id) {
  return ANIMAL_AUDIO_PROFILES[id] || ANIMAL_AUDIO_PROFILES.trex;
}

export class GroundCallTimer {
  constructor(intervalSeconds = 5) {
    this.intervalSeconds = Number.isFinite(intervalSeconds) && intervalSeconds > 0
      ? intervalSeconds
      : 5;
    this.elapsedSeconds = 0;
  }

  tick(dt, running) {
    if (!running || !Number.isFinite(dt) || dt <= 0) return false;
    this.elapsedSeconds += Math.min(dt, 0.25);
    if (this.elapsedSeconds + Number.EPSILON * 32 < this.intervalSeconds) return false;
    this.elapsedSeconds %= this.intervalSeconds;
    return true;
  }

  reset() {
    this.elapsedSeconds = 0;
  }
}
