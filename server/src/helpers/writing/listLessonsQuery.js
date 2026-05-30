import {
  SORTABLE_LESSON_FIELDS,
  LEVEL_RANK_BRANCHES,
} from "@server/const/writting";

/**
 * Escape user input so it can be used safely in a MongoDB $regex.
 * Prevents both regex breakage and ReDoS via special chars.
 */
export function escapeRegex(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Normalize a query param into a string array.
 * Accepts comma-separated string ("a,b,c") or repeated param (Express parses to array).
 * Returns undefined when input is empty so callers can spread-conditionally into queries.
 */
export function parseQueryList(raw) {
  if (!raw) return undefined;
  const arr = Array.isArray(raw) ? raw : String(raw).split(",");
  const cleaned = arr.map((v) => String(v).trim()).filter(Boolean);
  return cleaned.length ? cleaned : undefined;
}

export function resolveSort(filters = {}) {
  const sortBy = SORTABLE_LESSON_FIELDS.has(filters.sortBy)
    ? filters.sortBy
    : "level";
  const order = String(filters.order).toLowerCase() === "desc" ? -1 : 1;
  return { sortBy, order };
}

/**
 * Build a case-insensitive title regex filter from raw search input.
 * Trims whitespace; returns undefined if input is empty/whitespace-only
 * so caller can spread-conditionally.
 */
export function buildTitleSearch(raw) {
  const trimmed = raw == null ? "" : String(raw).trim();
  if (!trimmed) return undefined;
  return { $regex: escapeRegex(trimmed), $options: "i" };
}

/**
 * Build a Promise resolving to lesson list, switching between find()/aggregate() based on sortBy.
 * - sortBy=level uses aggregate with custom level rank (beginner < intermediate < advanced)
 *   tiebreaks by createdAt desc.
 * - other sort fields use plain find().sort().
 *
 * @param {Model} Model        Mongoose model
 * @param {Object} opts
 * @param {Object} opts.query        MongoDB filter
 * @param {Object} opts.projection   Mongo projection (used for both aggregate $project and find().select())
 * @param {string} opts.sortBy
 * @param {1|-1}   opts.order
 * @param {number} opts.page
 * @param {number} opts.limit
 */
export function buildLessonsListPromise(
  Model,
  { query, projection, sortBy, order, page, limit },
) {
  if (sortBy === "level") {
    return Model.aggregate([
      { $match: query },
      {
        $addFields: {
          _levelRank: {
            $switch: { branches: LEVEL_RANK_BRANCHES, default: 99 },
          },
        },
      },
      { $sort: { _levelRank: order, createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { $project: projection },
    ]);
  }
  return Model.find(query)
    .select(Object.keys(projection).join(" "))
    .sort({ [sortBy]: order })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
}
