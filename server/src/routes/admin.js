import express from "express";
import * as exerciseController from "@server/controllers/exerciseController";
import * as seeWriteController from "@server/controllers/seeWriteController";
import * as rewriteController from "@server/controllers/rewriteController";
import * as examController from "@server/controllers/examController";
import * as uploadController from "@server/controllers/uploadController";
import * as vocabularyController from "@server/controllers/vocabularyController";
import { mediaUpload } from "@server/middlewares/upload";
import { protectedRoute, authorizeRoles } from "@server/middlewares/authMiddleware";
import { USER_ROLE } from "@server/const/user";

const adminRouter = express.Router();

adminRouter.use(protectedRoute);
adminRouter.use(authorizeRoles(USER_ROLE.ADMIN));

// ── Reverse Translation ───────────────────────────────
adminRouter.get(
  "/writing/reverse-translation",
  exerciseController.adminListLessons,
);
adminRouter.post(
  "/writing/reverse-translation",
  exerciseController.createLesson,
);
adminRouter.post(
  "/writing/reverse-translation/preview",
  exerciseController.previewWriting,
);
adminRouter.get(
  "/writing/reverse-translation/:id",
  exerciseController.adminGetLesson,
);
adminRouter.put(
  "/writing/reverse-translation/:id",
  exerciseController.updateLesson,
);
adminRouter.delete(
  "/writing/reverse-translation/:id",
  exerciseController.deleteLesson,
);
adminRouter.post(
  "/writing/reverse-translation/:id/dictionary",
  exerciseController.saveDictionary,
);

// ── See & Write ───────────────────────────────────────
adminRouter.get("/writing/see-and-write", seeWriteController.adminListLessons);
adminRouter.post("/writing/see-and-write", seeWriteController.createLesson);
adminRouter.get("/writing/see-and-write/:id", seeWriteController.adminGetLesson);
adminRouter.put("/writing/see-and-write/:id", seeWriteController.updateLesson);
adminRouter.delete(
  "/writing/see-and-write/:id",
  seeWriteController.deleteLesson,
);

// ── Rewrite ───────────────────────────────────────────
adminRouter.get("/writing/rewrite", rewriteController.adminListLessons);
adminRouter.post("/writing/rewrite", rewriteController.createLesson);
adminRouter.get("/writing/rewrite/:id", rewriteController.adminGetLesson);
adminRouter.put("/writing/rewrite/:id", rewriteController.updateLesson);
adminRouter.delete("/writing/rewrite/:id", rewriteController.deleteLesson);

// ── Exam (IELTS) ──────────────────────────────────────
adminRouter.get("/writing/exam", examController.adminListExams);
adminRouter.post("/writing/exam", examController.createExam);
adminRouter.get("/writing/exam/:id", examController.adminGetExam);
adminRouter.put("/writing/exam/:id", examController.updateExam);
adminRouter.delete("/writing/exam/:id", examController.deleteExam);

// ── Vocabulary ────────────────────────────────────────
adminRouter.post("/vocabulary", vocabularyController.createVocabulary);
adminRouter.patch("/vocabulary/:id", vocabularyController.updateVocabulary);
adminRouter.delete("/vocabulary/:id", vocabularyController.deleteVocabulary);

// ── Upload ────────────────────────────────────────────
adminRouter.post(
  "/upload",
  mediaUpload.single("file"),
  uploadController.uploadMedia,
);

export default adminRouter;
