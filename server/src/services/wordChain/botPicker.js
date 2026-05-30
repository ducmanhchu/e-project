import { Vocabulary } from "@server/models/vocabulary/Vocabulary";
import { ApiError } from "@server/helpers/ApiError";
import {
  pickFromWordlist,
  pickSeedFromWordlist,
} from "@server/services/wordChain/wordlistLoader";
import {
  CEFR_BY_LEVEL,
  HARD_END_LETTERS,
  MIN_WORD_LENGTH,
} from "@server/const/wordChain";

const HARD_END_REGEX = `[${HARD_END_LETTERS.join("")}]$`;

async function pickFromVocabulary({ startLetter, level, usedWords }) {
  const cefrLevels = CEFR_BY_LEVEL[level];
  const used = Array.from(usedWords).map((w) => w.toLowerCase());

  const match = {
    $and: [
      { word: { $not: { $regex: HARD_END_REGEX } } },
      { word: { $nin: used } },
      { $expr: { $gte: [{ $strLenCP: "$word" }, MIN_WORD_LENGTH] } },
      { "definitions.definitionCefrLevel": { $in: cefrLevels } },
    ],
  };
  if (startLetter) {
    match.$and.push({ word: { $regex: `^${startLetter.toLowerCase()}` } });
  }

  const result = await Vocabulary.aggregate([
    { $match: match },
    { $sample: { size: 1 } },
    { $project: { word: 1, _id: 0 } },
  ]);
  return result[0]?.word ?? null;
}

export async function pickBotWord({ startLetter, level, usedWords }) {
  const fromVocab = await pickFromVocabulary({ startLetter, level, usedWords });
  if (fromVocab) return { word: fromVocab, source: "vocabulary" };

  const fromList = pickFromWordlist({ startLetter, usedWords });
  if (fromList) return { word: fromList, source: "wordlist" };

  return null;
}

export async function pickSeedWord({ level }) {
  const fromVocab = await pickFromVocabulary({
    startLetter: null,
    level,
    usedWords: new Set(),
  });
  if (fromVocab) return { word: fromVocab, source: "vocabulary" };

  const fromList = pickSeedFromWordlist();
  if (fromList) return { word: fromList, source: "wordlist" };

  throw new ApiError(500, "WORDLIST_INSUFFICIENT");
}
