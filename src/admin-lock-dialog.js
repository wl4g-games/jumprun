import {
  hasAdminPassword,
  setAdminPassword,
  validateAdminPassword,
  verifyAdminPassword
} from "./admin-lock.js";
import { normalizeManualModeSettings } from "./manual-quiz-timer.js";

function normalizeQuizSettings(settings = {}) {
  const manualMode = normalizeManualModeSettings({
    enabled: true,
    durationMinutes: settings.durationMinutes,
    questionsToUnlock: settings.questionsToUnlock
  });
  return {
    lockEnabled: settings.lockEnabled !== false,
    durationMinutes: manualMode.durationMinutes,
    questionsToUnlock: manualMode.questionsToUnlock
  };
}

export function createAdminLockDialog(elements, options) {
  const {
    dialog,
    title,
    authPanel,
    settingsPanel,
    current,
    enabled,
    duration,
    correctCount,
    password,
    confirmRow,
    confirmation,
    feedback,
    cancel,
    save
  } = elements;
  const {
    translate,
    storage = globalThis.localStorage,
    cryptoProvider = globalThis.crypto,
    getQuizSettings,
    onSave
  } = options;
  let phase = "authenticate";
  let firstSetup = false;
  let saving = false;
  let feedbackKey = "";

  function renderCopy() {
    if (phase === "settings") {
      title.textContent = translate("高级答题设置");
      current.textContent = translate(enabled.checked ? "答题锁已启用" : "答题锁已停用");
      save.textContent = translate(saving ? "正在保存…" : "保存高级设置");
      return;
    }
    title.textContent = translate(firstSetup ? "设置管理员密码" : "验证管理员密码");
    save.textContent = translate(saving
      ? (firstSetup ? "正在设置…" : "正在验证…")
      : (firstSetup ? "设置密码并继续" : "验证并继续"));
  }

  function setBusy(busy) {
    saving = busy;
    for (const element of [password, confirmation, enabled, duration, correctCount, cancel, save]) {
      element.disabled = busy;
    }
    renderCopy();
  }

  function showFeedback(message) {
    feedbackKey = message;
    feedback.textContent = translate(message);
  }

  function clearFeedback() {
    feedbackKey = "";
    feedback.textContent = "";
  }

  function showAdvancedSettings() {
    const settings = normalizeQuizSettings(getQuizSettings?.());
    phase = "settings";
    authPanel.hidden = true;
    settingsPanel.hidden = false;
    enabled.checked = settings.lockEnabled;
    duration.value = String(settings.durationMinutes);
    correctCount.value = String(settings.questionsToUnlock);
    clearFeedback();
    renderCopy();
    enabled.focus?.();
  }

  function open() {
    phase = "authenticate";
    firstSetup = !hasAdminPassword(storage);
    authPanel.hidden = false;
    settingsPanel.hidden = true;
    password.value = "";
    confirmation.value = "";
    password.autocomplete = firstSetup ? "new-password" : "current-password";
    confirmation.autocomplete = firstSetup ? "new-password" : "off";
    confirmRow.hidden = !firstSetup;
    clearFeedback();
    setBusy(false);
    if (!dialog.open) dialog.showModal();
    password.focus();
  }

  async function authenticate() {
    if (firstSetup && !validateAdminPassword(password.value)) {
      showFeedback("管理员密码至少需要 6 位");
      return;
    }
    if (firstSetup && password.value !== confirmation.value) {
      showFeedback("两次输入的密码不一致");
      return;
    }
    setBusy(true);
    let accepted = false;
    try {
      accepted = firstSetup
        ? await setAdminPassword(password.value, storage, cryptoProvider)
        : await verifyAdminPassword(password.value, storage, cryptoProvider);
    } catch {
      accepted = false;
    }
    setBusy(false);
    if (!accepted) {
      showFeedback(firstSetup ? "管理员密码保存失败" : "管理员密码错误");
      password.select();
      return;
    }
    password.value = "";
    confirmation.value = "";
    firstSetup = false;
    showAdvancedSettings();
  }

  async function saveSettings() {
    const settings = normalizeQuizSettings({
      lockEnabled: enabled.checked,
      durationMinutes: duration.value,
      questionsToUnlock: correctCount.value
    });
    setBusy(true);
    let accepted = true;
    try {
      accepted = await onSave?.(settings) !== false;
    } catch {
      accepted = false;
    }
    setBusy(false);
    if (!accepted) {
      showFeedback("高级设置保存失败");
      return;
    }
    dialog.close();
  }

  function submit() {
    if (saving) return;
    return phase === "settings" ? saveSettings() : authenticate();
  }

  cancel.onclick = () => dialog.close();
  save.onclick = submit;
  enabled.addEventListener("change", renderCopy);
  dialog.addEventListener("cancel", (event) => {
    if (saving) event.preventDefault();
  });
  for (const field of [password, confirmation]) {
    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submit();
      }
    });
  }

  return Object.freeze({
    open,
    refreshLanguage() {
      renderCopy();
      if (feedbackKey) feedback.textContent = translate(feedbackKey);
    }
  });
}
