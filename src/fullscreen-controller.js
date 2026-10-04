const IMMERSIVE_CLASS = "is-immersive";

function nativeFullscreenElement(documentObject) {
  return documentObject.fullscreenElement || documentObject.webkitFullscreenElement || null;
}

function nativeRequest(root) {
  return root.requestFullscreen || root.webkitRequestFullscreen;
}

function nativeExit(documentObject) {
  return documentObject.exitFullscreen || documentObject.webkitExitFullscreen;
}

export function createFullscreenController(elements, options = {}) {
  const {
    root,
    buttons,
    status,
    documentObject = globalThis.document,
    screenObject = globalThis.screen
  } = elements;
  const {
    translate = (text) => text,
    setTimer = globalThis.setTimeout,
    clearTimer = globalThis.clearTimeout
  } = options;
  const controls = [...buttons];
  let fallbackActive = false;
  let orientationLocked = false;
  let pending = false;
  let statusTimer = null;
  let statusMessage = "";

  function mode() {
    if (nativeFullscreenElement(documentObject)) return "native";
    return fallbackActive ? "fallback" : "off";
  }

  function labelFor(currentMode = mode()) {
    if (currentMode === "native") return "退出全屏";
    if (currentMode === "fallback") return "退出沉浸显示";
    return "进入全屏";
  }

  function render() {
    const currentMode = mode();
    const active = currentMode !== "off";
    root.classList.toggle(IMMERSIVE_CLASS, active);
    if (currentMode === "off") delete root.dataset.fullscreenMode;
    else root.dataset.fullscreenMode = currentMode;
    for (const button of controls) {
      const label = translate(labelFor(currentMode));
      button.disabled = pending;
      button.dataset.i18nLabel = labelFor(currentMode);
      button.setAttribute("aria-label", label);
      button.setAttribute("aria-pressed", String(active));
      button.title = label;
    }
    if (status && statusMessage) status.textContent = translate(statusMessage);
    return currentMode;
  }

  function announce(message) {
    if (!status) return;
    if (statusTimer !== null) clearTimer(statusTimer);
    statusMessage = message;
    status.textContent = translate(statusMessage);
    statusTimer = setTimer(() => {
      statusMessage = "";
      status.textContent = "";
      statusTimer = null;
    }, 5000);
  }

  async function lockLandscape() {
    const lock = screenObject?.orientation?.lock;
    if (typeof lock !== "function") return;
    try {
      await lock.call(screenObject.orientation, "landscape");
      orientationLocked = true;
    } catch {
      orientationLocked = false;
    }
  }

  function unlockOrientation() {
    if (!orientationLocked) return;
    orientationLocked = false;
    try {
      const result = screenObject?.orientation?.unlock?.call(screenObject.orientation);
      if (result && typeof result.catch === "function") result.catch(() => {});
    } catch {
    }
  }

  function enableFallback() {
    fallbackActive = true;
    render();
    announce("沉浸显示已开启；iPhone 请手动旋转为横屏，再点一次右上角按钮即可退出。");
  }

  async function enter() {
    const request = nativeRequest(root);
    if (typeof request !== "function") {
      enableFallback();
      return;
    }
    try {
      await request.call(root);
      if (!nativeFullscreenElement(documentObject)) {
        enableFallback();
        return;
      }
      fallbackActive = false;
      await lockLandscape();
      if (!nativeFullscreenElement(documentObject)) {
        unlockOrientation();
        render();
        return;
      }
      render();
      announce("已进入全屏");
    } catch {
      enableFallback();
    }
  }

  async function exit() {
    fallbackActive = false;
    const exitFullscreen = nativeExit(documentObject);
    try {
      if (nativeFullscreenElement(documentObject) && typeof exitFullscreen === "function") {
        await exitFullscreen.call(documentObject);
      }
    } catch {
    }
    const currentMode = render();
    if (currentMode === "off") {
      unlockOrientation();
      announce("已退出全屏显示");
    }
  }

  async function toggle() {
    if (pending) return;
    pending = true;
    render();
    try {
      if (mode() === "off") await enter();
      else await exit();
    } finally {
      pending = false;
      render();
    }
  }

  function handleFullscreenChange() {
    if (nativeFullscreenElement(documentObject)) fallbackActive = false;
    else unlockOrientation();
    render();
  }

  function handleKeydown(event) {
    if (event.key !== "Escape" || !fallbackActive || nativeFullscreenElement(documentObject)) return;
    fallbackActive = false;
    render();
    announce("已退出全屏显示");
  }

  for (const button of controls) button.addEventListener("click", toggle);
  documentObject.addEventListener("fullscreenchange", handleFullscreenChange);
  documentObject.addEventListener("webkitfullscreenchange", handleFullscreenChange);
  documentObject.addEventListener("keydown", handleKeydown);
  render();

  return {
    toggle,
    mode,
    refreshLanguage: render,
    destroy() {
      for (const button of controls) button.removeEventListener("click", toggle);
      documentObject.removeEventListener("fullscreenchange", handleFullscreenChange);
      documentObject.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      documentObject.removeEventListener("keydown", handleKeydown);
      if (statusTimer !== null) clearTimer(statusTimer);
      unlockOrientation();
    }
  };
}

export { IMMERSIVE_CLASS };
