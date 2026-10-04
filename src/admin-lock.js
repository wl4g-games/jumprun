const STORAGE_KEY = "jump-run-quiz-admin-v1";
const VERSION = 1;
const ITERATIONS = 210_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function readCredential(storage) {
  try {
    const value = JSON.parse(storage?.getItem(STORAGE_KEY));
    if (value?.version !== VERSION || !value.salt || !value.hash || value.iterations !== ITERATIONS) return null;
    return value;
  } catch {
    return null;
  }
}

async function derivePasswordHash(password, salt, cryptoProvider) {
  const material = await cryptoProvider.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await cryptoProvider.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt,
    iterations: ITERATIONS
  }, material, HASH_BITS);
  return new Uint8Array(bits);
}

function equalBytes(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left[index] ^ right[index];
  return difference === 0;
}

export function hasAdminPassword(storage = globalThis.localStorage) {
  return readCredential(storage) !== null;
}

export function validateAdminPassword(password) {
  return typeof password === "string" && password.length >= 6;
}

export async function setAdminPassword(password, storage = globalThis.localStorage, cryptoProvider = globalThis.crypto) {
  if (!validateAdminPassword(password) || !cryptoProvider?.subtle || !cryptoProvider?.getRandomValues) return false;
  const salt = cryptoProvider.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derivePasswordHash(password, salt, cryptoProvider);
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify({
      version: VERSION,
      iterations: ITERATIONS,
      salt: bytesToBase64(salt),
      hash: bytesToBase64(hash)
    }));
    return true;
  } catch {
    return false;
  }
}

export async function verifyAdminPassword(password, storage = globalThis.localStorage, cryptoProvider = globalThis.crypto) {
  const credential = readCredential(storage);
  if (!credential || typeof password !== "string" || !cryptoProvider?.subtle) return false;
  try {
    const salt = base64ToBytes(credential.salt);
    const expected = base64ToBytes(credential.hash);
    const actual = await derivePasswordHash(password, salt, cryptoProvider);
    return equalBytes(actual, expected);
  } catch {
    return false;
  }
}
