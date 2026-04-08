import { WRITING_TYPE } from "@server/const/writting";
import { ReverseTranslation } from "@server/models/writing/ReverseTranslation";
import { SeeWrite } from "@server/models/writing/SeeWrite";
import { Rewrite } from "@server/models/writing/Rewrite";
import { Exam } from "@server/models/writing/Exam";

const MODEL_MAP = {
  [WRITING_TYPE.REVERSE_TRANSLATION]: ReverseTranslation,
  [WRITING_TYPE.SEE_AND_WRITE]: SeeWrite,
  [WRITING_TYPE.PARAPHRASING]: Rewrite,
  [WRITING_TYPE.EXAM_SIMULATION]: Exam,
};

const MODEL_NAME_MAP = {
  ReverseTranslation: ReverseTranslation,
  SeeWrite: SeeWrite,
  Rewrite: Rewrite,
  Exam: Exam,
};

const TYPE_TO_MODEL_NAME = {
  [WRITING_TYPE.REVERSE_TRANSLATION]: "ReverseTranslation",
  [WRITING_TYPE.SEE_AND_WRITE]: "SeeWrite",
  [WRITING_TYPE.PARAPHRASING]: "Rewrite",
  [WRITING_TYPE.EXAM_SIMULATION]: "Exam",
};

export function getModelByType(type) {
  return MODEL_MAP[type] || null;
}

export function getModelByName(modelName) {
  return MODEL_NAME_MAP[modelName] || null;
}

export function getModelName(type) {
  return TYPE_TO_MODEL_NAME[type] || null;
}

/**
 * Find a lesson by ID across all writing collections.
 * Returns { doc, type, modelName } or null.
 */
export async function findLessonById(lessonId, queryFilter = {}) {
  const entries = Object.entries(MODEL_MAP);

  const results = await Promise.all(
    entries.map(async ([type, Model]) => {
      const doc = await Model.findOne({ _id: lessonId, ...queryFilter }).lean();
      return doc ? { doc, type, modelName: TYPE_TO_MODEL_NAME[type] } : null;
    }),
  );

  return results.find(Boolean) || null;
}
