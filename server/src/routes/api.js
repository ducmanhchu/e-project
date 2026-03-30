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
// router.post("/auth/verify", authController.verifyAccount);

router.use(protectedRoute);
router.get("/me", userController.authMe);

// user exercise routes
router.get("/writings", exerciseController.listLessons);
router.get("/writings/:lessonId/exercise", exerciseController.getExercise);
router.post("/writings/:lessonId/exercise/submit", exerciseController.submitAnswer);
router.get("/writings/:lessonId/exercise/progress", exerciseController.getProgress);
router.get("/writings/:lessonId/exercise/history", exerciseController.getHistory);

// vocabulary routes
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
router.post("/admin/writings/preview", writingController.previewWriting);
router.post("/admin/writings", writingController.createWriting);
router.post("/admin/writings/:id/dictionary", writingController.saveDictionary);
router.patch("/admin/writings/:id/publish", writingController.publishWriting);

export default router;
