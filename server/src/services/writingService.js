import { ApiError } from "@server/helpers/ApiError";
import { validateFields } from "@server/helpers/validateFields";
import { prepareContentByType } from "@server/helpers/writing/prepareContentByType";
import { WritingLesson } from "@server/models/writing/WritingLesson";
import { LessonDictionary } from "@server/models/LessonDictionary";
import { aiPreviewWriting } from "@server/services/aiProvider";

/**
 * Bước 1 (Preview): Admin gửi đoạn văn tiếng Anh
 * → Gemini tách câu + dịch tiếng Việt + trả vocabulary mỗi câu
 * → Chưa lưu DB
 */
export async function previewWriting(paragraph) {
  if (!paragraph || typeof paragraph !== "string" || !paragraph.trim()) {
    throw ApiError.badRequest("paragraph is required");
  }

  const { parsed, provider } = await aiPreviewWriting(paragraph);

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
export async function createWriting(body, adminId) {
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
    createdBy: adminId,
    content,
    totalSentences,
  });

  return lesson;
}

/**
 * Bước 3: Admin lưu hint/dictionary pool cho lesson
 * - entries[].sentenceIndex = N → hint cho câu N
 * - entries[].sentenceIndex = null → dictionary chung cho cả bài
 */
export async function saveDictionary(lessonId, entries) {
  const lesson = await WritingLesson.findById(lessonId);
  if (!lesson) throw ApiError.notFound("Writing lesson not found");

  if (!Array.isArray(entries) || entries.length === 0) {
    throw ApiError.badRequest("entries must be a non-empty array");
  }

  // Upsert: nếu đã có dictionary cho lesson này thì update, chưa có thì tạo
  const dictionary = await LessonDictionary.findOneAndUpdate(
    { lessonId },
    { lessonId, entries },
    { upsert: true, new: true, runValidators: true },
  );

  return dictionary;
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
