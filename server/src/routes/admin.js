import express from "express";
import * as reverseTranslationController from "@server/controllers/reverseTranslationController";
import * as seeWriteController from "@server/controllers/seeWriteController";
import * as rewriteController from "@server/controllers/rewriteController";
import * as examController from "@server/controllers/examController";
import * as uploadController from "@server/controllers/uploadController";
import * as vocabularyController from "@server/controllers/vocabularyController";
import * as slangHangController from "@server/controllers/slangHangController";
import * as statsController from "@server/controllers/statsController";
import { mediaUpload } from "@server/middlewares/upload";
import {
	protectedRoute,
	authorizeRoles,
} from "@server/middlewares/authMiddleware";
import { USER_ROLE } from "@server/const/user";

const adminRouter = express.Router();

adminRouter.use(protectedRoute);
adminRouter.use(authorizeRoles(USER_ROLE.ADMIN));

// ── Reverse Translation ───────────────────────────────
adminRouter.get(
	"/writing/reverse-translation",
	reverseTranslationController.adminListLessons,
);
adminRouter.post(
	"/writing/reverse-translation",
	reverseTranslationController.createLesson,
);
adminRouter.delete(
	"/writing/reverse-translation",
	reverseTranslationController.bulkDelete,
);
adminRouter.post(
	"/writing/reverse-translation/preview",
	reverseTranslationController.previewWriting,
);
adminRouter.get(
	"/writing/reverse-translation/:id",
	reverseTranslationController.adminGetLesson,
);
adminRouter.put(
	"/writing/reverse-translation/:id",
	reverseTranslationController.updateLesson,
);
adminRouter.delete(
	"/writing/reverse-translation/:id",
	reverseTranslationController.deleteLesson,
);
adminRouter.post(
	"/writing/reverse-translation/:id/dictionary",
	reverseTranslationController.saveDictionary,
);

// ── See & Write ───────────────────────────────────────
adminRouter.get("/writing/see-and-write", seeWriteController.adminListLessons);
adminRouter.post("/writing/see-and-write", seeWriteController.createLesson);
adminRouter.delete("/writing/see-and-write", seeWriteController.bulkDelete);
adminRouter.get(
	"/writing/see-and-write/:id",
	seeWriteController.adminGetLesson,
);
adminRouter.put("/writing/see-and-write/:id", seeWriteController.updateLesson);
adminRouter.delete(
	"/writing/see-and-write/:id",
	seeWriteController.deleteLesson,
);

// ── Rewrite ───────────────────────────────────────────
adminRouter.get("/writing/rewrite", rewriteController.adminListLessons);
adminRouter.post("/writing/rewrite", rewriteController.createLesson);
adminRouter.delete("/writing/rewrite", rewriteController.bulkDelete);
adminRouter.get("/writing/rewrite/:id", rewriteController.adminGetLesson);
adminRouter.put("/writing/rewrite/:id", rewriteController.updateLesson);
adminRouter.delete("/writing/rewrite/:id", rewriteController.deleteLesson);

// ── Exam (IELTS) ──────────────────────────────────────
adminRouter.get("/writing/exam", examController.adminListExams);
adminRouter.post("/writing/exam", examController.createExam);
adminRouter.delete("/writing/exam", examController.bulkDelete);
adminRouter.get("/writing/exam/:id", examController.adminGetExam);
adminRouter.put("/writing/exam/:id", examController.updateExam);
adminRouter.delete("/writing/exam/:id", examController.deleteExam);

// ── Vocabulary ────────────────────────────────────────
adminRouter.post("/vocabulary", vocabularyController.createVocabulary);
adminRouter.patch("/vocabulary/:id", vocabularyController.updateVocabulary);
adminRouter.delete("/vocabulary/:id", vocabularyController.deleteVocabulary);

// ── Slang Hang ────────────────────────────────────────
adminRouter.post("/slang-hang/generate", slangHangController.generate);
adminRouter.get(
	"/slang-hang/dialogues",
	slangHangController.adminListDialogues,
);
adminRouter.get(
	"/slang-hang/dialogues/:id",
	slangHangController.adminGetDialogue,
);
adminRouter.post("/slang-hang/dialogues", slangHangController.createDialogue);
adminRouter.put(
	"/slang-hang/dialogues/:id",
	slangHangController.updateDialogue,
);
adminRouter.delete("/slang-hang/dialogues", slangHangController.bulkDelete);
adminRouter.delete("/slang-hang/dialogues/:id", slangHangController.remove);

// ── Stats (dashboard) ─────────────────────────────────
adminRouter.get("/stats/overview", statsController.getOverview);

// ── Upload ────────────────────────────────────────────
adminRouter.post(
	"/upload",
	mediaUpload.single("file"),
	uploadController.uploadMedia,
);

export default adminRouter;
