import { ApiError } from "@server/helpers/ApiError";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

/**
 * Parse comma-separated ObjectId list from query string.
 * Throws 400 on missing, empty, or invalid id format.
 */
export function parseIdList(raw) {
  if (!raw) throw ApiError.badRequest("ids query param is required");
  const list = String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) {
    throw ApiError.badRequest("ids must be a non-empty list");
  }
  for (const id of list) {
    if (!OBJECT_ID_RE.test(id)) {
      throw ApiError.badRequest(`Invalid id: ${id}`);
    }
  }
  return list;
}
