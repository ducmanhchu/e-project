import allWords from "an-array-of-english-words";
import { HARD_END_LETTERS, MIN_WORD_LENGTH } from "@server/const/wordChain";

// Validation set — full wordlist, accept anything English
const validationSet = new Set(allWords.map((w) => w.toLowerCase()));

// Bot fallback index — pre-filtered, grouped by first letter
const botFallbackIndex = new Map();
const HARD_END_SET = new Set(HARD_END_LETTERS);
let botFallbackTotal = 0;

for (const raw of allWords) {
  const word = raw.toLowerCase();
  if (word.length < MIN_WORD_LENGTH) continue;
  if (HARD_END_SET.has(word.at(-1))) continue;
  if (!/^[a-z]+$/.test(word)) continue;
  const first = word[0];
  if (!botFallbackIndex.has(first)) botFallbackIndex.set(first, []);
  botFallbackIndex.get(first).push(word);
  botFallbackTotal++;
}

console.log(
  `[wordChain] validationSet=${validationSet.size}, botFallback=${botFallbackTotal}`,
);

export function isValidEnglishWord(word) {
  return validationSet.has(word.toLowerCase());
}

export function pickFromWordlist({ startLetter, usedWords }) {
  const candidates = botFallbackIndex.get(startLetter.toLowerCase());
  if (!candidates?.length) return null;

  const used = new Set([...usedWords].map((w) => w.toLowerCase()));
  for (let i = 0; i < 50; i++) {
    const w = candidates[Math.floor(Math.random() * candidates.length)];
    if (!used.has(w)) return w;
  }
  const filtered = candidates.filter((w) => !used.has(w));
  return filtered.length
    ? filtered[Math.floor(Math.random() * filtered.length)]
    : null;
}

export function pickSeedFromWordlist() {
  const letters = Array.from(botFallbackIndex.keys());
  if (!letters.length) return null;
  const letter = letters[Math.floor(Math.random() * letters.length)];
  return pickFromWordlist({ startLetter: letter, usedWords: new Set() });
}
