import { ApiError } from "@server/helpers/ApiError";
import { Dialogue } from "@server/models/slangHang/Dialogue";
import { DialogueAttempt } from "@server/models/slangHang/DialogueAttempt";
import { WRITING_TOPIC } from "@server/const/writting";
import { SLANG_HANG_LIMITS, SLANG_HANG_MODE } from "@server/const/slangHang";
import * as slangHangProvider from "@server/services/ai/slangHangProvider";
import * as speechAuthProvider from "@server/services/azure/speechAuthProvider";

function validateTopic(topic) {
  if (!Object.values(WRITING_TOPIC).includes(topic)) {
    throw ApiError.badRequest("Invalid topic");
  }
}

function validateMode(mode) {
  if (mode === undefined) return;
  if (!Object.values(SLANG_HANG_MODE).includes(mode)) {
    throw ApiError.badRequest("Invalid mode");
  }
}

function sanitizeMessages(ai) {
  if (
    !ai ||
    !Array.isArray(ai.messages) ||
    ai.messages.length < SLANG_HANG_LIMITS.MIN_MESSAGES ||
    ai.messages.length > SLANG_HANG_LIMITS.MAX_MESSAGES
  ) {
    throw new ApiError(
      502,
      `Invalid AI response: messages length out of range`,
    );
  }
  if (!Array.isArray(ai.speakers) || ai.speakers.length !== 2) {
    throw new ApiError(502, "Invalid AI response: speakers must be 2");
  }

  const messages = [...ai.messages]
    .sort((a, b) => a.order - b.order)
    .map((m) => ({
      order: m.order,
      speakerKey: m.speakerKey,
      text: typeof m.text === "string" ? m.text.trim() : "",
      slang: Array.isArray(m.slang) ? m.slang : [],
    }));

  if (messages[0].speakerKey !== "A") {
    throw new ApiError(
      502,
      "Invalid AI response: dialogue must start with speaker A",
    );
  }

  return {
    scenario: typeof ai.scenario === "string" ? ai.scenario.trim() : "",
    speakers: ai.speakers.map((s) => ({
      key: s.key,
      name: s.name,
      persona: s.persona,
    })),
    messages,
  };
}

function mapDialogueToResponse(doc) {
  const json = typeof doc.toJSON === "function" ? doc.toJSON() : doc;
  return {
    id: json.id ?? String(json._id),
    topic: json.topic,
    mode: json.mode ?? SLANG_HANG_MODE.SINGLE_ROLE,
    scenario: json.scenario,
    speakers: json.speakers,
    messages: json.messages,
    createdAt: json.createdAt,
  };
}

export async function generateDialogue({ userId, topic, mode }) {
  validateTopic(topic);
  validateMode(mode);
  const ai = await slangHangProvider.generateDialogue({ topic });
  const sanitized = sanitizeMessages(ai);
  const doc = await Dialogue.create({
    userId,
    topic,
    mode: mode || SLANG_HANG_MODE.SINGLE_ROLE,
    ...sanitized,
  });
  return mapDialogueToResponse(doc);
}

function toListItem(doc) {
  return {
    id: String(doc._id),
    topic: doc.topic,
    scenario: doc.scenario,
    messageCount: Array.isArray(doc.messages) ? doc.messages.length : 0,
    createdAt: doc.createdAt,
  };
}

export async function listDialogues({ userId, page = 1, limit = 12 }) {
  const p = Math.max(1, Number(page));
  const l = Math.min(Math.max(1, Number(limit)), 50);
  const skip = (p - 1) * l;

  const [items, total] = await Promise.all([
    Dialogue.find({ userId })
      .select("topic scenario createdAt messages.order")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l)
      .lean(),
    Dialogue.countDocuments({ userId }),
  ]);

  return {
    items: items.map(toListItem),
    total,
    page: p,
    limit: l,
  };
}

export async function getDialogue({ userId, id }) {
  const [doc, attempt] = await Promise.all([
    Dialogue.findById(id).lean(),
    DialogueAttempt.findOne({ userId, dialogueId: id }).lean(),
  ]);
  if (!doc) throw ApiError.notFound("Dialogue not found");
  if (String(doc.userId) !== String(userId)) {
    throw ApiError.forbidden("Forbidden");
  }
  return {
    ...mapDialogueToResponse(doc),
    attempt: attempt ? mapAttemptToResponse(attempt) : null,
  };
}

export async function deleteDialogue({ userId, id }) {
  const result = await Dialogue.findOneAndDelete({ _id: id, userId });
  if (!result) throw ApiError.notFound("Dialogue not found");
}

export async function getAzureSpeechToken() {
  return speechAuthProvider.getSpeechToken();
}

const REQUIRED_SCORE_FIELDS = [
  "accuracy",
  "fluency",
  "completeness",
  "pronunciation",
];

function isScore(v) {
  return typeof v === "number" && v >= 0 && v <= 100;
}

function validateScores(scores) {
  if (!scores || typeof scores !== "object") {
    throw ApiError.badRequest("scores object required");
  }
  for (const f of REQUIRED_SCORE_FIELDS) {
    if (!isScore(scores[f])) {
      throw ApiError.badRequest(`scores.${f} must be a number 0-100`);
    }
  }
  if (scores.prosody !== undefined && !isScore(scores.prosody)) {
    throw ApiError.badRequest("scores.prosody must be a number 0-100");
  }
}

function sanitizeSubScoreList(arr, key) {
  if (!Array.isArray(arr)) return undefined;
  const cleaned = arr
    .filter((s) => s && typeof s[key] === "string")
    .map((s) => ({
      [key]: s[key],
      accuracyScore: isScore(s.accuracyScore) ? s.accuracyScore : undefined,
    }));
  return cleaned.length ? cleaned : undefined;
}

function sanitizeWords(words) {
  if (!Array.isArray(words)) return [];
  return words
    .filter((w) => w && typeof w.word === "string")
    .map((w) => ({
      word: w.word,
      accuracyScore: isScore(w.accuracyScore) ? w.accuracyScore : undefined,
      errorType: typeof w.errorType === "string" ? w.errorType : undefined,
      offset: typeof w.offset === "number" && w.offset >= 0 ? w.offset : undefined,
      duration:
        typeof w.duration === "number" && w.duration >= 0
          ? w.duration
          : undefined,
      syllables: sanitizeSubScoreList(w.syllables, "syllable"),
      phonemes: sanitizeSubScoreList(w.phonemes, "phoneme"),
    }));
}

function buildScores(scores) {
  return {
    accuracy: scores.accuracy,
    fluency: scores.fluency,
    completeness: scores.completeness,
    pronunciation: scores.pronunciation,
    prosody: isScore(scores.prosody) ? scores.prosody : undefined,
  };
}

const SCORE_FIELDS_ALL = [...REQUIRED_SCORE_FIELDS, "prosody"];

function computeOverallScores(utterances) {
  if (!utterances.length) return undefined;
  const result = {};
  for (const f of SCORE_FIELDS_ALL) {
    const vals = utterances
      .map((u) => u.scores?.[f])
      .filter((v) => typeof v === "number");
    if (vals.length) {
      result[f] = vals.reduce((a, b) => a + b, 0) / vals.length;
    }
  }
  return result;
}

function mapAttemptToResponse(doc) {
  return {
    id: String(doc._id),
    dialogueId: String(doc.dialogueId),
    status: doc.status,
    completedMessages: doc.completedMessages,
    overallScores: doc.overallScores,
    utterances: doc.utterances,
    completedAt: doc.completedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function recordUtterance({
  userId,
  dialogueId,
  messageOrder,
  targetText,
  scores,
  words = [],
}) {
  if (!dialogueId) throw ApiError.badRequest("dialogueId required");
  if (typeof messageOrder !== "number" || messageOrder < 0) {
    throw ApiError.badRequest("messageOrder must be a non-negative number");
  }
  if (typeof targetText !== "string" || targetText.trim() === "") {
    throw ApiError.badRequest("targetText required");
  }
  validateScores(scores);

  const dlg = await Dialogue.findById(dialogueId)
    .select("userId mode messages.order messages.speakerKey")
    .lean();
  if (!dlg) throw ApiError.notFound("Dialogue not found");
  if (String(dlg.userId) !== String(userId)) {
    throw ApiError.forbidden("Forbidden");
  }
  const totalMessages = Array.isArray(dlg.messages) ? dlg.messages.length : 0;
  if (messageOrder >= totalMessages) {
    throw ApiError.badRequest("messageOrder out of range");
  }

  const mode = dlg.mode || SLANG_HANG_MODE.SINGLE_ROLE;
  const targetMsg = dlg.messages[messageOrder];
  if (mode === SLANG_HANG_MODE.SINGLE_ROLE && targetMsg?.speakerKey !== "B") {
    throw ApiError.badRequest(
      "In single_role mode only speaker B's messages can be recorded (A is played by TTS)",
    );
  }

  const totalLearnerMessages =
    mode === SLANG_HANG_MODE.SINGLE_ROLE
      ? dlg.messages.filter((m) => m.speakerKey === "B").length
      : totalMessages;

  const newUtterance = {
    messageOrder,
    targetText: targetText.trim(),
    scores: buildScores(scores),
    words: sanitizeWords(words),
    attemptedAt: new Date(),
  };

  let attempt = await DialogueAttempt.findOne({ userId, dialogueId });
  if (!attempt) {
    attempt = new DialogueAttempt({
      userId,
      dialogueId,
      utterances: [newUtterance],
    });
  } else {
    const idx = attempt.utterances.findIndex(
      (u) => u.messageOrder === messageOrder,
    );
    if (idx >= 0) {
      attempt.utterances.set(idx, newUtterance);
    } else {
      attempt.utterances.push(newUtterance);
    }
  }

  attempt.completedMessages = attempt.utterances.length;
  attempt.overallScores = computeOverallScores(attempt.utterances);
  if (attempt.completedMessages >= totalLearnerMessages) {
    attempt.status = "completed";
    attempt.completedAt = attempt.completedAt ?? new Date();
  } else {
    attempt.status = "in_progress";
    attempt.completedAt = undefined;
  }

  await attempt.save();
  return mapAttemptToResponse(attempt);
}
