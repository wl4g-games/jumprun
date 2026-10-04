import { scoreShare } from "./share-score.js";
import { createShareCard, canShareImage } from "./share-card.js";
import { t, applyLanguage, toggleLanguage, getLanguage } from "./i18n.js";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { createDinoGame } from "./dino-game.js";
import { createRunnerScene } from "./runner-scene.js";
import { LearnedJumpDetector } from "./learned-jump-detector.js";
import { validateModel } from "./jump-features.js";
import { renderReadyAnimal } from "./ready-animal.js";
import { personReady } from "./person-ready.js";
import { motionHint, prepareMotion } from "./motion-startup.js";
import { menuJump } from "./menu-jump.js";
import { createGameAudio } from "./game-audio.js";
import { ANIMALS, animalById } from "./animal-catalog.js";
import { hasSavedGameSettings, loadGameSettings, saveGameSettings } from "./game-settings.js";
import { ManualQuizTimer } from "./manual-quiz-timer.js";
import { createQuizLockStateStore } from "./quiz-lock-state.js";
import { createAdminLockDialog } from "./admin-lock-dialog.js";
import { createQuizDialog } from "./quiz-dialog.js";
import { localizeQuestion } from "./question-bank.js";
import { drawPoseOverlay } from "./pose-overlay.js";
import "./style.css";
const $ = (id) => document.getElementById(id);
const video = $("video"), game = createDinoGame(), detector = new LearnedJumpDetector();
let startupComplete = hasSavedGameSettings();
let gameSettings = loadGameSettings();
let draftSettings = structuredClone(gameSettings);
const quizLockState = createQuizLockStateStore();
const quizTimer = new ManualQuizTimer(gameSettings.manualMode, quizLockState);
let stream = null, model = null, modelPromise = null, generation = 0, view = null;
let previousVideoTime = -1, lastInference = 0, lastFrame = 0, lastTracked = -Infinity;
let inferenceFrame = null, inferenceFrameType = "";
let cameraPhase = "off";
let mode = gameSettings.manualMode.enabled ? "manual" : "camera";
let tracking = { tracked: false, ready: false }, best = 0;
let resumeAt = 0, wasActive = false;
const audio = createGameAudio();
let readyAnimalView = null, sharing = false;
let gameOverAt = -Infinity;
let heardJumps = 0, heardDeath = false, heardScore = 0, scoreFlashUntil = 0;
window.addEventListener("pointerdown", (event) => {
  if (!event.target.closest("#sound-button")) audio.unlock();
});
window.addEventListener("keydown", (event) => {
  if (!event.target.closest("#sound-button")) audio.unlock();
});
window.addEventListener("click", (event) => {
  if (!event.target.closest("#sound-button")) audio.unlock();
});
try {
  best = Number(localStorage.getItem("bunny-run-accuracy-stars-best")) || 0;
} catch {
}
let cameraStatus = () => t("\u6444\u50CF\u5934\u672A\u5F00\u542F");
const status = (message) => {
  cameraStatus = typeof message === "function" ? message : () => t(message);
  $("camera-status").textContent = cameraStatus();
};
applyLanguage();
const setupDialog = $("setup-dialog");
const adminLockDialogElement = $("admin-lock-dialog");
const quiz = createQuizDialog({
  dialog: $("quiz-dialog"),
  subject: $("quiz-subject"),
  progress: $("quiz-progress"),
  prompt: $("quiz-prompt"),
  answers: $("quiz-answers"),
  feedback: $("quiz-feedback")
}, {
  translate: t,
  localizeQuestion: (item) => localizeQuestion(item, getLanguage()),
  onUnlocked: () => {
    quizTimer.unlock();
    lastFrame = 0;
    audio.clear();
    $("game-canvas").focus({ preventScroll: true });
  }
});
const adminLock = createAdminLockDialog({
  dialog: adminLockDialogElement,
  title: $("admin-lock-title"),
  current: $("admin-lock-current"),
  enabled: $("admin-lock-enabled"),
  password: $("admin-password"),
  confirmRow: $("admin-password-confirm-row"),
  confirmation: $("admin-password-confirm"),
  feedback: $("admin-lock-feedback"),
  cancel: $("admin-lock-cancel"),
  save: $("admin-lock-save")
}, {
  stateStore: quizLockState,
  translate: t,
  onChanged: (enabled) => {
    quizTimer.setLockEnabled(enabled);
    if (!enabled) quiz.dismiss();
    refreshSettingsSummary();
    refreshControlUi();
    refreshQuizHud();
    refreshAdminLockUi();
    lastFrame = 0;
    showPendingQuiz();
  }
});

function showPendingQuiz() {
  if (!startupComplete || !gameSettings.manualMode.enabled || !quizTimer.shouldBlock()) return;
  if (setupDialog.open || adminLockDialogElement.open || quiz.isOpen()) return;
  quiz.start(gameSettings.manualMode.questionsToUnlock);
}

function applyAnimal(id) {
  const animal = animalById(id);
  $("brand-animal").textContent = animal.emoji;
  view?.setAnimal(animal.id);
  readyAnimalView?.setAnimal(animal.id);
  return animal;
}

function selectDraftAnimal(id) {
  draftSettings.animalId = animalById(id).id;
  for (const button of $("animal-picker").querySelectorAll("button")) {
    button.setAttribute("aria-checked", String(button.dataset.animalId === draftSettings.animalId));
  }
  applyAnimal(draftSettings.animalId);
}

function createAnimalPicker() {
  const choices = ANIMALS.map((animal) => {
    const button = document.createElement("button");
    const emoji = document.createElement("span");
    const copy = document.createElement("span");
    const name = document.createElement("b");
    const description = document.createElement("small");
    button.type = "button";
    button.className = "animal-choice";
    button.dataset.animalId = animal.id;
    button.setAttribute("role", "radio");
    emoji.className = "animal-emoji";
    emoji.textContent = animal.emoji;
    name.className = "animal-name";
    description.className = "animal-tagline";
    copy.append(name, description);
    button.append(emoji, copy);
    button.onclick = () => selectDraftAnimal(animal.id);
    return button;
  });
  $("animal-picker").replaceChildren(...choices);
  refreshAnimalPickerLanguage();
}

function refreshAnimalPickerLanguage() {
  const english = document.documentElement.lang === "en";
  for (const button of $("animal-picker").querySelectorAll("button")) {
    const animal = animalById(button.dataset.animalId);
    button.querySelector(".animal-name").textContent = english ? animal.englishName : animal.name;
    button.querySelector(".animal-tagline").textContent = english ? animal.englishTagline : animal.tagline;
  }
}

function updateManualModeControls() {
  const enabled = $("manual-mode-enabled").checked;
  $("quiz-duration").disabled = !enabled;
  $("quiz-correct-count").disabled = !enabled;
  $("manual-mode-enabled").closest(".manual-mode-config").classList.toggle("is-disabled", !enabled);
}

function fillSetup(settings) {
  draftSettings = structuredClone(settings);
  $("manual-mode-enabled").checked = draftSettings.manualMode.enabled;
  $("quiz-duration").value = String(draftSettings.manualMode.durationMinutes);
  $("quiz-correct-count").value = String(draftSettings.manualMode.questionsToUnlock);
  updateManualModeControls();
  selectDraftAnimal(draftSettings.animalId);
}

function refreshSettingsSummary() {
  const animal = animalById(gameSettings.animalId);
  const animalName = getLanguage() === "en" ? animal.englishName : animal.name;
  const manual = gameSettings.manualMode;
  const quizRule = getLanguage() === "en"
    ? `${manual.durationMinutes} min · ${manual.questionsToUnlock} correct`
    : `${manual.durationMinutes} 分钟 · 答对 ${manual.questionsToUnlock} 题`;
  const control = manual.enabled
    ? `${t("手动模式")} · ${quizTimer.lockEnabled ? quizRule : t("答题锁已停用")}`
    : `${t("体感模式")} · ${t("前置摄像头")}`;
  $("settings-summary").textContent = `${animal.emoji} ${animalName} · ${control}`;
}

function refreshAdminLockUi() {
  const copy = t(quizTimer.lockEnabled ? "答题锁已启用" : "答题锁已停用");
  for (const element of document.querySelectorAll(".admin-lock-status")) element.textContent = copy;
}

function refreshControlUi() {
  const manual = gameSettings.manualMode.enabled;
  for (const element of document.querySelectorAll(".motion-only")) element.hidden = manual;
  let instruction = "体感模式：面对前置摄像头，原地跳一下即可开始、跳跃或重来；无需答题。";
  if (manual) {
    instruction = quizTimer.lockEnabled
      ? "手动模式：按空格、↑ 或点按游戏画面开始、跳跃或重来；到时必须答题。"
      : "手动模式：按空格、↑ 或点按游戏画面开始、跳跃或重来；管理员已停用答题锁。";
  }
  $("control-instructions").textContent = t(instruction);
}

function refreshQuizHud() {
  const score = $("manual-quiz-time").closest(".quiz-score");
  score.hidden = !gameSettings.manualMode.enabled || !quizTimer.lockEnabled;
  $("manual-quiz-time").textContent = quizTimer.formattedRemaining();
  $("quiz-timer-label").textContent = t("答题倒计时");
  score.classList.toggle("is-warning", quizTimer.remainingSeconds <= 60);
}

function openSetup() {
  fillSetup(gameSettings);
  $("setup-cancel").hidden = !startupComplete;
  if (!setupDialog.open) setupDialog.showModal();
}

function interactionBlocked() {
  return !startupComplete || setupDialog.open || adminLockDialogElement.open || quiz.isOpen() || sharing;
}

createAnimalPicker();
fillSetup(gameSettings);
refreshSettingsSummary();
refreshControlUi();
refreshQuizHud();
refreshAdminLockUi();
$("manual-mode-enabled").onchange = updateManualModeControls;
$("open-setup").onclick = openSetup;
for (const button of document.querySelectorAll(".admin-lock-open")) button.onclick = adminLock.open;
$("setup-cancel").onclick = () => {
  applyAnimal(gameSettings.animalId);
  setupDialog.close();
};
setupDialog.addEventListener("cancel", (event) => {
  if (!startupComplete) event.preventDefault();
  else applyAnimal(gameSettings.animalId);
});
setupDialog.addEventListener("close", showPendingQuiz);
$("setup-start").onclick = () => {
  gameSettings = saveGameSettings({
    animalId: draftSettings.animalId,
    manualMode: {
      enabled: $("manual-mode-enabled").checked,
      durationMinutes: Number($("quiz-duration").value),
      questionsToUnlock: Number($("quiz-correct-count").value)
    }
  });
  quizTimer.configure(gameSettings.manualMode);
  applyAnimal(gameSettings.animalId);
  startupComplete = true;
  setupDialog.close();
  refreshSettingsSummary();
  refreshControlUi();
  refreshQuizHud();
  refreshAdminLockUi();
  lastFrame = 0;
  if (gameSettings.manualMode.enabled) {
    mode = "manual";
    stopCamera();
  } else {
    mode = "camera";
    if (!stream) startCamera();
  }
};
function switchLanguage() {
  toggleLanguage();
  $("camera-status").textContent = cameraStatus();
  updateSensitivity();
  refreshAnimalPickerLanguage();
  refreshSettingsSummary();
  refreshControlUi();
  refreshQuizHud();
  refreshAdminLockUi();
  adminLock.refreshLanguage();
  quiz.refreshLanguage();
}
for (const button of document.querySelectorAll("[data-language-switch]")) button.onclick = switchLanguage;
async function loadModel() {
  if (!modelPromise) modelPromise = (async () => {
    const root = import.meta.env.BASE_URL;
    const vision = await FilesetResolver.forVisionTasks(`${root}vendor/mediapipe/wasm`);
    const response = await fetch(`${root}models/jump-visible-mlp.json`);
    if (!response.ok) throw new Error("Could not load jump model");
    const jump = validateModel(await response.json());
    const pose = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: `${root}models/pose_landmarker_lite.task`, delegate: "CPU" },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    return { pose, jump };
  })().catch((error) => {
    modelPromise = null;
    throw error;
  });
  const loaded = await modelPromise;
  detector.setModel(loaded.jump);
  model = loaded.pose;
}
const cameraConstraints = (facingMode) => ({
  audio: false,
  video: {
    facingMode,
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 30, max: 30 }
  }
});

async function openFrontCamera() {
  try {
    return await navigator.mediaDevices.getUserMedia(cameraConstraints({ exact: "user" }));
  } catch (error) {
    if (!["OverconstrainedError", "NotFoundError"].includes(error.name)) throw error;
    return navigator.mediaDevices.getUserMedia(cameraConstraints({ ideal: "user" }));
  }
}

function stopInferenceLoop() {
  if (inferenceFrame === null) return;
  if (inferenceFrameType === "video") video.cancelVideoFrameCallback?.(inferenceFrame);
  else cancelAnimationFrame(inferenceFrame);
  inferenceFrame = null;
  inferenceFrameType = "";
}

function startInferenceLoop(token) {
  stopInferenceLoop();
  const schedule = () => {
    if (token !== generation || cameraPhase !== "tracking") return;
    if (typeof video.requestVideoFrameCallback === "function") {
      inferenceFrameType = "video";
      inferenceFrame = video.requestVideoFrameCallback(() => {
        inferenceFrame = null;
        infer(performance.now());
        schedule();
      });
    } else {
      inferenceFrameType = "animation";
      inferenceFrame = requestAnimationFrame((now) => {
        inferenceFrame = null;
        infer(now);
        schedule();
      });
    }
  };
  schedule();
}
function resetTracking() {
  detector.reset();
  tracking = { tracked: false, ready: false };
  lastTracked = -Infinity;
  wasActive = false;
  resumeAt = 0;
}
function stopCamera() {
  generation++;
  stopInferenceLoop();
  cameraPhase = "off";
  stream?.getTracks().forEach((t2) => t2.stop());
  stream = null;
  video.srcObject = null;
  video.hidden = true;
  $("pose-overlay").hidden = true;
  previousVideoTime = -1;
  resetTracking();
  $("start-button").disabled = false;
  $("stop-button").disabled = true;
  $("live-dot").classList.remove("active");
  status("\u6444\u50CF\u5934\u672A\u5F00\u542F");
}
function errorMessage(error) {
  if (error.name === "NotAllowedError") return t("\u8BF7\u5728\u6D4F\u89C8\u5668\u5730\u5740\u680F\u5141\u8BB8\u6444\u50CF\u5934\u6743\u9650\uFF0C\u518D\u8BD5\u4E00\u6B21\u3002");
  if (error.name === "NotFoundError") return t("\u6CA1\u6709\u627E\u5230\u6444\u50CF\u5934\uFF0C\u8BF7\u68C0\u67E5\u8FDE\u63A5\u3002");
  if (error.name === "NotReadableError") return t("\u6444\u50CF\u5934\u6B63\u88AB\u5176\u4ED6\u5E94\u7528\u5360\u7528\uFF0C\u8BF7\u5173\u95ED\u5360\u7528\u540E\u91CD\u8BD5\u3002");
  return `${t("\u6444\u50CF\u5934\u6216\u6A21\u578B\u542F\u52A8\u5931\u8D25")}: ${error.message}`;
}
async function startCamera() {
  stopCamera();
  mode = "camera";
  const token = generation;
  cameraPhase = "connecting";
  $("start-button").disabled = true;
  $("stop-button").disabled = false;
  status("\u6B63\u5728\u8FDE\u63A5\u6444\u50CF\u5934\u2026");
  try {
    if (!isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error(t("\u8BF7\u7528 localhost \u6216 HTTPS \u6253\u5F00\u3002"));
    const next = await openFrontCamera();
    if (token !== generation) {
      next.getTracks().forEach((t2) => t2.stop());
      return;
    }
    stream = next;
    video.srcObject = next;
    next.getVideoTracks()[0].addEventListener("ended", () => {
      if (stream === next) {
        stopCamera();
        status("摄像头已断开，请重新开启前置摄像头。");
      }
    });
    video.hidden = false;
    cameraPhase = "loading";
    status("\u6B63\u5728\u51C6\u5907\u52A8\u4F5C\u8BC6\u522B\u2026");
    await prepareMotion({
      play: () => video.play(),
      load: loadModel,
      isCurrent: () => token === generation,
      ready: () => {
        resetTracking();
        previousVideoTime = -1;
        cameraPhase = "tracking";
        audio.unlock();
        $("live-dot").classList.add("active");
        status("\u8BF7\u8BA9\u5934\u90E8\u6216\u80A9\u8180\u8FDB\u5165\u955C\u5934");
        startInferenceLoop(token);
      }
    });
  } catch (error) {
    if (token !== generation) return;
    stopCamera();
    status(() => errorMessage(error));
  }
}
function infer(now) {
  if (mode !== "camera" || cameraPhase !== "tracking" || !stream || !model || video.readyState < 2 || now - lastInference < 16 || video.currentTime === previousVideoTime || document.hidden) return;
  lastInference = now;
  previousVideoTime = video.currentTime;
  try {
    const points = model.detectForVideo(video, now).landmarks[0];
    tracking = detector.update(points, now, Number($("sensitivity").value));
    if (tracking.tracked) lastTracked = performance.now();
    status(!tracking.tracked ? "\u8BF7\u8BA9\u5934\u90E8\u6216\u80A9\u8180\u8FDB\u5165\u955C\u5934" : !tracking.ready ? "\u8BF7\u7AD9\u7A33\u7247\u523B\uFF0C\u6B63\u5728\u6821\u51C6\u2026" : "\u52A8\u4F5C\u8BC6\u522B\u5DF2\u5C31\u7EEA");
    const started = !interactionBlocked() && menuJump(game.state.phase, tracking, now, gameOverAt);
    if (started) {
      audio.clear();
      $("game-card").classList.remove("ready-unlocked");
      void $("game-card").offsetWidth;
      $("game-card").classList.add("ready-unlocked");
      startGame("camera", true);
    }
    drawPoseOverlay($("pose-overlay"), video, points);
    $("tracking-status").textContent = !tracking.tracked ? t("\u672A\u8BC6\u522B") : !tracking.ready ? t("\u6821\u51C6\u4E2D\u2026") : `${t("\u5DF2\u8BC6\u522B")} ${t(tracking.source)}`;
    if (!interactionBlocked() && !started && game.state.phase === "playing" && tracking.jump && wasActive && now >= resumeAt) game.jump();
  } catch (error) {
    stopCamera();
    status(() => `${t("\u52A8\u4F5C\u8BC6\u522B\u4E2D\u65AD")}: ${error.message}`);
  }
}
function startGame(nextMode, keepTracking = false) {
  if (!startupComplete) {
    openSetup();
    return;
  }
  if (nextMode === "manual" && quizTimer.shouldBlock()) {
    quiz.start(gameSettings.manualMode.questionsToUnlock);
    return;
  }
  mode = nextMode;
  game.start();
  audio.beginRound(gameSettings.animalId);
  heardJumps = heardScore = 0;
  heardDeath = false;
  scoreFlashUntil = 0;
  $("game-card").classList.remove("crashed");
  wasActive = false;
  resumeAt = 0;
  $("game-canvas").focus({ preventScroll: true });
  if (mode === "camera" && !keepTracking) resetTracking();
  if (keepTracking) {
    wasActive = true;
    resumeAt = 0;
  }
}
$("start-button").onclick = () => {
  if (gameSettings.manualMode.enabled) return;
  audio.unlock();
  startCamera();
};
$("camera-enable").onclick = () => {
  if (!gameSettings.manualMode.enabled && !$("start-button").disabled) {
    audio.unlock();
    startCamera();
  }
};
$("stop-button").onclick = stopCamera;
$("play-button").onclick = () => {
  if (gameSettings.manualMode.enabled) {
    startGame("manual");
  } else {
    startGame("camera");
    if (!stream) startCamera();
  }
};
$("recalibrate").onclick = resetTracking;
let shareImageUrl = null, shareFile = null, sharePayload = null;
$("share-button").onclick = async () => {
  if (sharing || !view || setupDialog.open || quiz.isOpen()) return;
  sharing = true;
  $("share-button").disabled = true;
  $("share-status").textContent = t("\u6B63\u5728\u751F\u6210\u6210\u7EE9\u5361\u2026");
  try {
    const score = Math.max(best, game.state.score);
    const scenePicture = view.captureShareBackground();
    const blob = await createShareCard(score, t, scenePicture);
    shareFile = new File([blob], "jump-run-best.png", { type: "image/png" });
    sharePayload = scoreShare(score, t, location.href);
    shareImageUrl = URL.createObjectURL(blob);
    $("share-preview").src = shareImageUrl;
    $("share-download").href = shareImageUrl;
    $("share-image-button").hidden = !canShareImage(navigator, shareFile);
    $("share-image-status").textContent = "";
    $("share-status").textContent = "";
    $("share-dialog").showModal();
  } catch {
    $("share-status").textContent = t("\u751F\u6210\u5931\u8D25\uFF0C\u8BF7\u518D\u8BD5\u4E00\u6B21");
    sharing = false;
    $("share-button").disabled = false;
  }
};
$("share-image-button").onclick = async () => {
  if (!shareFile) return;
  $("share-image-button").disabled = true;
  try {
    await navigator.share({ ...sharePayload, files: [shareFile] });
  } catch (error) {
    if (error.name !== "AbortError") $("share-image-status").textContent = t("\u8BF7\u4FDD\u5B58\u56FE\u7247\u540E\u5206\u4EAB");
  } finally {
    $("share-image-button").disabled = false;
  }
};
$("share-dialog").addEventListener("close", () => {
  sharing = false;
  $("share-button").disabled = false;
  shareFile = null;
  sharePayload = null;
  if (shareImageUrl) {
    URL.revokeObjectURL(shareImageUrl);
    shareImageUrl = null;
  }
  $("share-preview").removeAttribute("src");
  $("share-download").removeAttribute("href");
});
$("sound-button").onclick = async () => {
  if (audio.ready || audio.muted) audio.setMuted(!audio.muted);
  await audio.unlock();
};
function updateSensitivity() {
  const value = Number($("sensitivity").value);
  $("sensitivity-value").textContent = value < 0.9 ? t("\u8F83\u4F4E") : value > 1.15 ? t("\u8F83\u9AD8") : t("\u6807\u51C6");
}
$("sensitivity").oninput = () => {
  updateSensitivity();
  resetTracking();
};
window.addEventListener("keydown", (event) => {
  if (!gameSettings.manualMode.enabled || !view || !["Space", "ArrowUp"].includes(event.code) || event.target.isContentEditable || /INPUT|SELECT|BUTTON|TEXTAREA|SUMMARY/.test(event.target.tagName)) return;
  event.preventDefault();
  if (event.repeat || document.hidden || interactionBlocked()) return;
  if (game.state.phase !== "playing") {
    startGame("manual");
    return;
  }
  game.jump();
});
$("game-canvas").addEventListener("pointerdown", () => {
  if (!gameSettings.manualMode.enabled || interactionBlocked()) return;
  if (game.state.phase !== "playing") startGame("manual");
  else game.jump();
});
window.addEventListener("pagehide", () => {
  quizTimer.persist(true);
  stopCamera();
});
document.addEventListener("visibilitychange", () => {
  lastFrame = 0;
  resetTracking();
});
function frame(now) {
  requestAnimationFrame(frame);
  const dt = lastFrame ? (now - lastFrame) / 1e3 : 0;
  lastFrame = now;
  const soundButton = $("sound-button");
  soundButton.textContent = audio.muted ? "\u{1F507}" : audio.ready ? "\u{1F50A}" : "\u{1F508}";
  soundButton.title = audio.muted ? t("\u5F00\u542F\u97F3\u6548") : audio.ready ? t("\u9759\u97F3") : t("\u70B9\u51FB\u5F00\u542F\u97F3\u6548");
  soundButton.setAttribute("aria-label", soundButton.title);
  soundButton.setAttribute("aria-pressed", String(audio.muted));
  const gestureMenu = !interactionBlocked() && Boolean(game.state.phase === "idle" || game.state.phase === "over" && now - gameOverAt >= 800);
  const restarting = game.state.phase === "over";
  $("gesture-guide").hidden = !gestureMenu;
  const guideText = gameSettings.manualMode.enabled
    ? restarting ? "按空格或点按画面重新开始" : "按空格或点按画面开始"
    : motionHint(cameraPhase, tracking, performance.now() - lastTracked < 200, restarting);
  const caption = $("gesture-guide").querySelector("small");
  caption.dataset.i18n = guideText;
  caption.textContent = t(guideText);
  for (const element of [$("gesture-guide"), $("ready-animal")]) {
    element.dataset.i18nLabel = guideText;
    element.setAttribute("aria-label", t(guideText));
  }
  readyAnimalView?.render(now, gestureMenu && !document.hidden, gameSettings.manualMode.enabled || cameraPhase === "tracking" && tracking.ready && tracking.tracked);
  $("gesture-fill").style.height = "0%";
  $("gesture-guide").classList.remove("filling");
  const ready = !document.hidden && personReady(mode, Boolean(stream), tracking, now, lastTracked);
  if (!ready) wasActive = false;
  if (ready && !wasActive) {
    resumeAt = now + (mode === "camera" && stream && game.state.phase === "playing" ? 600 : 0);
    wasActive = true;
  }
  let active = ready && now >= resumeAt && !interactionBlocked();
  if (quizTimer.tick(dt, mode === "manual" && game.state.phase === "playing" && active)) {
    active = false;
    wasActive = false;
    quiz.start(gameSettings.manualMode.questionsToUnlock);
  }
  game.step(dt, active);
  audio.update(Math.min(dt, 0.25), {
    animalId: gameSettings.animalId,
    runningOnGround: active && game.state.phase === "playing" && game.state.y === 0 && game.state.vy === 0
  });
  if (game.state.jumps > heardJumps) {
    audio.jump();
    heardJumps = game.state.jumps;
  }
  if (game.state.score > heardScore) {
    audio.stars(game.state.score - heardScore);
    heardScore = game.state.score;
    scoreFlashUntil = now + 700;
  }
  if (game.state.phase === "over" && !heardDeath) {
    audio.death(gameSettings.animalId);
    heardDeath = true;
    gameOverAt = now;
    $("game-card").classList.add("crashed");
  }
  $("score").classList.toggle("score-flash", now < scoreFlashUntil);
  if (game.state.phase === "over" && game.state.score > best) {
    best = game.state.score;
    try {
      localStorage.setItem("bunny-run-accuracy-stars-best", String(best));
    } catch {
    }
  }
  view?.render(game.state, now, game.state.phase === "playing" && !active);
  $("speed").textContent = `${(game.state.speed / 280).toFixed(2)}\xD7`;
  $("score").textContent = String(game.state.score).padStart(5, "0");
  $("best").textContent = String(best).padStart(5, "0");
  refreshQuizHud();
  $("play-button").textContent = game.state.phase === "idle" ? t("\u5F00\u59CB") : t("\u91CD\u6765");
  const message = !view ? t("\u52A0\u8F7D\u4E2D\u2026") : game.state.phase === "idle" ? "" : game.state.phase === "over" ? "" : !ready ? t(cameraPhase === "loading" ? "\u6B63\u5728\u51C6\u5907\u52A8\u4F5C\u8BC6\u522B\u2026" : tracking.tracked && !tracking.ready ? "\u8BF7\u7AD9\u7A33\u7247\u523B\uFF0C\u6B63\u5728\u6821\u51C6\u2026" : "\u68C0\u6D4B\u4E0D\u5230\u4EBA\u7269") : sharing ? "" : !active ? `${Math.ceil((resumeAt - now) / 1e3)}` : "";
  const cameraAction = Boolean(!gameSettings.manualMode.enabled && view && !stream);
  $("camera-enable").hidden = !cameraAction;
  $("camera-enable").disabled = $("start-button").disabled;
  $("camera-enable").textContent = $("start-button").disabled ? t("\u6B63\u5728\u8FDE\u63A5\u2026") : t("\u5F00\u542F\u6444\u50CF\u5934");
  $("game-message").textContent = cameraAction ? "" : message;
  $("game-message").hidden = !$("game-message").textContent;
  $("game-overlay").hidden = !message && !cameraAction && !gestureMenu;
}
renderReadyAnimal($("ready-animal"), gameSettings.animalId).then((result) => {
  readyAnimalView = result;
}).catch(() => {
  $("ready-animal").hidden = true;
});
createRunnerScene($("game-canvas"), gameSettings.animalId).then((scene) => {
  view = scene;
  view.setAnimal(gameSettings.animalId);
  $("play-button").disabled = false;
  requestAnimationFrame(frame);
  audio.unlock();
}).catch((error) => {
  $("game-message").textContent = `${t("3D \u52A8\u7269\u52A0\u8F7D\u5931\u8D25")}: ${error.message}. ${t("\u8BF7\u5237\u65B0\u91CD\u8BD5\u3002")}`;
});
if (startupComplete) {
  if (gameSettings.manualMode.enabled) {
    mode = "manual";
    showPendingQuiz();
  }
  else startCamera();
} else {
  openSetup();
}
