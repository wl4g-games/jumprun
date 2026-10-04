import {
  hasAdminPassword,
  setAdminPassword,
  validateAdminPassword,
  verifyAdminPassword
} from "./admin-lock.js";

export function createAdminLockDialog(elements, options) {
  const {
    dialog,
    title,
    current,
    enabled,
    password,
    confirmRow,
    confirmation,
    feedback,
    cancel,
    save
  } = elements;
  const {
    stateStore,
    translate,
    storage = globalThis.localStorage,
    cryptoProvider = globalThis.crypto,
    onChanged
  } = options;
  let firstSetup = false;
  let saving = false;

  function renderCopy() {
    const state = stateStore.snapshot();
    title.textContent = translate(firstSetup ? "设置管理员密码" : "管理答题锁");
    current.textContent = translate(state.enabled ? "答题锁已启用" : "答题锁已停用");
    save.textContent = translate("验证并保存");
  }

  function setBusy(busy) {
    saving = busy;
    password.disabled = busy;
    confirmation.disabled = busy;
    enabled.disabled = busy;
    cancel.disabled = busy;
    save.disabled = busy;
    save.textContent = translate(busy ? "正在验证…" : "验证并保存");
  }

  function showFeedback(message) {
    feedback.textContent = translate(message);
  }

  function open() {
    firstSetup = !hasAdminPassword(storage);
    const state = stateStore.snapshot();
    enabled.checked = state.enabled;
    password.value = "";
    confirmation.value = "";
    password.autocomplete = firstSetup ? "new-password" : "current-password";
    confirmation.autocomplete = firstSetup ? "new-password" : "off";
    confirmRow.hidden = !firstSetup;
    feedback.textContent = "";
    renderCopy();
    if (!dialog.open) dialog.showModal();
    password.focus();
  }

  async function submit() {
    if (saving) return;
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
    const state = stateStore.setEnabled(enabled.checked);
    dialog.close();
    onChanged?.(state.enabled);
  }

  cancel.onclick = () => dialog.close();
  save.onclick = submit;
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

  return Object.freeze({ open, refreshLanguage: renderCopy });
}
