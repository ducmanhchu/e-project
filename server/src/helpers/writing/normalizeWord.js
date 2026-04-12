import nlp from "compromise";

const PHRASE_TYPES = [
  "noun_phrase",
  "verb_phrase",
  "adj_phrase",
  "adv_phrase",
  "prep_phrase",
  "phrasal_verb",
];

const VERB_TAGS = ["Verb", "PastTense", "Gerund", "Participle"];
const NOUN_TAGS = ["Noun", "Plural"];

/**
 * Normalize a word to its base form using compromise NLP.
 * Uses the original English sentence as context for accurate POS detection,
 * then transforms only the isolated word.
 *
 * @param {string} word - The word to normalize
 * @param {string} partOfSpeech - POS from AI ("word", "noun_phrase", etc.)
 * @param {string} [sentenceContext] - Original English sentence containing the word
 */
export function normalizeWord(word, partOfSpeech, sentenceContext) {
  if (!word || typeof word !== "string") return word;

  const trimmed = word.trim().toLowerCase();

  if (PHRASE_TYPES.includes(partOfSpeech)) return trimmed;

  // Use real sentence to detect POS, then transform isolated word
  if (sentenceContext) {
    const doc = nlp(sentenceContext);
    const match = doc.match(trimmed);

    if (match.found) {
      const tags = match.out("tags")[0] || {};
      const wordTags = Object.values(tags)[0] || [];

      if (wordTags.some((t) => VERB_TAGS.includes(t))) {
        const termDoc = nlp(trimmed);
        termDoc.tag("Verb");
        termDoc.verbs().toInfinitive();
        return termDoc.text().toLowerCase() || trimmed;
      }

      if (wordTags.some((t) => NOUN_TAGS.includes(t))) {
        const termDoc = nlp(trimmed);
        termDoc.tag("Noun");
        termDoc.nouns().toSingular();
        return termDoc.text().toLowerCase() || trimmed;
      }
    }
  }

  // Fallback: synthetic sentence context
  const inSentence = nlp("they " + trimmed);
  const verbs = inSentence.verbs();
  if (verbs.length > 0) {
    verbs.toInfinitive();
    const result = inSentence.text().replace(/^they\s+/, "").trim();
    if (result && result !== trimmed) return result;
  }

  const solo = nlp(trimmed);
  if (solo.nouns().length > 0) {
    const singular = solo.nouns().toSingular().text();
    if (singular) return singular;
  }

  return trimmed;
}
