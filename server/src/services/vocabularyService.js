import { UserVocabulary } from "@server/models/userVocabulary/UserVocabulary";
import { Vocabulary } from "@server/models/vocabulary/Vocabulary";
import { ApiError } from "@server/helpers/ApiError";
import { aiEnrichWord } from "@server/services/ai/enrichProvider";

const LEARNED_STREAK_THRESHOLD = 3;

/**
 * Enrich a Vocabulary document with AI data if not already enriched
 */
async function ensureEnriched(vocab) {
  if (vocab.enrichedAt) return vocab;

  const { result, provider } = await aiEnrichWord(vocab.word);
  return Vocabulary.findByIdAndUpdate(
    vocab._id,
    {
      phonetic: result.phonetic,
      definitions: result.definitions || [],
      synonyms: result.synonyms || [],
      antonyms: result.antonyms || [],
      relatedWords: result.relatedWords || [],
      enrichedBy: provider,
      enrichedAt: new Date(),
    },
    { new: true },
  );
}

/**
 * Add word to user's vocabulary
 */
export async function addWord(userId, payload) {
  const { word, partOfSpeech, meaning, example, sourceLessonId } = payload;
  if (!word?.trim()) throw ApiError.badRequest("word is required");

  const normalized = word.toLowerCase().trim();

  // Find or create Vocabulary entry
  let vocab = await Vocabulary.findOne({
    word: normalized,
    ...(meaning && { meaning }),
  });

  if (!vocab) {
    vocab = await Vocabulary.create({
      word: normalized,
      partOfSpeech,
      meaning: meaning || normalized,
      example,
      ...(sourceLessonId && {
        lessons: [{ lessonId: sourceLessonId }],
      }),
    });
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
    meaning: vocab.meaning,
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

  let userVocabs = await UserVocabulary.find(query)
    .sort({ addedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("vocabularyId", "word meaning partOfSpeech")
    .lean();

  const total = await UserVocabulary.countDocuments(query);

  let words = userVocabs
    .filter((uv) => uv.vocabularyId) // skip orphans
    .map((uv) => ({
      id: uv._id,
      word: uv.vocabularyId.word,
      meaning: uv.vocabularyId.meaning,
      partOfSpeech: uv.vocabularyId.partOfSpeech,
      status: uv.status,
      reviewCount: uv.reviewCount,
      addedAt: uv.addedAt,
    }));

  // Client-side search filter (on populated data)
  if (search) {
    const s = search.toLowerCase();
    words = words.filter((w) => w.word.includes(s));
  }

  return {
    words,
    pagination: {
      page,
      limit,
      total: search ? words.length : total,
      totalPages: search
        ? Math.ceil(words.length / limit)
        : Math.ceil(total / limit),
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

  // Enrich if not already
  if (!vocab.enrichedAt) {
    vocab = (await ensureEnriched(vocab)).toObject
      ? (await ensureEnriched(vocab)).toObject()
      : await Vocabulary.findById(vocab._id).lean();
  }

  return {
    id: userVocab._id,
    word: vocab.word,
    meaning: vocab.meaning,
    partOfSpeech: vocab.partOfSpeech,
    example: vocab.example,
    status: userVocab.status,
    reviewCount: userVocab.reviewCount,
    addedAt: userVocab.addedAt,
    lastReviewedAt: userVocab.lastReviewedAt,
    phonetic: vocab.phonetic,
    definitions: vocab.definitions || [],
    synonyms: vocab.synonyms || [],
    antonyms: vocab.antonyms || [],
    relatedWords: vocab.relatedWords || [],
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
  ).populate("vocabularyId", "word meaning");
  if (!userVocab) throw ApiError.notFound("Word not found");

  return {
    id: userVocab._id,
    word: userVocab.vocabularyId.word,
    meaning: userVocab.vocabularyId.meaning,
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
    .populate("vocabularyId", "word meaning")
    .lean();

  const pool = allUserVocabs
    .filter((uv) => uv.vocabularyId?.meaning)
    .map((uv) => ({
      word: uv.vocabularyId.word,
      meaning: uv.vocabularyId.meaning,
    }));

  const questions = targets.map((t) => {
    const correctAnswer = t.vocab.meaning;
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
