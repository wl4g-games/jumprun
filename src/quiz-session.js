import { shuffledQuestions } from "./question-bank.js";

export function createQuizSession(requiredCorrect = 2, random = Math.random) {
  const required = [1, 2, 3].includes(Number(requiredCorrect)) ? Number(requiredCorrect) : 2;
  let queue = shuffledQuestions(random);
  let index = 0;
  let correct = 0;
  let attempts = 0;

  const current = () => queue[index];
  const progress = () => ({ correct, required, attempts, completed: correct >= required });

  function answer(choice) {
    if (progress().completed) return { ...progress(), accepted: false };
    const selected = Number(choice);
    const item = current();
    const isCorrect = Number.isInteger(selected) && selected === item.answer;
    attempts++;
    if (isCorrect) correct++;
    return {
      ...progress(),
      accepted: true,
      isCorrect,
      correctAnswer: item.answer,
      explanation: item.explanation
    };
  }

  function next() {
    if (progress().completed) return null;
    index++;
    if (index >= queue.length) {
      queue = shuffledQuestions(random);
      index = 0;
    }
    return current();
  }

  return { current, progress, answer, next };
}
