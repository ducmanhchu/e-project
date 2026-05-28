import { Attempt } from "@server/models/attempt/Attempt";
import { WordChainGame } from "@server/models/wordChain/WordChainGame";
import { DialogueAttempt } from "@server/models/slangHang/DialogueAttempt";
import { UserVocabulary } from "@server/models/userVocabulary/UserVocabulary";
import { Deck } from "@server/models/deck/Deck";
import * as streakService from "@server/services/progress/streakService";

export async function getSummary(userId) {
  const [
    writingDone,
    wordchainDone,
    slangDone,
    totalDecks,
    totalVocabulary,
    currentStreak,
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
  ]);

  return {
    totalCompletedExercises: writingDone + wordchainDone + slangDone,
    totalDecks,
    currentStreak,
    totalVocabulary,
  };
}
