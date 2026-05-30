import { Attempt } from "@server/models/attempt/Attempt";
import { WordChainGame } from "@server/models/wordChain/WordChainGame";
import { DialogueAttempt } from "@server/models/slangHang/DialogueAttempt";
import { ApiError } from "@server/helpers/ApiError";
import { PROGRESS_FEATURE } from "@server/const/progress";
import { resolveLessonTitles } from "@server/services/progress/lessonTitleResolver";

const FEATURE_ALL = "all";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const WRITING_LESSON_TYPES = new Set([
  "ReverseTranslation",
  "SeeWrite",
  "Rewrite",
  "Exam",
]);

function round1(n) {
  return Math.round(n * 10) / 10;
}

function attemptAvgScore(attempt) {
  const sp = attempt.sentenceProgress;
  if (!sp?.length) return 0;
  const sum = sp.reduce((a, s) => a + (s.bestScore || 0), 0);
  return round1(sum / sp.length);
}

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
    score: attemptAvgScore(a),
    completedAt: a.completedAt,
  }));
}

function mapWordchain(docs) {
  return docs.map((g) => ({
    id: String(g._id),
    title: `Word Chain - ${g.level}`,
    kind: "WordChain",
    score: null,
    completedAt: g.endedAt,
  }));
}

function mapSlang(docs) {
  return docs.map((d) => ({
    id: d.dialogueId ? String(d.dialogueId._id ?? d.dialogueId) : null,
    title: d.dialogueId?.title ?? null,
    kind: "SlangHang",
    score: null,
    completedAt: d.completedAt,
  }));
}

const SOURCES = {
  [PROGRESS_FEATURE.WRITING]: {
    model: Attempt,
    sortKey: "completedAt",
    populate: null,
    mapper: mapWriting,
    filterFor: (userId, opts) => ({
      userId,
      status: "completed",
      ...(opts?.lessonType && { lessonType: opts.lessonType }),
    }),
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

async function fetchSource(source, userId, { skip, limit, filterOpts }) {
  const filter = source.filterFor(userId, filterOpts);
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
  lessonType,
  page = 1,
  limit = DEFAULT_LIMIT,
}) {
  if (!VALID_FEATURES.has(feature)) {
    throw ApiError.badRequest("Invalid feature");
  }
  if (lessonType) {
    if (feature !== PROGRESS_FEATURE.WRITING) {
      throw ApiError.badRequest("lessonType requires feature=writing");
    }
    if (!WRITING_LESSON_TYPES.has(lessonType)) {
      throw ApiError.badRequest("Invalid lessonType");
    }
  }
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(Math.max(1, Number(limit) || DEFAULT_LIMIT), MAX_LIMIT);
  const skip = (p - 1) * l;

  if (feature !== FEATURE_ALL) {
    const source = SOURCES[feature];
    const { docs, total } = await fetchSource(source, userId, {
      skip,
      limit: l,
      filterOpts: { lessonType },
    });
    return { items: await source.mapper(docs), total };
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

  return { items, total };
}
