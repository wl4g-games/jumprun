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
  "语文": 13,
  "数学": 17,
  "英语": 10,
  "地理": 13,
  "物理": 13,
  "中国历史": 14,
  "世界历史": 10,
  "金融": 10
});

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
    "语文": 4,
    "数学": 5,
    "英语": 3,
    "地理": 4,
    "物理": 4,
    "中国历史": 4,
    "世界历史": 3,
    "金融": 3
  });

  const actualCounts = Object.fromEntries(QUESTION_SUBJECTS.map((subject) => [
    subject,
    QUESTION_BANK.filter((item) => item.subject === subject).length
  ]));
  assert.deepEqual(actualCounts, EXPECTED_COUNTS);

  const totalWeight = Object.values(SUBJECT_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  for (const subject of QUESTION_SUBJECTS) {
    const idealCount = 100 * SUBJECT_WEIGHTS[subject] / totalWeight;
    assert.ok(Math.abs(actualCounts[subject] - idealCount) < 1, `${subject} should follow its requested weight`);
  }
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
