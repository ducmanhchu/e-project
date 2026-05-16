import { ApiError } from "@server/helpers/ApiError";
import { DECK_LIMITS } from "@server/const/deck";

export function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  const cleaned = tags
    .filter((t) => typeof t === "string")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
  const deduped = Array.from(new Set(cleaned));
  if (deduped.length > DECK_LIMITS.TAG_COUNT_MAX) {
    throw ApiError.badRequest(`Max ${DECK_LIMITS.TAG_COUNT_MAX} tags`);
  }
  for (const t of deduped) {
    if (t.length > DECK_LIMITS.TAG_MAX) {
      throw ApiError.badRequest(`Tag max ${DECK_LIMITS.TAG_MAX} chars`);
    }
  }
  return deduped;
}
