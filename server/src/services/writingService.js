import { ApiError } from "@server/helpers/ApiError";
import { validateFields } from "@server/helpers/validateFields";
import { prepareContentByType } from "@server/helpers/writing/prepareContentByType";
import { WritingLesson } from "@server/models/writing/WritingLesson";
import { Vocabulary } from "@server/models/vocabulary/Vocabulary";
import { aiPreviewWriting } from "@server/services/ai/previewProvider";

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
    ...(s.explanation && { explanation: s.explanation.trim() }),
  }));

  const vocabulary = parsed.results.flatMap((s, i) =>
    (s.vocabulary || []).map((v) => ({
      sentenceIndex: i + 1,
      word: v.word,
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
 * Bước 2: Admin review/chỉnh sửa xong → tạo WritingLesson (draft)
 */
export async function createWriting(body) {
  validateFields(body, ["title", "type", "level"]);

  const { content, totalSentences } = prepareContentByType(body.type, body);

  const lesson = await WritingLesson.create({
    type: body.type,
    title: body.title,
    level: body.level,
    contentType: body.contentType,
    topic: body.topic,
    description: body.description,
    isPremium: body.isPremium,
    sortOrder: body.sortOrder,
    content,
    totalSentences,
  });

  return lesson;
}

/**
 * Bước 3: Admin lưu vocabulary cho lesson
 * Upsert mỗi entry vào Vocabulary collection, lưu refs vào lesson content
 */
export async function saveDictionary(lessonId, entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw ApiError.badRequest("entries must be a non-empty array");
  }

  // Upsert each word into Vocabulary collection
  const vocabRefs = await Promise.all(
    entries.map(async (e) => {
      const vocab = await Vocabulary.findOneAndUpdate(
        { word: e.word.toLowerCase().trim(), meaning: e.meaning },
        {
          $set: {
            partOfSpeech: e.partOfSpeech,
            example: e.example,
          },
        },
        { upsert: true, new: true },
      );
      return {
        vocabularyId: vocab._id,
        sentenceIndex: e.sentenceIndex ?? null,
      };
    }),
  );

  // Save refs into lesson content using $set (avoid reading + spreading content)
  const lesson = await WritingLesson.findByIdAndUpdate(
    lessonId,
    { $set: { "content.vocabularyRefs": vocabRefs } },
    { new: true },
  );

  if (!lesson) throw ApiError.notFound("Writing lesson not found");

  return { saved: vocabRefs.length };
}

/**
 * Bước 4: Admin publish lesson
 */
export async function publishWriting(lessonId) {
  const lesson = await WritingLesson.findByIdAndUpdate(
    lessonId,
    { isPublished: true },
    { new: true },
  );

  if (!lesson) throw ApiError.notFound("Writing lesson not found");

  return lesson;
}
