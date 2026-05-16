import cloudinary from "@server/config/cloudinary";

/**
 * Destroy a Cloudinary asset by publicId. Swallows errors (logs them) so callers
 * never fail because cleanup couldn't complete.
 */
export async function destroyCloudinaryImage(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error(`[imageFields] cloudinary destroy failed for ${publicId}:`, err.message);
  }
}

/**
 * Normalize image input into 2 flat fields: { [imageFieldName], imagePublicId }.
 * Returns partial object to spread into doc / update; empty when nothing to apply.
 *
 * @param imageInput          string URL | { url, publicId } | null | undefined
 * @param imagePublicIdInput  string publicId | null | undefined
 * @param imageFieldName      tên field URL trên schema (default 'image'; Exam dùng 'imageUrl')
 */
export function normalizeImageFields(
  imageInput,
  imagePublicIdInput,
  imageFieldName = "image",
) {
  if (imageInput === undefined && imagePublicIdInput === undefined) return {};

  if (imageInput === null || imageInput === "") {
    return { [imageFieldName]: null, imagePublicId: null };
  }

  if (typeof imageInput === "string") {
    const url = imageInput.trim();
    return {
      [imageFieldName]: url || null,
      imagePublicId:
        imagePublicIdInput !== undefined ? imagePublicIdInput || null : null,
    };
  }

  if (typeof imageInput === "object" && imageInput.url) {
    return {
      [imageFieldName]: imageInput.url,
      imagePublicId: imageInput.publicId || null,
    };
  }

  if (imageInput === undefined) {
    return { imagePublicId: imagePublicIdInput || null };
  }

  return {};
}
