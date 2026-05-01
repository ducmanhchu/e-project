import { aiTranslateParagraph } from "@server/services/ai/translateProvider";
import { aiExtractVocabulary } from "@server/services/ai/vocabExtractProvider";
import { HARD_MAX } from "@server/services/ai/levelBand";

function sanitizeVocab(items, sentenceCount, level) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  const cap = HARD_MAX[level] ?? 20;

  return items
    .filter((v) => {
      if (!v || typeof v !== "object") return false;
      if (!v.word || !v.meaning || !v.example || !v.partOfSpeech) return false;
      const key = String(v.word).toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      if (
        typeof v.sentenceIndex !== "number" ||
        v.sentenceIndex < 0 ||
        v.sentenceIndex >= sentenceCount
      ) {
        v.sentenceIndex = 0;
      }
      return true;
    })
    .slice(0, cap);
}

/**
 * Preview writing: 2-call sequential pipeline.
 *  Call A: paragraph → vietnameseParagraph + sentences (translate + split)
 *  Call B: sentences → vocabulary[] (level-aware extract)
 * Returns { result, provider } shape that writingService expects.
 */
export async function aiPreviewWriting(paragraph, context = {}) {
  // Call A — required, throws on double-failure
  const { result: translateResult, provider: providerA } =
    await aiTranslateParagraph(paragraph, context);
  const { vietnameseParagraph, sentences } = translateResult;

  // Call B — best effort
  let rawVocab = [];
  let providerB = "skipped";
  try {
    const { result: extractResult, provider } = await aiExtractVocabulary(
      sentences.map((s, i) => ({ index: i, text: s.referenceAnswer })),
      context,
    );
    rawVocab = extractResult.vocabulary ?? [];
    providerB = provider;
  } catch (err) {
    console.error(
      `[preview] vocab extraction failed: ${err.message}. Returning empty vocabulary.`,
    );
  }

  const cleanVocab = sanitizeVocab(rawVocab, sentences.length, context.level);

  // Regroup flat list back into per-sentence shape (preserve API contract)
  const vocabBySentence = new Map();
  for (const v of cleanVocab) {
    const idx = v.sentenceIndex ?? 0;
    if (!vocabBySentence.has(idx)) vocabBySentence.set(idx, []);
    vocabBySentence.get(idx).push({
      word: v.word,
      partOfSpeech: v.partOfSpeech,
      meaning: v.meaning,
      example: v.example,
    });
  }

  const result = {
    vietnameseParagraph,
    results: sentences.map((s, i) => ({
      referenceAnswer: s.referenceAnswer,
      vietnameseText: s.vietnameseText,
      vocabulary: vocabBySentence.get(i) ?? [],
    })),
  };

  const provider =
    providerA === providerB ? providerA : `${providerA}+${providerB}`;

  return { result, provider };
}
