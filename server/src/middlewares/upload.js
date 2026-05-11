import multer from "multer";
import { MAX_FILE_SIZE } from "@server/const/upload";

export const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});
