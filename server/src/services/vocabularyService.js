import { UserVocabulary } from "@server/models/userVocabulary/UserVocabulary";
import { Vocabulary } from "@server/models/vocabulary/Vocabulary";
import { ApiError } from "@server/helpers/ApiError";
import { aiEnrichWord } from "@server/services/ai/enrichProvider";

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
    // Fallback: AI enrich (pass PoS hint so AI focuses on the right sense)
    const { result } = await aiEnrichWord(vocab.word, {
      partOfSpeech: vocab.partOfSpeech,
    });
    enrichData = {
      ipa: result.ipa,
      partOfSpeech: result.partOfSpeech,
      definitions: result.definitions || [],
    };
  }

  return Vocabulary.findByIdAndUpdate(
    vocab._id,
    {
      ipa: enrichData.ipa,
      ...(enrichData.partOfSpeech && { partOfSpeech: enrichData.partOfSpeech }),
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
 * Admin: create a Vocabulary entry. Mode is REQUIRED (no default) to make intent explicit.
 *  - mode="manual": admin provides full schema (word, partOfSpeech, definitions[], optional ipa/audio)
 *  - mode="enrich": admin provides only `word` (+ optional partOfSpeech hint),
 *    server runs Vocaxis → AI fallback enrichment synchronously and returns the enriched doc.
 * Throws 409 if word already exists.
 */
export async function createVocabulary(payload) {
  const { mode, word, partOfSpeech, ipa, audio, definitions } = payload;

  if (mode !== "manual" && mode !== "enrich") {
    throw ApiError.badRequest('mode is required and must be "manual" or "enrich"');
  }
  if (!word || typeof word !== "string" || !word.trim()) {
    throw ApiError.badRequest("word is required");
  }
  const normalized = word.toLowerCase().trim();

  const existing = await Vocabulary.findOne({ word: normalized }).lean();
  if (existing) throw ApiError.conflict(`Vocabulary "${normalized}" already exists`);

  if (mode === "manual") {
    if (!partOfSpeech || typeof partOfSpeech !== "string") {
      throw ApiError.badRequest("partOfSpeech is required in manual mode");
    }
    if (!Array.isArray(definitions) || definitions.length === 0) {
      throw ApiError.badRequest("definitions must be a non-empty array in manual mode");
    }
    const created = await Vocabulary.create({
      word: normalized,
      partOfSpeech,
      ipa: ipa || undefined,
      audio: audio || undefined,
      definitions,
    });
    return created.toObject();
  }

  // mode === "enrich"
  const created = await Vocabulary.create({
    word: normalized,
    partOfSpeech: partOfSpeech || undefined,
    definitions: [],
  });
  const enriched = await ensureEnriched(created);
  return enriched.toObject ? enriched.toObject() : enriched;
}

/**
 * Admin: partial update a Vocabulary entry. Only allowed fields are applied.
 * 404 if not found, 409 if word rename collides with existing entry.
 */
export async function updateVocabulary(id, payload) {
  const allowed = ["word", "partOfSpeech", "ipa", "audio", "definitions"];
  const update = {};
  for (const k of allowed) {
    if (payload[k] !== undefined) update[k] = payload[k];
  }
  if (Object.keys(update).length === 0) {
    throw ApiError.badRequest("No valid fields to update");
  }
  if (update.word) {
    const normalized = update.word.toLowerCase().trim();
    if (!normalized) throw ApiError.badRequest("word must not be empty");
    const dup = await Vocabulary.findOne({
      word: normalized,
      _id: { $ne: id },
    }).lean();
    if (dup) throw ApiError.conflict(`Vocabulary "${normalized}" already exists`);
    update.word = normalized;
  }
  const updated = await Vocabulary.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  }).lean();
  if (!updated) throw ApiError.notFound("Vocabulary not found");
  return updated;
}

/**
 * Admin: delete a Vocabulary entry by _id. 404 if not found.
 * Note: orphans existing UserVocabulary refs and lesson vocabularyRefs — admin's responsibility.
 */
export async function deleteVocabulary(id) {
  const result = await Vocabulary.findByIdAndDelete(id);
  if (!result) throw ApiError.notFound("Vocabulary not found");
  return { deleted: true, id };
}

/**
 * List global Vocabulary collection (paginated, searchable by word).
 * Returns raw lean documents.
 */
export async function listDictionary(filters, pagination) {
  const { search } = filters;
  const { page, limit } = pagination;

  const query = {};
  if (search) query.word = { $regex: search, $options: "i" };

  const [items, total] = await Promise.all([
    Vocabulary.find(query)
      .sort({ word: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Vocabulary.countDocuments(query),
  ]);

  return { items, total };
}

/**
 * Get a single global Vocabulary doc by _id.
 */
export async function getDictionaryById(id) {
  const vocab = await Vocabulary.findById(id).lean();
  if (!vocab) throw ApiError.notFound("Vocabulary not found");
  return vocab;
}

/**
 * Batch lookup global Vocabulary docs by list of _ids. Returns raw lean documents.
 */
export async function getDictionaryByIds(ids) {
  if (!ids || ids.length === 0) return [];
  return Vocabulary.find({ _id: { $in: ids } }).lean();
}

/**
 * List user's UserVocabulary entries (joined with Vocabulary).
 * Filters: status, search (on word). Paginated. Sorted by addedAt desc.
 */
export async function listMyVocabulary(userId, filters, pagination) {
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
    vocabularyId: r.vocab._id,
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
 * Get user's vocabulary entry detail by UserVocabulary._id.
 * Joins with Vocabulary, auto-enriches if definitions missing.
 */
export async function getMyVocabularyById(userId, userVocabId) {
  const userVocab = await UserVocabulary.findOne({
    _id: userVocabId,
    userId,
  }).lean();
  if (!userVocab) throw ApiError.notFound("Word not found");

  let vocab = await Vocabulary.findById(userVocab.vocabularyId).lean();
  if (!vocab) throw ApiError.notFound("Vocabulary entry not found");

  if (!vocab.definitions || vocab.definitions.length === 0) {
    const enriched = await ensureEnriched(vocab);
    vocab = enriched.toObject ? enriched.toObject() : enriched;
  }

  return {
    id: userVocab._id,
    vocabularyId: vocab._id,
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
 * Delete word from user's list
 */
export async function deleteWord(userId, wordId) {
  const result = await UserVocabulary.findOneAndDelete({ _id: wordId, userId });
  if (!result) throw ApiError.notFound("Word not found");
  return { deleted: true };
}
