const ALLOWED_IMAGE_PROTOCOLS = new Set(["https:", "http:", "blob:"]);

/**
 * Chỉ cho phép URL ảnh có scheme an toàn trước khi gán vào `img.src`.
 */
export function sanitizeImageSrc(
	src: string | null | undefined,
): string | null {
	if (!src?.trim()) return null;

	try {
		const parsed = new URL(src.trim(), window.location.origin);
		return ALLOWED_IMAGE_PROTOCOLS.has(parsed.protocol) ? parsed.href : null;
	} catch {
		return null;
	}
}
