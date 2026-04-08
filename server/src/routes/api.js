import express from "express";
import * as authController from "@server/controllers/authController";
import * as userController from "@server/controllers/userController";
import * as writingController from "@server/controllers/writingController";
import * as exerciseController from "@server/controllers/exerciseController";
import * as vocabularyController from "@server/controllers/vocabularyController";
import {
  protectedRoute,
  authorizeRoles,
} from "@server/middlewares/authMiddleware";
import { USER_ROLE } from "@server/const/user";
const router = express.Router();

// auth routes
router.post("/auth/signup", authController.signUp);
router.post("/auth/signin", authController.signIn);

router.post("/auth/signout", authController.signOut);
router.post("/auth/refresh", authController.refreshToken);

router.use(protectedRoute);
router.get("/me", userController.authMe);

// writing — lesson data (read-only for users)
router.get("/writing/reverse-translation", exerciseController.listLessons);
router.get("/writing/reverse-translation/:lessonId", exerciseController.getLesson);

// attempts — user exercise progress
router.get("/attempts", exerciseController.listAttempts);
router.get("/attempts/:lessonId", exerciseController.getAttempt);
router.post("/attempts/:lessonId/submit", exerciseController.submitAnswer);
router.get("/attempts/:lessonId/progress", exerciseController.getProgress);
router.get("/attempts/:lessonId/history", exerciseController.getHistory);

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
router.post("/admin/writing/reverse-translation/preview", writingController.previewWriting);
router.post("/admin/writing/reverse-translation", writingController.createWriting);
router.post("/admin/writing/reverse-translation/:id/dictionary", writingController.saveDictionary);


export default router;
