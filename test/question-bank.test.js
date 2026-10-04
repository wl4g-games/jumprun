import test from "node:test";
import assert from "node:assert/strict";
import {
  QUESTION_BANK,
  QUESTION_SUBJECTS,
  SUBJECT_WEIGHTS,
  localizeQuestion
} from "../src/question-bank.js";
import { ENGLISH_QUESTION_BANK } from "../src/question-bank.en.js";
import { createWeightedQuestionPicker } from "../src/quiz-session.js";

const EXPECTED_COUNTS = Object.freeze({
  "语文": 16,
  "数学": 13,
  "英语": 6,
  "地理": 13,
  "物理": 13,
  "中国历史": 16,
  "世界历史": 13,
  "金融": 10
});
const SUBJECT_PREFIXES = Object.freeze({
  "语文": "cn",
  "数学": "ma",
  "英语": "en",
  "地理": "ge",
  "物理": "ph",
  "中国历史": "ch",
  "世界历史": "wh",
  "金融": "fi"
});

function largestRemainderCounts(weights, total) {
  const weightTotal = Object.values(weights).reduce((sum, item) => sum + item, 0);
  const entries = Object.entries(weights).map(([subject, weight], order) => {
    const exact = total * weight / weightTotal;
    return { subject, count: Math.floor(exact), remainder: exact % 1, order };
  });
  let unassigned = total - entries.reduce((sum, entry) => sum + entry.count, 0);
  for (const entry of [...entries].sort((a, b) => b.remainder - a.remainder || a.order - b.order)) {
    if (unassigned === 0) break;
    entry.count++;
    unassigned--;
  }
  return Object.fromEntries(entries.map(({ subject, count }) => [subject, count]));
}

function seededRandom(seed = 0x5eed1234) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

test("100-question curriculum follows the eight requested subject proportions", () => {
  assert.equal(QUESTION_BANK.length, 100);
  assert.deepEqual(QUESTION_SUBJECTS, Object.keys(EXPECTED_COUNTS));
  assert.deepEqual(SUBJECT_WEIGHTS, {
    "语文": 5,
    "数学": 4,
    "英语": 2,
    "地理": 4,
    "物理": 4,
    "中国历史": 5,
    "世界历史": 4,
    "金融": 3
  });
  assert.equal(Object.values(SUBJECT_WEIGHTS).reduce((sum, weight) => sum + weight, 0), 31);

  const actualCounts = Object.fromEntries(QUESTION_SUBJECTS.map((subject) => [
    subject,
    QUESTION_BANK.filter((item) => item.subject === subject).length
  ]));
  assert.deepEqual(actualCounts, EXPECTED_COUNTS);
  assert.deepEqual(actualCounts, largestRemainderCounts(SUBJECT_WEIGHTS, 100));
  assert.deepEqual(QUESTION_BANK.map(({ id }) => id), QUESTION_SUBJECTS.flatMap((subject) => (
    Array.from({ length: EXPECTED_COUNTS[subject] }, (_, index) => (
      `${SUBJECT_PREFIXES[subject]}-${String(index + 1).padStart(2, "0")}`
    ))
  )));
});

test("Chinese and English banks are complete, aligned, and use equivalent answer positions", () => {
  assert.equal(ENGLISH_QUESTION_BANK.length, 100);
  assert.deepEqual(ENGLISH_QUESTION_BANK.map(({ id }) => id), QUESTION_BANK.map(({ id }) => id));

  for (const chinese of QUESTION_BANK) {
    const english = localizeQuestion(chinese, "en");
    assert.notEqual(english, chinese, chinese.id);
    assert.equal(english.options.length, 4, chinese.id);
    assert.ok(english.options[chinese.answer], `${chinese.id} should share a valid translated answer position`);
    assert.doesNotMatch(`${english.subject}${english.prompt}${english.options.join("")}${english.explanation}`, /[\u3400-\u9fff]/u, chinese.id);
  }
});

test("questions meet basic age-appropriate quality and answer-position checks", () => {
  const answerPositionCounts = [0, 1, 2, 3].map((answer) => QUESTION_BANK.filter((item) => item.answer === answer).length);
  assert.ok(Math.min(...answerPositionCounts) >= 12, "correct choices should not reveal a strong position shortcut");

  for (const item of QUESTION_BANK) {
    assert.match(item.id, /^(cn|ma|en|ge|ph|ch|wh|fi)-\d{2}$/u);
    assert.ok(item.prompt.length >= 12 && item.prompt.length <= 100, `${item.id} prompt length`);
    assert.equal(new Set(item.options).size, 4, `${item.id} needs distinct choices`);
    assert.ok(item.options.every((option) => String(option).trim().length > 0), `${item.id} has an empty choice`);
    assert.ok(Number.isInteger(item.answer) && item.answer >= 0 && item.answer < 4, `${item.id} answer`);
    assert.ok(item.explanation.length >= 12, `${item.id} explanation`);
  }
});

test("weighted picker exhausts the full bank and avoids recent repeats", () => {
  const picker = createWeightedQuestionPicker(seededRandom());
  const seenFirstCycle = [];
  const recent = [];
  const pickedCounts = Object.fromEntries(QUESTION_SUBJECTS.map((subject) => [subject, 0]));

  for (let index = 0; index < 300; index++) {
    const item = picker.next();
    assert.ok(!recent.includes(item.id), `${item.id} repeated inside the recent-question window`);
    recent.push(item.id);
    if (recent.length > 8) recent.shift();
    pickedCounts[item.subject]++;
    if (index < 100) seenFirstCycle.push(item.id);
  }

  assert.equal(new Set(seenFirstCycle).size, 100, "all questions should appear before any repeat");
  assert.deepEqual(pickedCounts, Object.fromEntries(QUESTION_SUBJECTS.map((subject) => [
    subject,
    EXPECTED_COUNTS[subject] * 3
  ])));
});
