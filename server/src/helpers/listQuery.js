import { escapeRegex } from "@server/helpers/writing/listLessonsQuery";

export function resolveSort(allowedFields, rawSortBy, rawOrder, defaultField = "createdAt") {
  const sortBy = allowedFields.has(rawSortBy) ? rawSortBy : defaultField;
  const sortDir = String(rawOrder).toLowerCase() === "asc" ? 1 : -1;
  return { [sortBy]: sortDir };
}

export function buildTextSearch(raw, field) {
  if (!raw || !String(raw).trim()) return {};
  return { [field]: { $regex: escapeRegex(String(raw).trim()), $options: "i" } };
}

export function buildMultiFieldSearch(raw, fields) {
  if (!raw || !String(raw).trim()) return {};
  const escaped = escapeRegex(String(raw).trim());
  return { $or: fields.map((f) => ({ [f]: { $regex: escaped, $options: "i" } })) };
}
