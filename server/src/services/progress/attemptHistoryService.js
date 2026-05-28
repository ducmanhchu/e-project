import { Attempt } from "@server/models/attempt/Attempt";
import { WordChainGame } from "@server/models/wordChain/WordChainGame";
import { DialogueAttempt } from "@server/models/slangHang/DialogueAttempt";
import { ApiError } from "@server/helpers/ApiError";
import { PROGRESS_FEATURE } from "@server/const/progress";
import { resolveLessonTitles } from "@server/services/progress/lessonTitleResolver";

const FEATURE_ALL = "all";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

async function mapWriting(docs) {
  const refs = docs.map((a) => ({
    lessonType: a.lessonType,
    lessonId: a.lessonId,
  }));
  const titleMap = await resolveLessonTitles(refs);
  return docs.map((a) => ({
    id: String(a.lessonId),
    title: titleMap.get(`${a.lessonType}:${a.lessonId}`) ?? null,
    kind: a.lessonType,
    completedAt: a.completedAt,
  }));
}

function mapWordchain(docs) {
  return docs.map((g) => ({
    id: String(g._id),
    title: `Word Chain - ${g.level}`,
    kind: "WordChain",
    completedAt: g.endedAt,
  }));
}

function mapSlang(docs) {
  return docs.map((d) => ({
    id: d.dialogueId ? String(d.dialogueId._id ?? d.dialogueId) : null,
    title: d.dialogueId?.title ?? null,
    kind: "SlangHang",
    completedAt: d.completedAt,
  }));
}

const SOURCES = {
  [PROGRESS_FEATURE.WRITING]: {
    model: Attempt,
    sortKey: "completedAt",
    populate: null,
    mapper: mapWriting,
    filterFor: (userId) => ({ userId, status: "completed" }),
  },
  [PROGRESS_FEATURE.WORDCHAIN]: {
    model: WordChainGame,
    sortKey: "endedAt",
    populate: null,
    mapper: mapWordchain,
    filterFor: (userId) => ({
      userId,
      status: "ended",
      failReason: { $ne: "abandoned" },
    }),
  },
  [PROGRESS_FEATURE.SLANGHANG]: {
    model: DialogueAttempt,
    sortKey: "completedAt",
    populate: { path: "dialogueId", select: "title" },
    mapper: mapSlang,
    filterFor: (userId) => ({ userId, status: "completed" }),
  },
};
const VALID_FEATURES = new Set([FEATURE_ALL, ...Object.keys(SOURCES)]);

async function fetchSource(source, userId, { skip, limit }) {
  const filter = source.filterFor(userId);
  let query = source.model.find(filter).sort({ [source.sortKey]: -1 });
  if (source.populate) query = query.populate(source.populate);
  if (skip) query = query.skip(skip);
  query = query.limit(limit);
  const [docs, total] = await Promise.all([
    query.lean(),
    source.model.countDocuments(filter),
  ]);
  return { docs, total };
}

export async function getAttemptHistory({
  userId,
  feature = FEATURE_ALL,
  page = 1,
  limit = DEFAULT_LIMIT,
}) {
  if (!VALID_FEATURES.has(feature)) {
    throw ApiError.badRequest("Invalid feature");
  }
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(Math.max(1, Number(limit) || DEFAULT_LIMIT), MAX_LIMIT);
  const skip = (p - 1) * l;

  if (feature !== FEATURE_ALL) {
    const source = SOURCES[feature];
    const { docs, total } = await fetchSource(source, userId, { skip, limit: l });
    return { items: await source.mapper(docs), total, page: p, limit: l };
  }

  // "all" — fetch top p*l from each source, merge sorted, slice.
  // By pigeonhole, global top p*l is contained in union of per-source top p*l.
  const sources = Object.values(SOURCES);
  const results = await Promise.all(
    sources.map((s) => fetchSource(s, userId, { limit: p * l })),
  );
  const mappedPerSource = await Promise.all(
    results.map((r, i) => sources[i].mapper(r.docs)),
  );

  const merged = mappedPerSource
    .flat()
    .filter((i) => i.completedAt)
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  const total = results.reduce((sum, r) => sum + r.total, 0);
  const items = merged.slice(skip, skip + l);

  return { items, total, page: p, limit: l };
}
