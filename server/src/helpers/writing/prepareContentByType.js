import { ApiError } from "@server/helpers/ApiError";
import { validateFields } from "@server/helpers/validateFields";
import { WRITING_TYPE } from "@server/const/writting";

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
  validateFields(body, ["image"]);

  const wordPool = Array.isArray(body.wordPool) ? body.wordPool : [];

  return {
    fields: {
      image: body.image,
      ...(wordPool.length > 0 && { wordPool }),
      ...(body.minWordCount != null && { minWordCount: body.minWordCount }),
      ...(body.maxWordCount != null && { maxWordCount: body.maxWordCount }),
    },
    totalSentences: 1,
  };
}

function prepareRewrite(body) {
  const { sentences } = body;

  if (!Array.isArray(sentences) || sentences.length === 0) {
    throw ApiError.badRequest("sentences must be a non-empty array");
  }

  const cleaned = sentences.map((s, i) => {
    validateFields(s, ["targetSentence"]);
    return {
      order: i + 1,
      targetSentence: s.targetSentence.trim(),
    };
  });

  return {
    fields: { sentences: cleaned },
    totalSentences: cleaned.length,
  };
}

function prepareExam(body) {
  validateFields(body, ["examType", "examPrompt"]);

  const ALLOWED_TYPES = ["ielts_task1", "ielts_task2"];
  if (!ALLOWED_TYPES.includes(body.examType)) {
    throw ApiError.badRequest(`examType must be one of: ${ALLOWED_TYPES.join(", ")}`);
  }

  if (body.examType === "ielts_task1" && !body.imageUrl?.trim()) {
    throw ApiError.badRequest("imageUrl is required for IELTS Task 1");
  }

  return {
    fields: {
      examType: body.examType,
      examPrompt: body.examPrompt.trim(),
      ...(body.imageUrl && { imageUrl: body.imageUrl.trim() }),
    },
    totalSentences: 1,
  };
}
