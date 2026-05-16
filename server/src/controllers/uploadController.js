import cloudinary from "@server/config/cloudinary";
import { ApiError } from "@server/helpers/ApiError";

/**
 * POST /api/me/upload/image — user-facing image upload (flashcards)
 * Accepts only image/* mimetypes. Folder: english_platform/flashcards.
 */
export async function uploadImage(req, res, next) {
  try {
    if (!req.file) throw ApiError.badRequest("No file provided");
    if (!req.file.mimetype.startsWith("image/")) {
      throw ApiError.badRequest("Only image files allowed");
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "english_platform/flashcards",
          resource_type: "image",
        },
        (error, result) => (error ? reject(error) : resolve(result)),
      );
      stream.end(req.file.buffer);
    });

    res.json({
      success: true,
      data: { url: result.secure_url, publicId: result.public_id },
    });
  } catch (e) { next(e); }
}

/**
 * POST /api/upload — [ADMIN]
 * Upload file to Cloudinary (image or video)
 */
export async function uploadMedia(req, res, next) {
  try {
    if (!req.file) throw ApiError.badRequest("No file provided");

    const isVideo = req.file.mimetype.startsWith("video/");
    const resourceType = isVideo ? "video" : "image";

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "english_platform/see_write",
          resource_type: resourceType,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      stream.end(req.file.buffer);
    });

    res.json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        resourceType,
      },
    });
  } catch (e) {
    next(e);
  }
}
