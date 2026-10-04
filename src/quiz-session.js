import { QUESTION_BANK, QUESTION_SUBJECTS, SUBJECT_WEIGHTS } from "./question-bank.js";

const RECENT_QUESTION_LIMIT = 8;

function randomIndex(length, random) {
  const sample = Number(random());
  const unit = Number.isFinite(sample) ? Math.min(0.999999999999, Math.max(0, sample)) : 0;
  return Math.floor(unit * length);
}

function shuffle(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = randomIndex(index + 1, random);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function chooseWeightedSubject(available, random) {
  const total = available.reduce((sum, subject) => sum + SUBJECT_WEIGHTS[subject], 0);
  const sample = Number(random());
  const unit = Number.isFinite(sample) ? Math.min(0.999999999999, Math.max(0, sample)) : 0;
  let cursor = unit * total;
  for (const subject of available) {
    cursor -= SUBJECT_WEIGHTS[subject];
    if (cursor < 0) return subject;
  }
  return available[available.length - 1];
}

/**
 * Picks a weighted subject first, then a shuffled question in that subject.
 * Every question is used once before any question can repeat; after a reset,
 * the short recent-history guard prevents a just-seen item from resurfacing.
 */
export function createWeightedQuestionPicker(random = Math.random) {
  const sourceBySubject = new Map(QUESTION_SUBJECTS.map((subject) => [
    subject,
    QUESTION_BANK.filter((item) => item.subject === subject)
  ]));
  let pools = new Map();
  const recentIds = [];

  function resetPools() {
    pools = new Map(QUESTION_SUBJECTS.map((subject) => [subject, shuffle(sourceBySubject.get(subject), random)]));
  }

  function remember(id) {
    recentIds.push(id);
    if (recentIds.length > RECENT_QUESTION_LIMIT) recentIds.shift();
  }

  function next() {
    let available = QUESTION_SUBJECTS.filter((subject) => pools.get(subject)?.length);
    if (available.length === 0) {
      resetPools();
      available = [...QUESTION_SUBJECTS];
    }

    const subject = chooseWeightedSubject(available, random);
    const pool = pools.get(subject);
    let itemIndex = pool.findIndex((item) => !recentIds.includes(item.id));
    if (itemIndex < 0) itemIndex = 0;
    const [item] = pool.splice(itemIndex, 1);
    remember(item.id);
    return item;
  }

  resetPools();
  return { next };
}

export function createQuizSession(requiredCorrect = 1, random = Math.random) {
  const required = [1, 2, 3].includes(Number(requiredCorrect)) ? Number(requiredCorrect) : 1;
  const picker = createWeightedQuestionPicker(random);
  let item = picker.next();
  let correct = 0;
  let attempts = 0;

  const current = () => item;
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
    item = picker.next();
    return current();
  }

  return { current, progress, answer, next };
}
