import { ApiError } from "@server/helpers/ApiError";
import { validateFields } from "@server/helpers/validateFields";
import { prepareContentByType } from "@server/helpers/writing/prepareContentByType";
import { getModelByType, findLessonById } from "@server/helpers/writing/getWritingModel";
import { Vocabulary } from "@server/models/vocabulary/Vocabulary";
import { aiPreviewWriting } from "@server/services/ai/previewProvider";
import { normalizeWord } from "@server/helpers/writing/normalizeWord";
import { ensureEnriched } from "@server/services/vocabularyService";

/**
 * Bước 1 (Preview): Admin gửi đoạn văn tiếng Anh
 * → AI tách câu + dịch tiếng Việt + trả vocabulary mỗi câu
 * → Chưa lưu DB
 */
export async function previewWriting(body) {
  const { paragraph, type, contentType, topic, title, level, description } = body;

  if (!paragraph || typeof paragraph !== "string" || !paragraph.trim()) {
    throw ApiError.badRequest("paragraph is required");
  }

  const context = { type, contentType, topic, title, level, description };
  const { result: parsed, provider } = await aiPreviewWriting(paragraph, context);

  const sentences = parsed.results.map((s, i) => ({
    order: i + 1,
    referenceAnswer: s.referenceAnswer.trim(),
    vietnameseText: s.vietnameseText.trim(),
  }));

  const vocabulary = parsed.results.flatMap((s, i) =>
    (s.vocabulary || []).map((v) => ({
      sentenceIndex: i + 1,
      word: normalizeWord(v.word, v.partOfSpeech, s.referenceAnswer),
      partOfSpeech: v.partOfSpeech,
      meaning: v.meaning,
      example: v.example,
    })),
  );

  return {
    vietnameseParagraph: parsed.vietnameseParagraph,
    sentences,
    vocabulary,
    provider,
  };
}

/**
 * Bước 2: Admin review/chỉnh sửa xong → tạo lesson (draft)
 */
export async function createWriting(body) {
  validateFields(body, ["title", "type", "level"]);

  const Model = getModelByType(body.type);
  if (!Model) throw ApiError.badRequest(`Invalid writing type: ${body.type}`);

  const { fields, totalSentences } = prepareContentByType(body.type, body);

  const lesson = await Model.create({
    title: body.title,
    level: body.level,
    contentType: body.contentType,
    topic: body.topic,
    description: body.description,
    sortOrder: body.sortOrder,
    totalSentences,
    ...fields,
  });

  return lesson;
}

/**
 * Bước 3: Admin lưu vocabulary cho lesson
 * Upsert mỗi entry vào Vocabulary collection, lưu refs vào lesson
 */
export async function saveDictionary(lessonId, entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw ApiError.badRequest("entries must be a non-empty array");
  }

  const found = await findLessonById(lessonId);
  if (!found) throw ApiError.notFound("Writing lesson not found");

  const Model = getModelByType(found.type);

  // Upsert each word into Vocabulary collection
  const vocabRefs = await Promise.all(
    entries.map(async (e) => {
      const normalized = normalizeWord(e.word, e.partOfSpeech, e.example);
      const existed = await Vocabulary.findOne({
        word: normalized,
        partOfSpeech: e.partOfSpeech || null,
      });

      let vocab;
      if (existed) {
        vocab = existed;
      } else {
        vocab = await Vocabulary.create({
          word: normalized,
          partOfSpeech: e.partOfSpeech,
          definitions: [],
        });
        // Fire-and-forget AI enrich for new words
        ensureEnriched(vocab).catch((err) =>
          console.error(`[enrich] Failed for "${vocab.word}":`, err.message),
        );
      }
      return {
        vocabularyId: vocab._id,
        sentenceIndex: e.sentenceIndex ?? null,
      };
    }),
  );

  // Save refs into lesson (only ReverseTranslation has vocabularyRefs)
  await Model.findByIdAndUpdate(
    lessonId,
    { $set: { vocabularyRefs: vocabRefs } },
  );

  return { saved: vocabRefs.length };
}

