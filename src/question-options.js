function optionRotation(id, length) {
  const prefix = [...id.slice(0, 2)].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return (Number(id.slice(3)) * 3 + prefix) % length;
}

export function rotatedQuestionOptions(id, options) {
  const rotation = optionRotation(id, options.length);
  return Object.freeze([...options.slice(rotation), ...options.slice(0, rotation)]);
}

export function rotatedAnswerIndex(id, answer, optionCount) {
  return (answer - optionRotation(id, optionCount) + optionCount) % optionCount;
}
