import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createFullscreenController, IMMERSIVE_CLASS } from "../src/fullscreen-controller.js";

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type, event = {}) {
    for (const listener of this.listeners.get(type) || []) listener(event);
  }
}

class FakeButton extends FakeEventTarget {
  constructor() {
    super();
    this.attributes = new Map();
    this.dataset = {};
    this.disabled = false;
    this.title = "";
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name);
  }
}

function fixture({ screenObject } = {}) {
  const classes = new Set();
  const documentObject = new FakeEventTarget();
  const root = {
    dataset: {},
    classList: {
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
      contains: (name) => classes.has(name)
    }
  };
  const buttons = [new FakeButton(), new FakeButton()];
  const status = { textContent: "" };
  const controller = createFullscreenController({ root, buttons, status, documentObject, screenObject }, {
    translate: (text) => `translated:${text}`,
    setTimer: () => 1,
    clearTimer: () => {}
  });
  return { controller, documentObject, root, buttons, status };
}

test("fullscreen controller uses the standard API and keeps every toggle synchronized", async () => {
  const { controller, documentObject, root, buttons, status } = fixture();
  root.requestFullscreen = async () => {
    documentObject.fullscreenElement = root;
    documentObject.dispatch("fullscreenchange");
  };
  documentObject.exitFullscreen = async () => {
    documentObject.fullscreenElement = null;
    documentObject.dispatch("fullscreenchange");
  };

  await controller.toggle();
  assert.equal(controller.mode(), "native");
  assert.equal(root.classList.contains(IMMERSIVE_CLASS), true);
  assert.equal(root.dataset.fullscreenMode, "native");
  assert.equal(status.textContent, "translated:已进入全屏");
  for (const button of buttons) {
    assert.equal(button.getAttribute("aria-pressed"), "true");
    assert.equal(button.getAttribute("aria-label"), "translated:退出全屏");
  }

  await controller.toggle();
  assert.equal(controller.mode(), "off");
  assert.equal(root.classList.contains(IMMERSIVE_CLASS), false);
  assert.equal(root.dataset.fullscreenMode, undefined);
  controller.destroy();
});

test("webkit-prefixed fullscreen API is supported", async () => {
  const { controller, documentObject, root } = fixture();
  root.webkitRequestFullscreen = async () => {
    documentObject.webkitFullscreenElement = root;
    documentObject.dispatch("webkitfullscreenchange");
  };
  documentObject.webkitExitFullscreen = async () => {
    documentObject.webkitFullscreenElement = null;
    documentObject.dispatch("webkitfullscreenchange");
  };

  await controller.toggle();
  assert.equal(controller.mode(), "native");
  await controller.toggle();
  assert.equal(controller.mode(), "off");
  controller.destroy();
});

test("native fullscreen locks landscape only when supported and unlocks it on exit", async () => {
  const calls = [];
  const screenObject = {
    orientation: {
      async lock(direction) {
        calls.push(["lock", direction]);
      },
      unlock() {
        calls.push(["unlock"]);
      }
    }
  };
  const { controller, documentObject, root } = fixture({ screenObject });
  root.requestFullscreen = async () => {
    documentObject.fullscreenElement = root;
  };
  documentObject.exitFullscreen = async () => {
    documentObject.fullscreenElement = null;
    documentObject.dispatch("fullscreenchange");
  };

  await controller.toggle();
  assert.deepEqual(calls, [["lock", "landscape"]]);
  await controller.toggle();
  assert.deepEqual(calls, [["lock", "landscape"], ["unlock"]]);
  controller.destroy();
});

test("orientation-lock rejection is harmless and never affects the CSS fallback", async () => {
  let attempts = 0;
  const screenObject = {
    orientation: {
      async lock() {
        attempts++;
        throw new Error("unsupported");
      },
      unlock() {
        throw new Error("should not be called");
      }
    }
  };
  const { controller } = fixture({ screenObject });

  await controller.toggle();
  assert.equal(controller.mode(), "fallback");
  assert.equal(attempts, 0);
  controller.destroy();
});

test("a rejected native exit leaves the control truthful and does not unlock too early", async () => {
  let unlocks = 0;
  const screenObject = {
    orientation: {
      async lock() {},
      async unlock() {
        unlocks++;
        throw new Error("ignored platform error");
      }
    }
  };
  const { controller, documentObject, root } = fixture({ screenObject });
  root.requestFullscreen = async () => {
    documentObject.fullscreenElement = root;
  };
  documentObject.exitFullscreen = async () => {
    throw new Error("browser kept fullscreen open");
  };

  await controller.toggle();
  await controller.toggle();
  assert.equal(controller.mode(), "native");
  assert.equal(unlocks, 0);

  documentObject.fullscreenElement = null;
  documentObject.dispatch("fullscreenchange");
  await Promise.resolve();
  assert.equal(controller.mode(), "off");
  assert.equal(unlocks, 1);
  controller.destroy();
});

test("unsupported fullscreen falls back to an explicit, escapable immersive view", async () => {
  const { controller, documentObject, root, buttons, status } = fixture();

  await controller.toggle();
  assert.equal(controller.mode(), "fallback");
  assert.equal(root.classList.contains(IMMERSIVE_CLASS), true);
  assert.match(status.textContent, /iPhone/);
  assert.equal(buttons[0].getAttribute("aria-label"), "translated:退出沉浸显示");

  documentObject.dispatch("keydown", { key: "Escape" });
  assert.equal(controller.mode(), "off");
  assert.equal(root.classList.contains(IMMERSIVE_CLASS), false);
  controller.destroy();
});

test("a rejected native request also falls back instead of leaving a dead control", async () => {
  const { controller, root } = fixture();
  root.requestFullscreen = async () => {
    throw new Error("not available on this device");
  };

  await controller.toggle();
  assert.equal(controller.mode(), "fallback");
  assert.equal(root.dataset.fullscreenMode, "fallback");
  controller.destroy();
});

test("the page exposes fullscreen controls and a compact two-column landscape quiz", async () => {
  const [html, css] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/style.css", import.meta.url), "utf8")
  ]);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /apple-mobile-web-app-capable" content="yes"/);
  assert.equal((html.match(/data-fullscreen-toggle/g) || []).length, 2);
  assert.match(css, /@media \(orientation: landscape\) and \(max-height: 560px\)/);
  assert.match(css, /\.quiz-answers\s*\{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /env\(safe-area-inset-right\)/);
});
