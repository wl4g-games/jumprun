import { createQuizSession } from "./quiz-session.js";

export function createQuizDialog(elements, translate, onUnlocked) {
  const { dialog, subject, progress, prompt, answers, feedback, nextButton } = elements;
  let session = null;
  let answered = false;

  function render() {
    const item = session.current();
    const state = session.progress();
    answered = false;
    subject.textContent = item.subject;
    progress.textContent = `${translate("答对进度")} ${state.correct}/${state.required}`;
    prompt.textContent = item.prompt;
    feedback.textContent = "";
    feedback.className = "quiz-feedback";
    nextButton.hidden = true;
    answers.replaceChildren(...item.options.map((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quiz-option";
      button.dataset.index = String(index);
      button.innerHTML = `<span>${String.fromCharCode(65 + index)}</span>${option}`;
      button.onclick = () => choose(index);
      return button;
    }));
  }

  function choose(index) {
    if (answered) return;
    answered = true;
    const result = session.answer(index);
    const buttons = [...answers.querySelectorAll("button")];
    for (const button of buttons) button.disabled = true;
    buttons[result.correctAnswer]?.classList.add("correct");
    if (!result.isCorrect) buttons[index]?.classList.add("wrong");
    feedback.textContent = `${result.isCorrect ? translate("回答正确") : translate("这题再想想")} ${result.explanation}`;
    feedback.classList.add(result.isCorrect ? "is-correct" : "is-wrong");
    progress.textContent = `${translate("答对进度")} ${result.correct}/${result.required}`;
    nextButton.hidden = false;
    nextButton.textContent = result.completed ? translate("继续游戏") : translate("下一题");
  }

  nextButton.onclick = () => {
    if (!session || !answered) return;
    if (session.progress().completed) {
      dialog.close();
      onUnlocked();
      return;
    }
    session.next();
    render();
  };
  dialog.addEventListener("cancel", (event) => event.preventDefault());

  return {
    start(requiredCorrect) {
      session = createQuizSession(requiredCorrect);
      render();
      if (!dialog.open) dialog.showModal();
    },
    isOpen() {
      return dialog.open;
    },
    refreshLanguage() {
      if (!session) return;
      const state = session.progress();
      progress.textContent = `${translate("答对进度")} ${state.correct}/${state.required}`;
      if (answered) nextButton.textContent = state.completed ? translate("继续游戏") : translate("下一题");
    }
  };
}
