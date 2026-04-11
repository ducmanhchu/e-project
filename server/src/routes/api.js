import express from "express";
import * as authController from "@server/controllers/authController";
import * as userController from "@server/controllers/userController";
import * as writingController from "@server/controllers/writingController";
import * as exerciseController from "@server/controllers/exerciseController";
import * as seeWriteController from "@server/controllers/seeWriteController";
import * as vocabularyController from "@server/controllers/vocabularyController";
import * as uploadController from "@server/controllers/uploadController";
import * as seeWriteAdminController from "@server/controllers/seeWriteAdminController";
import * as rewriteController from "@server/controllers/rewriteController";
import * as rewriteAdminController from "@server/controllers/rewriteAdminController";
import * as examController from "@server/controllers/examController";
import * as examAdminController from "@server/controllers/examAdminController";
import * as attemptController from "@server/controllers/attemptController";
import { MAX_FILE_SIZE } from "@server/const/upload";
import multer from "multer";
import {
  protectedRoute,
  authorizeRoles,
} from "@server/middlewares/authMiddleware";
import { USER_ROLE } from "@server/const/user";
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE } });

// auth routes
router.post("/auth/signup", authController.signUp);
router.post("/auth/signin", authController.signIn);

router.post("/auth/signout", authController.signOut);
router.post("/auth/refresh", authController.refreshToken);

router.use(protectedRoute);
router.get("/me", userController.authMe);

// reverse translation — user
router.get("/writing/reverse-translation", exerciseController.listLessons);
router.get("/writing/reverse-translation/:lessonId", exerciseController.getLesson);
router.get("/writing/reverse-translation/:lessonId/attempt", exerciseController.getAttempt);
router.post("/writing/reverse-translation/:lessonId/submit", exerciseController.submitAnswer);
router.get("/writing/reverse-translation/:lessonId/progress", exerciseController.getProgress);
router.get("/writing/reverse-translation/:lessonId/history", exerciseController.getHistory);

// see & write — lesson data
router.get("/writing/see-and-write", seeWriteController.listLessons);
router.get("/writing/see-and-write/:lessonId", seeWriteController.getLesson);
router.get("/writing/see-and-write/:lessonId/attempt", seeWriteController.getAttempt);
router.post("/writing/see-and-write/:lessonId/check-keywords", seeWriteController.checkKeywords);
router.post("/writing/see-and-write/:lessonId/submit", seeWriteController.submitAnswer);
router.get("/writing/see-and-write/:lessonId/progress", seeWriteController.getProgress);
router.get("/writing/see-and-write/:lessonId/history", seeWriteController.getHistory);

// rewrite — lesson data + exercise
router.get("/writing/rewrite", rewriteController.listLessons);
router.get("/writing/rewrite/:lessonId", rewriteController.getLesson);
router.get("/writing/rewrite/:lessonId/attempt", rewriteController.getAttempt);
router.post("/writing/rewrite/:lessonId/submit", rewriteController.submitAnswer);
router.get("/writing/rewrite/:lessonId/progress", rewriteController.getProgress);
router.get("/writing/rewrite/:lessonId/history", rewriteController.getHistory);

// exam — IELTS exercise
router.get("/writing/exam", examController.listExams);
router.get("/writing/exam/:examId", examController.getExam);
router.get("/writing/exam/:examId/attempt", examController.getAttempt);
router.post("/writing/exam/:examId/submit", examController.submitAnswer);
router.get("/writing/exam/:examId/progress", examController.getProgress);
router.get("/writing/exam/:examId/history", examController.getHistory);

// attempts — batch query (shared across all modules)
router.get("/attempts", attemptController.listAttempts);

// vocabulary
router.post("/vocabulary", vocabularyController.addWord);
router.get("/vocabulary", vocabularyController.listWords);
router.get("/vocabulary/stats", vocabularyController.getStats);
router.get("/vocabulary/review/questions", vocabularyController.getReviewQuestions);
router.post("/vocabulary/review/complete", vocabularyController.recordReview);
router.get("/vocabulary/:wordId", vocabularyController.getWordDetail);
router.patch("/vocabulary/:wordId/status", vocabularyController.updateStatus);
router.delete("/vocabulary/:wordId", vocabularyController.deleteWord);

// admin routes
router.use("/admin", authorizeRoles(USER_ROLE.ADMIN));
router.post("/admin/upload", upload.single("file"), uploadController.uploadMedia);
router.post("/admin/writing/reverse-translation/preview", writingController.previewWriting);
router.post("/admin/writing/reverse-translation", writingController.createWriting);
router.post("/admin/writing/reverse-translation/:id/dictionary", writingController.saveDictionary);

// admin see & write
router.get("/admin/writing/see-and-write", seeWriteAdminController.listLessons);
router.post("/admin/writing/see-and-write", seeWriteAdminController.createLesson);
router.get("/admin/writing/see-and-write/:id", seeWriteAdminController.getLesson);
router.put("/admin/writing/see-and-write/:id", seeWriteAdminController.updateLesson);

// admin rewrite
router.get("/admin/writing/rewrite", rewriteAdminController.listLessons);
router.post("/admin/writing/rewrite", rewriteAdminController.createLesson);
router.get("/admin/writing/rewrite/:id", rewriteAdminController.getLesson);
router.put("/admin/writing/rewrite/:id", rewriteAdminController.updateLesson);

// admin exam
router.get("/admin/writing/exam", examAdminController.listExams);
router.post("/admin/writing/exam", examAdminController.createExam);
router.get("/admin/writing/exam/:id", examAdminController.getExam);

export default router;
