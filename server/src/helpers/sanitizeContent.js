import sanitizeHtml from "sanitize-html";
import { ApiError } from "@server/helpers/ApiError";
import { DECK_LIMITS } from "@server/const/deck";

const SANITIZE_OPTIONS = {
  allowedTags: [
    "b", "strong", "i", "em", "u", "s",
    "code", "pre", "br", "p",
    "ul", "ol", "li",
    "a", "span",
    "h2", "h3", "h4",
    "mark", "blockquote",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    span: ["class"],
    code: ["class"],
    pre: ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  disallowedTagsMode: "discard",
};

export function sanitizeContent(input) {
  if (input == null) return "";
  const trimmed = String(input).trim();
  const clean = sanitizeHtml(trimmed, SANITIZE_OPTIONS);
  if (clean.length > DECK_LIMITS.CARD_CONTENT_MAX) {
    throw ApiError.badRequest(
      `content max ${DECK_LIMITS.CARD_CONTENT_MAX} chars`,
    );
  }
  return clean;
}
