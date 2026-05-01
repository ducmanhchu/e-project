import express from "express";
import * as exerciseController from "@server/controllers/exerciseController";
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

export default adminRouter;
