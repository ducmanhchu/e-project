import { ApiError } from "@server/helpers/ApiError";
import { validateFields } from "@server/helpers/validateFields";
import { WRITING_TYPE, EXAM_TYPE } from "@server/const/writting";

/**
 * Validate type-specific fields and return flat fields + totalSentences
 */
export function prepareContentByType(type, body) {
  switch (type) {
    case WRITING_TYPE.REVERSE_TRANSLATION:
      return prepareReverseTranslation(body);
    case WRITING_TYPE.SEE_AND_WRITE:
      return prepareDescribe(body);
    case WRITING_TYPE.PARAPHRASING:
      return prepareRewrite(body);
    case WRITING_TYPE.EXAM_SIMULATION:
      return prepareExam(body);
    default:
      throw ApiError.badRequest(`Invalid writing type: ${type}`);
  }
}

function prepareReverseTranslation(body) {
  const { sentences, vietnameseParagraph } = body;

  if (!Array.isArray(sentences) || sentences.length === 0) {
    throw ApiError.badRequest("sentences must be a non-empty array");
  }

  const cleaned = sentences.map((s, i) => {
    validateFields(s, ["vietnameseText", "referenceAnswer"]);
    return {
      order: i + 1,
      vietnameseText: s.vietnameseText.trim(),
      referenceAnswer: s.referenceAnswer.trim(),
    };
  });

  return {
    fields: {
      vietnameseParagraph: vietnameseParagraph?.trim() || null,
      sentences: cleaned,
    },
    totalSentences: cleaned.length,
  };
}

function prepareDescribe(body) {
  validateFields(body, ["mediaUrl", "mediaType"]);

  if (!["image", "video"].includes(body.mediaType)) {
    throw ApiError.badRequest("mediaType must be 'image' or 'video'");
  }

  return {
    fields: {
      mediaUrl: body.mediaUrl,
      mediaType: body.mediaType,
      ...(body.requiredKeywords && { requiredKeywords: body.requiredKeywords }),
      ...(body.minWordCount != null && { minWordCount: body.minWordCount }),
      ...(body.maxWordCount != null && { maxWordCount: body.maxWordCount }),
    },
    totalSentences: 1,
  };
}

function prepareRewrite(body) {
  validateFields(body, ["targetSentence"]);

  return {
    fields: {
      targetSentence: body.targetSentence.trim(),
    },
    totalSentences: 1,
  };
}

function prepareExam(body) {
  validateFields(body, ["examType", "examPrompt", "examDuration"]);

  if (!Object.values(EXAM_TYPE).includes(body.examType)) {
    throw ApiError.badRequest(
      `examType must be one of: ${Object.values(EXAM_TYPE).join(", ")}`,
    );
  }

  return {
    fields: {
      examType: body.examType,
      examPrompt: body.examPrompt.trim(),
      examDuration: body.examDuration,
      ...(body.sampleAnswer && { sampleAnswer: body.sampleAnswer.trim() }),
    },
    totalSentences: 1,
  };
}
