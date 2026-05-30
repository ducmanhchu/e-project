import { ReverseTranslation } from "@server/models/writing/ReverseTranslation";
import { SeeWrite } from "@server/models/writing/SeeWrite";
import { Rewrite } from "@server/models/writing/Rewrite";
import { Exam } from "@server/models/writing/Exam";

const MODEL_BY_TYPE = {
  ReverseTranslation,
  SeeWrite,
  Rewrite,
  Exam,
};

export async function resolveLessonTitles(refs) {
  if (!refs?.length) return new Map();

  const idsByType = new Map();
  for (const { lessonType, lessonId } of refs) {
    if (!MODEL_BY_TYPE[lessonType]) continue;
    if (!idsByType.has(lessonType)) idsByType.set(lessonType, new Set());
    idsByType.get(lessonType).add(String(lessonId));
  }

  const results = await Promise.all(
    Array.from(idsByType.entries()).map(async ([type, idSet]) => {
      const docs = await MODEL_BY_TYPE[type]
        .find({ _id: { $in: Array.from(idSet) } })
        .select("title")
        .lean();
      return docs.map((d) => [`${type}:${d._id}`, d.title]);
    }),
  );

  return new Map(results.flat());
}
