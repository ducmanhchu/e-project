import express from "express";
import * as authController from "@server/controllers/authController";
import * as userController from "@server/controllers/userController";
import * as exerciseController from "@server/controllers/exerciseController";
import * as seeWriteController from "@server/controllers/seeWriteController";
import * as rewriteController from "@server/controllers/rewriteController";
import * as examController from "@server/controllers/examController";
import * as attemptController from "@server/controllers/attemptController";
import * as vocabularyController from "@server/controllers/vocabularyController";
import * as uploadController from "@server/controllers/uploadController";
import { MAX_FILE_SIZE } from "@server/const/upload";
import multer from "multer";
import {
  protectedRoute,
  authorizeRoles,
} from "@server/middlewares/authMiddleware";
import { USER_ROLE } from "@server/const/user";
const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});
const admin = authorizeRoles(USER_ROLE.ADMIN);

// auth routes
router.post("/auth/signup", authController.signUp);
router.post("/auth/signin", authController.signIn);
router.post("/auth/signout", authController.signOut);
router.post("/auth/refresh", authController.refreshToken);

router.use(protectedRoute);
router.get("/me", userController.authMe);

// ── Reverse Translation ─────────────────────────────────
router.get("/writing/reverse-translation", exerciseController.listLessons);
router.post(
  "/writing/reverse-translation",
  admin,
  exerciseController.createLesson,
);
router.post(
  "/writing/reverse-translation/preview",
  admin,
  exerciseController.previewWriting,
);
router.get("/writing/reverse-translation/:id", exerciseController.getLesson);
router.put(
  "/writing/reverse-translation/:id",
  admin,
  exerciseController.updateLesson,
);
router.delete(
  "/writing/reverse-translation/:id",
  admin,
  exerciseController.deleteLesson,
);
router.post(
  "/writing/reverse-translation/:id/dictionary",
  admin,
  exerciseController.saveDictionary,
);
router.get(
  "/writing/reverse-translation/:id/attempt",
  exerciseController.getAttempt,
);
router.post(
  "/writing/reverse-translation/:id/submit",
  exerciseController.submitAnswer,
);
// ── See & Write ──────────────────────────────────────────
router.get("/writing/see-and-write", seeWriteController.listLessons);
router.post("/writing/see-and-write", admin, seeWriteController.createLesson);
router.get("/writing/see-and-write/:id", seeWriteController.getLesson);
router.put(
  "/writing/see-and-write/:id",
  admin,
  seeWriteController.updateLesson,
);
router.delete(
  "/writing/see-and-write/:id",
  admin,
  seeWriteController.deleteLesson,
);
router.get("/writing/see-and-write/:id/attempt", seeWriteController.getAttempt);
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
router.get("/writing/rewrite", rewriteController.listLessons);
router.post("/writing/rewrite", admin, rewriteController.createLesson);
router.get("/writing/rewrite/:id", rewriteController.getLesson);
router.put("/writing/rewrite/:id", admin, rewriteController.updateLesson);
router.delete("/writing/rewrite/:id", admin, rewriteController.deleteLesson);
router.get("/writing/rewrite/:id/attempt", rewriteController.getAttempt);
router.post("/writing/rewrite/:id/submit", rewriteController.submitAnswer);
router.get("/writing/rewrite/:id/history", rewriteController.getHistory);

// ── Exam ─────────────────────────────────────────────────
router.get("/writing/exam", examController.listExams);
router.post("/writing/exam", admin, examController.createExam);
router.get("/writing/exam/:id", examController.getExam);
router.put("/writing/exam/:id", admin, examController.updateExam);
router.delete("/writing/exam/:id", admin, examController.deleteExam);
router.get("/writing/exam/:id/attempt", examController.getAttempt);
router.post("/writing/exam/:id/submit", examController.submitAnswer);
router.get("/writing/exam/:id/history", examController.getHistory);

// ── Attempts (shared) ────────────────────────────────────
router.get("/attempts", attemptController.listAttempts);
router.put("/attempts/:id", attemptController.updateAttempt);

// ── Vocabulary ───────────────────────────────────────────
router.post("/vocabulary", vocabularyController.addWord);
router.get("/vocabulary", vocabularyController.listWords);
router.get("/vocabulary/stats", vocabularyController.getStats);
router.get(
  "/vocabulary/review/questions",
  vocabularyController.getReviewQuestions,
);
router.post("/vocabulary/review/complete", vocabularyController.recordReview);
router.get("/vocabulary/:id", vocabularyController.getWordDetail);
router.patch("/vocabulary/:id/status", vocabularyController.updateStatus);
router.delete("/vocabulary/:id", vocabularyController.deleteWord);

// ── Upload (admin only) ─────────────────────────────────
router.post(
  "/upload",
  admin,
  upload.single("file"),
  uploadController.uploadMedia,
);

export default router;
