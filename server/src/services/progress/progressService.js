import mongoose from "mongoose";
import { Attempt } from "@server/models/attempt/Attempt";
import { WordChainGame } from "@server/models/wordChain/WordChainGame";
import { DialogueAttempt } from "@server/models/slangHang/DialogueAttempt";
import { UserVocabulary } from "@server/models/userVocabulary/UserVocabulary";
import { Deck } from "@server/models/deck/Deck";
import * as streakService from "@server/services/progress/streakService";
import { resolveLessonTitles } from "@server/services/progress/lessonTitleResolver";

const WRITING_LESSON_TYPES = ["ReverseTranslation", "SeeWrite", "Rewrite", "Exam"];
const RECENT_LIMIT = 5;
const SLANG_SCORE_FIELDS = [
  "accuracyScore",
  "fluencyScore",
  "completenessScore",
  "pronunciationScore",
  "prosodyScore",
];

function round1(n) {
  return Math.round(n * 10) / 10;
}

async function getWritingStats(userId) {
  const rows = await Attempt.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        status: "completed",
        lessonType: { $in: WRITING_LESSON_TYPES },
      },
    },
    {
      $addFields: {
        _avg: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ["$sentenceProgress", []] } }, 0] },
            { $avg: "$sentenceProgress.bestScore" },
            0,
          ],
        },
      },
    },
    { $sort: { completedAt: -1, _id: -1 } },
    {
      $group: {
        _id: "$lessonType",
        avgScore: { $avg: "$_avg" },
        totalCompleted: { $sum: 1 },
        recent: {
          $push: {
            id: "$lessonId",
            score: "$_avg",
            completedAt: "$completedAt",
          },
        },
      },
    },
    { $addFields: { recent: { $slice: ["$recent", RECENT_LIMIT] } } },
  ]);

  const byType = Object.fromEntries(rows.map((r) => [r._id, r]));

  const refs = [];
  for (const r of rows) {
    for (const item of r.recent) {
      refs.push({ lessonType: r._id, lessonId: item.id });
    }
  }
  const titleMap = await resolveLessonTitles(refs);

  return WRITING_LESSON_TYPES.map((lessonType) => {
    const row = byType[lessonType];
    if (!row) {
      return { lessonType, totalCompleted: 0, avgScore: 0, recentScores: [] };
    }
    return {
      lessonType,
      totalCompleted: row.totalCompleted,
      avgScore: round1(row.avgScore),
      recentScores: row.recent.map((item) => ({
        id: String(item.id),
        title: titleMap.get(`${lessonType}:${item.id}`) ?? null,
        score: round1(item.score),
        completedAt: item.completedAt ?? null,
      })),
    };
  });
}

async function getSlangStats(userId) {
  const rows = await DialogueAttempt.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        status: "completed",
      },
    },
    { $unwind: "$messageAttempts" },
    {
      $match: {
        "messageAttempts.feedback.pronunciationScore": { $exists: true },
      },
    },
    {
      $group: {
        _id: "$_id",
        accuracyScore: { $avg: "$messageAttempts.feedback.accuracyScore" },
        fluencyScore: { $avg: "$messageAttempts.feedback.fluencyScore" },
        completenessScore: {
          $avg: "$messageAttempts.feedback.completenessScore",
        },
        pronunciationScore: {
          $avg: "$messageAttempts.feedback.pronunciationScore",
        },
        prosodyScore: { $avg: "$messageAttempts.feedback.prosodyScore" },
      },
    },
    {
      $group: {
        _id: null,
        totalCompleted: { $sum: 1 },
        accuracyScore: { $avg: "$accuracyScore" },
        fluencyScore: { $avg: "$fluencyScore" },
        completenessScore: { $avg: "$completenessScore" },
        pronunciationScore: { $avg: "$pronunciationScore" },
        prosodyScore: { $avg: "$prosodyScore" },
      },
    },
  ]);

  const row = rows[0];
  const avgScores = Object.fromEntries(
    SLANG_SCORE_FIELDS.map((f) => [f, row ? round1(row[f] ?? 0) : 0]),
  );
  return { totalCompleted: row?.totalCompleted ?? 0, avgScores };
}

export async function getSummary(userId) {
  const [
    writingDone,
    wordchainDone,
    slangDone,
    totalDecks,
    totalVocabulary,
    currentStreak,
    writingStats,
    slangStats,
  ] = await Promise.all([
    Attempt.countDocuments({ userId, status: "completed" }),
    WordChainGame.countDocuments({
      userId,
      status: "ended",
      failReason: { $ne: "abandoned" },
    }),
    DialogueAttempt.countDocuments({ userId, status: "completed" }),
    Deck.countDocuments({ userId }),
    UserVocabulary.countDocuments({ userId }),
    streakService.getCurrentStreak(userId),
    getWritingStats(userId),
    getSlangStats(userId),
  ]);

  return {
    totalCompletedExercises: writingDone + wordchainDone + slangDone,
    totalDecks,
    currentStreak,
    totalVocabulary,
    writingStats,
    slangStats,
  };
}
