import test from "node:test";
import assert from "node:assert/strict";
import { createQuizDialog } from "../src/quiz-dialog.js";

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.className = "";
    this.textContent = "";
    this.disabled = false;
    this.open = false;
    this.listeners = new Map();
    this.classList = { add: (...names) => {
      this.className = [...new Set(`${this.className} ${names.join(" ")}`.trim().split(/\s+/))].join(" ");
    } };
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  querySelectorAll(selector) {
    return selector === "button" ? this.children.filter(({ tagName }) => tagName === "BUTTON") : [];
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  showModal() {
    this.open = true;
  }

  close() {
    this.open = false;
  }
}

const questions = [
  { id: "one", subject: "Math", prompt: "First", options: ["A", "B", "C", "D"], answer: 1, explanation: "First explanation" },
  { id: "two", subject: "Physics", prompt: "Second", options: ["A", "B", "C", "D"], answer: 0, explanation: "Second explanation" }
];

function fixedSession(required) {
  let index = 0;
  let correct = 0;
  let attempts = 0;
  return {
    current: () => questions[index],
    progress: () => ({ correct, required, attempts, completed: correct >= required }),
    answer(choice) {
      const item = questions[index];
      const isCorrect = choice === item.answer;
      attempts++;
      if (isCorrect) correct++;
      return { correct, required, attempts, completed: correct >= required, isCorrect, correctAnswer: item.answer };
    },
    next() {
      index = Math.min(index + 1, questions.length - 1);
      return questions[index];
    }
  };
}

test("quiz automatically replaces a wrong question and closes only after success", async () => {
  const originalDocument = globalThis.document;
  globalThis.document = {
    createElement: (tagName) => new FakeElement(tagName),
    createTextNode: (textContent) => ({ tagName: "#TEXT", textContent })
  };
  try {
    const elements = {
      dialog: new FakeElement("dialog"),
      subject: new FakeElement(),
      progress: new FakeElement(),
      prompt: new FakeElement(),
      answers: new FakeElement(),
      feedback: new FakeElement()
    };
    let unlocks = 0;
    const quiz = createQuizDialog(elements, {
      translate: (text) => text,
      localizeQuestion: (item) => item,
      onUnlocked: () => unlocks++,
      transitionDelay: 5,
      createSession: fixedSession
    });

    quiz.start(1);
    assert.equal(elements.dialog.open, true);
    assert.equal(elements.prompt.textContent, "First");
    elements.answers.children[0].onclick();
    assert.equal(elements.dialog.open, true);
    await new Promise((resolve) => setTimeout(resolve, 15));
    assert.equal(elements.dialog.open, true);
    assert.equal(elements.prompt.textContent, "Second");

    elements.answers.children[0].onclick();
    assert.equal(elements.dialog.open, true);
    await new Promise((resolve) => setTimeout(resolve, 15));
    assert.equal(elements.dialog.open, false);
    assert.equal(unlocks, 1);
  } finally {
    globalThis.document = originalDocument;
  }
});
