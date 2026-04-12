import { UserVocabulary } from "@server/models/userVocabulary/UserVocabulary";
import { Vocabulary } from "@server/models/vocabulary/Vocabulary";
import { ApiError } from "@server/helpers/ApiError";
import { aiEnrichWord } from "@server/services/ai/enrichProvider";

const LEARNED_STREAK_THRESHOLD = 3;

/** Get primary Vietnamese meaning from definitions array */
function getPrimaryMeaning(vocab) {
  return vocab.definitions?.[0]?.viDef || "";
}

/**
 * Fetch word data from Vocaxis API (free, rich dictionary data)
 * Returns mapped data matching Vocabulary schema, or null on failure.
 */
async function fetchFromVocaxis(word) {
  try {
    const res = await fetch(
      `https://workers.vocaxis.com/lookup/${encodeURIComponent(word)}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data[0];
    if (!entry?.definitions?.length) return null;

    return {
      ipa: entry.ipa?.us || entry.ipa?.uk || null,
      definitions: entry.definitions.map((def) => ({
        definitionCefrLevel: def.definition_cefr_level || "",
        engDef: def.english || "",
        viDef: def.equivalents?.vi || "",
        example: def.examples?.[0]
          ? {
              engEx: def.examples[0].english || "",
              viEx: def.examples[0].translations?.vi || "",
            }
          : undefined,
        synonyms: def.synonyms || [],
        antonyms: def.antonyms || [],
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch audio URL from free Dictionary API
 */
async function fetchAudioUrl(word) {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const phonetics = data[0]?.phonetics || [];
    const withAudio = phonetics.find((p) => p.audio && p.audio.length > 0);
    return withAudio?.audio || null;
  } catch {
    return null;
  }
}

/**
 * Enrich a Vocabulary document if not already enriched.
 * Priority: Vocaxis API → AI fallback. Audio from Dictionary API.
 */
export async function ensureEnriched(vocab) {
  const hasDefinitions = vocab.definitions && vocab.definitions.length > 0;
  const hasAudio = !!vocab.audio;

  // Already fully enriched
  if (hasDefinitions && hasAudio) return vocab;

  // Has definitions but missing audio — just fetch audio
  if (hasDefinitions && !hasAudio) {
    const audioUrl = await fetchAudioUrl(vocab.word);
    if (audioUrl) {
      return Vocabulary.findByIdAndUpdate(
        vocab._id,
        { audio: audioUrl },
        { new: true },
      );
    }
    return vocab;
  }

  // Try Vocaxis + audio in parallel
  const [vocaxis, audioUrl] = await Promise.all([
    fetchFromVocaxis(vocab.word),
    fetchAudioUrl(vocab.word),
  ]);

  let enrichData;

  if (vocaxis) {
    enrichData = vocaxis;
  } else {
    // Fallback: AI enrich
    const { result } = await aiEnrichWord(vocab.word);
    enrichData = {
      ipa: result.ipa,
      definitions: result.definitions || [],
    };
  }

  return Vocabulary.findByIdAndUpdate(
    vocab._id,
    {
      ipa: enrichData.ipa,
      definitions: enrichData.definitions,
      ...(audioUrl && { audio: audioUrl }),
    },
    { new: true },
  );
}

/**
 * Fire-and-forget enrich — logs errors but doesn't block caller.
 */
function enrichInBackground(vocab) {
  ensureEnriched(vocab).catch((err) =>
    console.error(`[enrich] Failed for "${vocab.word}":`, err.message),
  );
}

/**
 * Get vocabulary words by list of IDs
 */
export async function getWordsByIds(ids) {
  if (!ids || ids.length === 0) return [];

  const vocabs = await Vocabulary.find({ _id: { $in: ids } })
    .select("word partOfSpeech ipa definitions")
    .lean();

  return vocabs.map((v) => {
    const firstDef = v.definitions?.[0];
    return {
      id: v._id,
      word: v.word,
      partOfSpeech: v.partOfSpeech,
      ipa: v.ipa,
      meaning: firstDef?.viDef || "",
      example: firstDef?.example?.engEx || "",
    };
  });
}

/**
 * Add word to user's vocabulary
 * If vocabularyId provided (from exercise), use directly. Otherwise find/create.
 */
export async function addWord(userId, payload) {
  const { vocabularyId, word, partOfSpeech, meaning, example } = payload;

  let vocab;

  if (vocabularyId) {
    vocab = await Vocabulary.findById(vocabularyId);
    if (!vocab) throw ApiError.notFound("Vocabulary entry not found");
  } else {
    if (!word?.trim()) throw ApiError.badRequest("word is required");
    const normalized = word.toLowerCase().trim();

    vocab = await Vocabulary.findOneAndUpdate(
      { word: normalized },
      { $setOnInsert: { word: normalized, partOfSpeech, definitions: [] } },
      { upsert: true, new: true },
    );

    if (!vocab.definitions || vocab.definitions.length === 0) {
      enrichInBackground(vocab);
    }
  }

  // Check duplicate in user's list
  const existing = await UserVocabulary.findOne({
    userId,
    vocabularyId: vocab._id,
  });
  if (existing) throw ApiError.conflict("Word already in your list");

  const userVocab = await UserVocabulary.create({
    userId,
    vocabularyId: vocab._id,
  });

  return {
    id: userVocab._id,
    word: vocab.word,
    meaning: getPrimaryMeaning(vocab),
    partOfSpeech: vocab.partOfSpeech,
    status: userVocab.status,
    addedAt: userVocab.addedAt,
  };
}

/**
 * List user's vocabulary (paginated, filterable, searchable)
 */
export async function listWords(userId, filters, pagination) {
  const { status, search } = filters;
  const { page, limit } = pagination;

  const query = { userId };
  if (status) query.status = status;

  const pipeline = [
    { $match: query },
    {
      $lookup: {
        from: "vocabularies",
        localField: "vocabularyId",
        foreignField: "_id",
        as: "vocab",
      },
    },
    { $unwind: "$vocab" },
    ...(search
      ? [{ $match: { "vocab.word": { $regex: search, $options: "i" } } }]
      : []),
    { $sort: { addedAt: -1 } },
  ];

  const countResult = await UserVocabulary.aggregate([
    ...pipeline,
    { $count: "total" },
  ]);
  const total = countResult[0]?.total || 0;

  const results = await UserVocabulary.aggregate([
    ...pipeline,
    { $skip: (page - 1) * limit },
    { $limit: limit },
  ]);

  const words = results.map((r) => ({
    id: r._id,
    word: r.vocab.word,
    meaning: r.vocab.definitions?.[0]?.viDef || "",
    partOfSpeech: r.vocab.partOfSpeech,
    ipa: r.vocab.ipa,
    status: r.status,
    reviewCount: r.reviewCount,
    addedAt: r.addedAt,
  }));

  return {
    words,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get word detail (UserVocabulary + Vocabulary with rich data)
 */
export async function getWordDetail(userId, wordId) {
  const userVocab = await UserVocabulary.findOne({
    _id: wordId,
    userId,
  }).lean();
  if (!userVocab) throw ApiError.notFound("Word not found");

  let vocab = await Vocabulary.findById(userVocab.vocabularyId).lean();
  if (!vocab) throw ApiError.notFound("Vocabulary entry not found");

  // Enrich if no definitions yet
  if (!vocab.definitions || vocab.definitions.length === 0) {
    const enriched = await ensureEnriched(vocab);
    vocab = enriched.toObject ? enriched.toObject() : enriched;
  }

  return {
    id: userVocab._id,
    word: vocab.word,
    partOfSpeech: vocab.partOfSpeech,
    ipa: vocab.ipa,
    definitions: vocab.definitions || [],
    audio: vocab.audio || null,
    status: userVocab.status,
    reviewCount: userVocab.reviewCount,
    addedAt: userVocab.addedAt,
    lastReviewedAt: userVocab.lastReviewedAt,
  };
}

/**
 * Update learning status
 */
export async function updateStatus(userId, wordId, status) {
  const valid = ["new", "learning", "learned"];
  if (!valid.includes(status))
    throw ApiError.badRequest(`status must be one of: ${valid.join(", ")}`);

  const userVocab = await UserVocabulary.findOneAndUpdate(
    { _id: wordId, userId },
    { status },
    { new: true },
  ).populate("vocabularyId", "word definitions");
  if (!userVocab) throw ApiError.notFound("Word not found");

  return {
    id: userVocab._id,
    word: userVocab.vocabularyId.word,
    meaning: userVocab.vocabularyId.definitions?.[0]?.viDef || "",
    status: userVocab.status,
  };
}

/**
 * Delete word from user's list
 */
export async function deleteWord(userId, wordId) {
  const result = await UserVocabulary.findOneAndDelete({ _id: wordId, userId });
  if (!result) throw ApiError.notFound("Word not found");
  return { deleted: true };
}

/**
 * Get stats
 */
export async function getStats(userId) {
  const [total, learned, learning] = await Promise.all([
    UserVocabulary.countDocuments({ userId }),
    UserVocabulary.countDocuments({ userId, status: "learned" }),
    UserVocabulary.countDocuments({ userId, status: "learning" }),
  ]);

  return {
    total,
    learned,
    learning,
    new: total - learned - learning,
    completionPercent: total > 0 ? Math.round((learned / total) * 100) : 0,
  };
}

/**
 * Get review quiz questions
 */
export async function getReviewQuestions(userId, type, limit = 5) {
  const statusFilter =
    type === "learned_words" ? ["learned"] : ["new", "learning"];

  const totalUserWords = await UserVocabulary.countDocuments({ userId });
  if (totalUserWords < 4) {
    return { canReview: false, minRequired: 4, current: totalUserWords };
  }

  // Get target words
  const targets = await UserVocabulary.aggregate([
    { $match: { userId, status: { $in: statusFilter } } },
    { $sample: { size: limit } },
    {
      $lookup: {
        from: "vocabularies",
        localField: "vocabularyId",
        foreignField: "_id",
        as: "vocab",
      },
    },
    { $unwind: "$vocab" },
  ]);

  if (targets.length === 0) {
    return { canReview: false, reason: "No words with matching status" };
  }

  // Get all user's words for distractor pool
  const allUserVocabs = await UserVocabulary.find({ userId })
    .populate("vocabularyId", "word definitions")
    .lean();

  const pool = allUserVocabs
    .filter((uv) => uv.vocabularyId?.definitions?.[0]?.viDef)
    .map((uv) => ({
      word: uv.vocabularyId.word,
      meaning: uv.vocabularyId.definitions[0].viDef,
    }));

  const questions = targets.map((t) => {
    const correctAnswer = t.vocab.definitions?.[0]?.viDef || "";
    const distractors = pool
      .filter((p) => p.word !== t.vocab.word)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((d) => d.meaning);

    const options = [correctAnswer, ...distractors].sort(
      () => Math.random() - 0.5,
    );

    return {
      wordId: t._id,
      word: t.vocab.word,
      options,
      correctIndex: options.indexOf(correctAnswer),
    };
  });

  return { canReview: true, questions };
}

/**
 * Record review completion — auto-update status
 */
export async function recordReview(userId, wordIds, correctIds) {
  const correctSet = new Set(correctIds.map(String));

  const updates = wordIds.map(async (wordId) => {
    const isCorrect = correctSet.has(String(wordId));

    const uv = await UserVocabulary.findOne({ _id: wordId, userId });
    if (!uv) return;

    uv.reviewCount += 1;
    uv.lastReviewedAt = new Date();

    if (isCorrect) {
      uv.correctStreak += 1;
      if (uv.status === "new") uv.status = "learning";
      else if (
        uv.status === "learning" &&
        uv.correctStreak >= LEARNED_STREAK_THRESHOLD
      ) {
        uv.status = "learned";
      }
    } else {
      uv.correctStreak = 0;
      if (uv.status === "learned") uv.status = "learning";
    }

    await uv.save();
  });

  await Promise.all(updates);
  return { updated: wordIds.length };
}
