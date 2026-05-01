import multer from "multer";
import { MAX_FILE_SIZE } from "@server/const/upload";
import { SLANG_HANG_LIMITS } from "@server/const/slangHang";

export const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

export const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: SLANG_HANG_LIMITS.MAX_AUDIO_BYTES },
});
