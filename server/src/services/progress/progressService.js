import mongoose from "mongoose";
import { Attempt } from "@server/models/attempt/Attempt";
import { WordChainGame } from "@server/models/wordChain/WordChainGame";
import { DialogueAttempt } from "@server/models/slangHang/DialogueAttempt";
import { UserVocabulary } from "@server/models/userVocabulary/UserVocabulary";
import { Deck } from "@server/models/deck/Deck";
import * as streakService from "@server/services/progress/streakService";

const WRITING_LESSON_TYPES = ["ReverseTranslation", "SeeWrite", "Rewrite", "Exam"];

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
    {
      $group: {
        _id: "$lessonType",
        avgScore: { $avg: "$_avg" },
        totalCompleted: { $sum: 1 },
      },
    },
  ]);

  const byType = Object.fromEntries(
    rows.map((r) => [
      r._id,
      { totalCompleted: r.totalCompleted, avgScore: round1(r.avgScore) },
    ]),
  );

  return WRITING_LESSON_TYPES.map((lessonType) => ({
    lessonType,
    totalCompleted: byType[lessonType]?.totalCompleted ?? 0,
    avgScore: byType[lessonType]?.avgScore ?? 0,
  }));
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
  ]);

  return {
    totalCompletedExercises: writingDone + wordchainDone + slangDone,
    totalDecks,
    currentStreak,
    totalVocabulary,
    writingStats,
  };
}
