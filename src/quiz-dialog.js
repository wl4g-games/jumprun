import { createQuizSession } from "./quiz-session.js";

export function createQuizDialog(elements, options) {
  const { dialog, subject, progress, prompt, answers, feedback } = elements;
  const { translate, localizeQuestion, onUnlocked, transitionDelay = 900, createSession = createQuizSession } = options;
  let session = null;
  let answerState = null;
  let transitionTimer = null;
  let generation = 0;

  function clearTransition() {
    clearTimeout(transitionTimer);
    transitionTimer = null;
  }

  function showFeedback(localizedItem) {
    const { result, selectedIndex } = answerState;
    const buttons = [...answers.querySelectorAll("button")];
    for (const button of buttons) button.disabled = true;
    buttons[result.correctAnswer]?.classList.add("correct");
    if (!result.isCorrect) buttons[selectedIndex]?.classList.add("wrong");
    feedback.textContent = `${result.isCorrect ? translate("回答正确") : translate("这题再想想")} ${localizedItem.explanation}`;
    feedback.className = `quiz-feedback ${result.isCorrect ? "is-correct" : "is-wrong"}`;
  }

  function render() {
    const item = localizeQuestion(session.current());
    const state = session.progress();
    subject.textContent = item.subject;
    progress.textContent = `${translate("答对进度")} ${state.correct}/${state.required}`;
    prompt.textContent = item.prompt;
    feedback.textContent = "";
    feedback.className = "quiz-feedback";
    answers.replaceChildren(...item.options.map((option, index) => {
      const button = document.createElement("button");
      const marker = document.createElement("span");
      button.type = "button";
      button.className = "quiz-option";
      button.dataset.index = String(index);
      marker.textContent = String.fromCharCode(65 + index);
      button.append(marker, document.createTextNode(option));
      button.onclick = () => choose(index);
      return button;
    }));
    if (answerState) showFeedback(item);
  }

  function choose(index) {
    if (answerState) return;
    const result = session.answer(index);
    answerState = { result, selectedIndex: index };
    render();

    const currentGeneration = generation;
    transitionTimer = setTimeout(() => {
      if (currentGeneration !== generation || !session) return;
      transitionTimer = null;
      if (result.completed) {
        dialog.close();
        session = null;
        answerState = null;
        onUnlocked();
        return;
      }
      session.next();
      answerState = null;
      render();
    }, transitionDelay);
  }

  dialog.addEventListener("cancel", (event) => event.preventDefault());

  return {
    start(requiredCorrect) {
      generation++;
      clearTransition();
      session = createSession(requiredCorrect);
      answerState = null;
      render();
      if (!dialog.open) dialog.showModal();
    },
    isOpen() {
      return dialog.open;
    },
    refreshLanguage() {
      if (session) render();
    }
  };
}
