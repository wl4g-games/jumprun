import { animalAudioProfile, GroundCallTimer } from "./animal-audio.js";

function stopNode(node) {
  try {
    node?.stop();
  } catch {
    // A source may already have ended; stopping audio is intentionally idempotent.
  }
}

function disconnectNode(node) {
  try {
    node?.disconnect();
  } catch {
    // Some browser implementations throw when an already-disconnected node is reused.
  }
}

export function createGameAudio({ assetBase } = {}) {
  let context, master, muted = false, owned = false;
  let nextStarTime = 0, currentAnimalId = "trex", playbackEpoch = 0;
  const starVoices = new Set();
  const effectVoices = new Set();
  const sampleVoices = new Set();
  const buffers = new Map();
  const bufferLoads = new Map();
  const groundCallTimer = new GroundCallTimer();

  function finishVoice(collection, voice) {
    collection.delete(voice);
    disconnectNode(voice.source);
    disconnectNode(voice.gain);
    disconnectNode(voice.filter);
    disconnectNode(voice.lfo);
    disconnectNode(voice.depth);
  }

  function stopVoices(collection) {
    for (const voice of [...collection]) {
      stopNode(voice.source);
      stopNode(voice.lfo);
      finishVoice(collection, voice);
    }
  }

  function resetStars() {
    stopVoices(starVoices);
    nextStarTime = 0;
  }

  function resetEffects() {
    stopVoices(effectVoices);
    stopVoices(sampleVoices);
  }

  function attach(next, ownsContext = false) {
    if (!next || next.state === "closed" || context === next) return;
    playbackEpoch++;
    resetStars();
    resetEffects();
    buffers.clear();
    bufferLoads.clear();
    disconnectNode(master);
    if (owned && context) context.close().catch(() => {});
    context = next;
    owned = ownsContext;
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.45;
    master.connect(context.destination);
  }

  function audioUrl(file) {
    const base = assetBase || (typeof document === "undefined" ? "http://localhost/" : document.baseURI);
    return new URL(file, base).href;
  }

  async function loadAnimalBuffer(animalId) {
    const profile = animalAudioProfile(animalId);
    if (buffers.has(profile.file)) return buffers.get(profile.file);
    if (bufferLoads.has(profile.file)) return bufferLoads.get(profile.file);
    if (!context || context.state === "closed" || typeof fetch !== "function") return null;
    const targetContext = context;
    const load = fetch(audioUrl(profile.file))
      .then((response) => {
        if (!response.ok) throw new Error(`Animal audio ${response.status}`);
        return response.arrayBuffer();
      })
      .then((bytes) => targetContext.decodeAudioData(bytes))
      .then((buffer) => {
        if (context === targetContext) buffers.set(profile.file, buffer);
        return buffer;
      })
      .catch(() => null)
      .finally(() => bufferLoads.delete(profile.file));
    bufferLoads.set(profile.file, load);
    return load;
  }

  function primeAnimal(animalId) {
    if (context?.state === "running" && !muted) void loadAnimalBuffer(animalId);
  }

  async function unlock() {
    try {
      if (!context || context.state === "closed") {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        attach(new Audio(), true);
      }
      if (context.state !== "running") await context.resume();
      primeAnimal(currentAnimalId);
    } catch {
      // Audio is an enhancement; denied autoplay must never stop the game.
    }
  }

  function tone(type, from, to, duration, delay = 0, level = 0.35, wobble = 0, collection = effectVoices) {
    if (!context || context.state !== "running" || muted) return null;
    const start = context.currentTime + delay;
    const source = context.createOscillator();
    const gain = context.createGain();
    source.type = type;
    source.frequency.setValueAtTime(Math.max(1, from), start);
    source.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration);
    gain.gain.setValueAtTime(1e-4, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(1e-4, level), start + 0.012);
    gain.gain.exponentialRampToValueAtTime(1e-4, start + duration);
    source.connect(gain);
    gain.connect(master);

    let lfo, depth;
    if (wobble) {
      lfo = context.createOscillator();
      depth = context.createGain();
      lfo.frequency.value = 23;
      depth.gain.setValueAtTime(wobble, start);
      depth.gain.exponentialRampToValueAtTime(1, start + duration);
      lfo.connect(depth);
      depth.connect(source.frequency);
      lfo.start(start);
      lfo.stop(start + duration);
    }

    const voice = { source, gain, lfo, depth };
    collection.add(voice);
    source.onended = () => finishVoice(collection, voice);
    source.start(start);
    source.stop(start + duration + 0.02);
    return voice;
  }

  async function playAnimalCall(animalId, { delay = 0, gainScale = 1 } = {}) {
    if (!context || context.state !== "running" || muted) return;
    const epoch = playbackEpoch;
    const targetContext = context;
    const profile = animalAudioProfile(animalId);
    const buffer = await loadAnimalBuffer(animalId);
    if (!buffer || muted || context !== targetContext || context.state !== "running" || epoch !== playbackEpoch) return;
    const available = Math.max(0, buffer.duration - profile.start);
    const sourceDuration = Math.min(profile.duration, available);
    if (!(sourceDuration > 0)) return;

    const start = context.currentTime + delay;
    const audibleDuration = sourceDuration / profile.playbackRate;
    const release = Math.min(0.05, audibleDuration * 0.22);
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = profile.playbackRate;
    gain.gain.setValueAtTime(1e-4, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(1e-4, profile.gain * gainScale), start + 0.015);
    gain.gain.setValueAtTime(Math.max(1e-4, profile.gain * gainScale), Math.max(start + 0.015, start + audibleDuration - release));
    gain.gain.exponentialRampToValueAtTime(1e-4, start + audibleDuration);

    let filter = null;
    if (profile.highpass > 0) {
      filter = context.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = profile.highpass;
      source.connect(filter);
      filter.connect(gain);
    } else {
      source.connect(gain);
    }
    gain.connect(master);

    const voice = { source, gain, filter };
    sampleVoices.add(voice);
    source.onended = () => finishVoice(sampleVoices, voice);
    source.start(start, profile.start, sourceDuration);
    source.stop(start + audibleDuration + 0.025);
  }

  function beginRound(animalId) {
    playbackEpoch++;
    currentAnimalId = animalId;
    groundCallTimer.reset();
    resetStars();
    resetEffects();
    primeAnimal(currentAnimalId);
  }

  return {
    unlock,
    attach,
    resetStars,
    beginRound,
    update(dt, { animalId = currentAnimalId, runningOnGround = false } = {}) {
      if (animalId !== currentAnimalId) {
        playbackEpoch++;
        currentAnimalId = animalId;
        groundCallTimer.reset();
        primeAnimal(currentAnimalId);
      }
      if (groundCallTimer.tick(dt, runningOnGround)) void playAnimalCall(currentAnimalId);
    },
    stars(count) {
      if (!context || context.state !== "running" || muted || !Number.isFinite(count)) return;
      let at = Math.max(context.currentTime, nextStarTime);
      for (let index = 0; index < Math.floor(count); index++) {
        tone("sine", 1568, 1568, 0.14, at - context.currentTime, 0.35, 0, starVoices);
        at += 0.18;
      }
      nextStarTime = at;
    },
    get ready() {
      return context?.state === "running";
    },
    get muted() {
      return muted;
    },
    jump() {
      tone("sine", 135, 48, 0.1, 0, 0.38);
      tone("triangle", 180, 560, 0.23, 0, 0.45, 75);
      tone("sine", 440, 170, 0.27, 0.045, 0.18, 40);
    },
    clear() {
      tone("sine", 1046, 1108, 0.25, 0, 0.35);
      tone("sine", 1568, 1760, 0.42, 0.07, 0.25);
      tone("triangle", 2093, 2093, 0.15, 0.08, 0.07);
    },
    death(animalId = currentAnimalId) {
      const profile = animalAudioProfile(animalId);
      for (const event of profile.failure) {
        tone(event.type, event.from, event.to, event.duration, event.delay, event.level, event.wobble);
      }
      void playAnimalCall(animalId, { delay: 0.06, gainScale: 0.72 });
    },
    setMuted(value) {
      muted = Boolean(value);
      if (muted) {
        playbackEpoch++;
        resetStars();
        resetEffects();
      } else {
        primeAnimal(currentAnimalId);
      }
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.45, context.currentTime, 0.02);
    }
  };
}
