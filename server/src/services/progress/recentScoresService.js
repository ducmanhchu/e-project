import { Attempt } from "@server/models/attempt/Attempt";
import { resolveLessonTitles } from "@server/services/progress/lessonTitleResolver";

const LESSON_TYPES = ["ReverseTranslation", "SeeWrite", "Rewrite", "Exam"];
const DEFAULT_N = 5;
const MAX_N = 20;

function round1(n) {
  return Math.round(n * 10) / 10;
}

function attemptAvgScore(attempt) {
  const sp = attempt.sentenceProgress;
  if (!sp?.length) return 0;
  const sum = sp.reduce((a, s) => a + (s.bestScore || 0), 0);
  return round1(sum / sp.length);
}

export async function getRecentScores({ userId, n }) {
  const safeN = Math.min(Math.max(1, Number(n) || DEFAULT_N), MAX_N);

  const items = await Promise.all(
    LESSON_TYPES.map(async (lessonType) => {
      const filter = { userId, lessonType, status: "completed" };
      const [statsAgg, recent] = await Promise.all([
        Attempt.aggregate([
          { $match: filter },
          {
            $addFields: {
              _avg: {
                $cond: [
                  {
                    $gt: [
                      { $size: { $ifNull: ["$sentenceProgress", []] } },
                      0,
                    ],
                  },
                  { $avg: "$sentenceProgress.bestScore" },
                  0,
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              avgScore: { $avg: "$_avg" },
              totalCompleted: { $sum: 1 },
            },
          },
        ]),
        Attempt.find(filter)
          .sort({ completedAt: -1 })
          .limit(safeN)
          .lean(),
      ]);

      const refs = recent.map((a) => ({
        lessonType: a.lessonType,
        lessonId: a.lessonId,
      }));
      const titleMap = await resolveLessonTitles(refs);

      const attempts = recent.map((a) => ({
        id: String(a.lessonId),
        title: titleMap.get(`${a.lessonType}:${a.lessonId}`) ?? null,
        score: attemptAvgScore(a),
        completedAt: a.completedAt,
      }));

      return {
        lessonType,
        totalCompleted: statsAgg[0]?.totalCompleted ?? 0,
        avgScore: round1(statsAgg[0]?.avgScore ?? 0),
        attempts,
      };
    }),
  );

  return { items };
}
