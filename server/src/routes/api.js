import express from "express";
import * as authController from "@server/controllers/authController";
import * as userController from "@server/controllers/userController";
import * as reverseTranslationController from "@server/controllers/reverseTranslationController";
import * as seeWriteController from "@server/controllers/seeWriteController";
import * as rewriteController from "@server/controllers/rewriteController";
import * as examController from "@server/controllers/examController";
import * as attemptController from "@server/controllers/attemptController";
import * as vocabularyController from "@server/controllers/vocabularyController";
import * as slangHangController from "@server/controllers/slangHangController";
import * as deckController from "@server/controllers/deckController";
import * as folderController from "@server/controllers/folderController";
import * as communityController from "@server/controllers/communityController";
import * as uploadController from "@server/controllers/uploadController";
import { mediaUpload } from "@server/middlewares/upload";
import {
  protectedRoute,
  optionalAuth,
} from "@server/middlewares/authMiddleware";
const router = express.Router();

// auth routes
router.post("/auth/signup", authController.signUp);
router.post("/auth/signin", authController.signIn);
router.post("/auth/signout", authController.signOut);
router.post("/auth/refresh", authController.refreshToken);
router.post("/auth/google", authController.googleSignIn);
router.post("/auth/verify-email", authController.verifyEmail);
router.post("/auth/resend-verification", authController.resendVerification);
router.post("/auth/forgot-password", authController.forgotPassword);
router.post("/auth/reset-password", authController.resetPassword);

// ── Public catalog (optional auth: guest sees defaults, logged-in sees attempt summary)
router.get(
  "/writing/reverse-translation",
  optionalAuth,
  reverseTranslationController.listLessons,
);
router.get(
  "/writing/see-and-write",
  optionalAuth,
  seeWriteController.listLessons,
);
router.get("/writing/rewrite", optionalAuth, rewriteController.listLessons);
router.get("/writing/exam", optionalAuth, examController.listExams);

// ── Community (public decks; anonymous-friendly) ──────────
router.get("/community/decks", optionalAuth, communityController.listPublicDecks);
router.get(
  "/community/decks/:deckId",
  optionalAuth,
  communityController.getPublicDeck,
);
router.get(
  "/community/decks/:deckId/cards",
  optionalAuth,
  communityController.listPublicDeckCards,
);

router.use(protectedRoute);
router.get("/me", userController.authMe);
router.post("/auth/change-password", authController.changePassword);

// ── Reverse Translation ─────────────────────────────────
router.get(
  "/writing/reverse-translation/:id",
  reverseTranslationController.getLesson,
);
router.post(
  "/writing/reverse-translation/:id/submit",
  reverseTranslationController.submitAnswer,
);
// ── See & Write ──────────────────────────────────────────
router.get("/writing/see-and-write/:id", seeWriteController.getLesson);
router.post(
  "/writing/see-and-write/:id/check-keywords",
  seeWriteController.checkKeywords,
);
router.post(
  "/writing/see-and-write/:id/submit",
  seeWriteController.submitAnswer,
);
router.get("/writing/see-and-write/:id/history", seeWriteController.getHistory);

// ── Rewrite ──────────────────────────────────────────────
router.get("/writing/rewrite/:id", rewriteController.getLesson);
router.post("/writing/rewrite/:id/submit", rewriteController.submitAnswer);

// ── Exam ─────────────────────────────────────────────────
router.get("/writing/exam/:id", examController.getExam);
router.post("/writing/exam/:id/submit", examController.submitAnswer);
router.get("/writing/exam/:id/history", examController.getHistory);

// ── Attempts (shared) ────────────────────────────────────
router.get("/attempts", attemptController.listAttempts);
router.put("/attempts/:id", attemptController.updateAttempt);

// ── Vocabulary (GLOBAL Vocabulary collection) ──────────
router.get("/vocabulary", vocabularyController.listDictionary);
router.get("/vocabulary/:id", vocabularyController.getDictionaryById);

// ── My Vocabulary (PER-USER UserVocabulary list) ───────
router.post("/me/vocabulary", vocabularyController.addWord);
router.get("/me/vocabulary", vocabularyController.listMyVocabulary);
router.get("/me/vocabulary/:id", vocabularyController.getMyVocabularyById);
router.delete("/me/vocabulary/:id", vocabularyController.deleteWord);

// ── Slang Hang ──────────────────────────────────────────
router.post("/slang-hang/generate", slangHangController.generate);
router.get("/slang-hang/dialogues", slangHangController.list);
router.get("/slang-hang/dialogues/:id", slangHangController.getOne);
router.delete("/slang-hang/dialogues/:id", slangHangController.remove);
router.get("/slang-hang/azure-token", slangHangController.azureToken);
router.post(
  "/slang-hang/dialogue-attempts",
  slangHangController.recordMessageAttempt,
);

// ── Deck folders (PER-USER, 1 level only) ──────────
router.post("/me/folders", folderController.createFolder);
router.get("/me/folders", folderController.listMyFolders);
router.get("/me/folders/:folderId", folderController.getMyFolderById);
router.patch("/me/folders/:folderId", folderController.updateFolder);
router.delete("/me/folders/:folderId", folderController.deleteFolder);

// ── Decks (PER-USER flashcard decks) ──────────────────
router.post("/me/decks", deckController.createDeck);
router.post("/me/decks/clone", communityController.cloneDeck);
router.get("/me/decks", deckController.listMyDecks);
router.get("/me/decks/:deckId", deckController.getMyDeckById);
router.patch("/me/decks/:deckId", deckController.updateDeck);
router.delete("/me/decks/:deckId", deckController.deleteDeck);

// ── Cards (deckId via query/body) ────────────────────
router.get("/me/cards", deckController.listCards);
router.post("/me/cards", deckController.addCardManual);
router.post("/me/cards/from-vocab", deckController.addCardsFromVocab);
router.patch("/me/cards/:cardId", deckController.updateCard);
router.delete("/me/cards/:cardId", deckController.deleteCard);
router.post("/me/cards/:cardId/rate", deckController.rateCard);

// ── Study (shuffled cards of a deck) ─────────────────
router.get("/me/study", deckController.getStudyCards);

// ── User upload (image for flashcards) ───────────────
router.post(
  "/me/upload/image",
  mediaUpload.single("file"),
  uploadController.uploadImage,
);

export default router;
