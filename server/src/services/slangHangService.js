import { ApiError } from "@server/helpers/ApiError";
import { Dialogue } from "@server/models/slangHang/Dialogue";
import { DialogueAttempt } from "@server/models/slangHang/DialogueAttempt";
import { WRITING_TOPIC } from "@server/const/writting";
import {
  SLANG_HANG_LIMITS,
  SLANG_HANG_MODE,
  SLANG_HANG_LEVEL,
} from "@server/const/slangHang";
import * as slangHangProvider from "@server/services/ai/slangHangProvider";
import * as speechAuthProvider from "@server/services/azure/speechAuthProvider";
import { buildTitleSearch } from "@server/helpers/writing/listLessonsQuery";
import { chargeForSubmit } from "@server/helpers/chargeForSubmit";

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

function validateLevel(level) {
  if (!Object.values(SLANG_HANG_LEVEL).includes(level)) {
    throw ApiError.badRequest("Invalid level");
  }
}

function validateTitle(title) {
  if (typeof title !== "string" || title.trim() === "") {
    throw ApiError.badRequest("title is required");
  }
  if (title.trim().length > 200) {
    throw ApiError.badRequest("title must be ≤ 200 characters");
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
    title: json.title,
    level: json.level,
    topic: json.topic,
    mode: json.mode ?? SLANG_HANG_MODE.SINGLE_ROLE,
    scenario: json.scenario,
    speakers: json.speakers,
    messages: json.messages,
    createdAt: json.createdAt,
  };
}

export async function generateDialogue({ title, level, topic, mode }) {
  validateTitle(title);
  validateLevel(level);
  validateTopic(topic);
  validateMode(mode);
  const ai = await slangHangProvider.generateDialogue({ topic, level });
  const sanitized = sanitizeMessages(ai);
  const doc = await Dialogue.create({
    title: title.trim(),
    level,
    topic,
    mode: mode || SLANG_HANG_MODE.SINGLE_ROLE,
    ...sanitized,
  });
  return mapDialogueToResponse(doc);
}

function toListItem(doc) {
  return {
    id: String(doc._id),
    title: doc.title,
    level: doc.level,
    topic: doc.topic,
    scenario: doc.scenario,
    messageCount: Array.isArray(doc.messages) ? doc.messages.length : 0,
    createdAt: doc.createdAt,
  };
}

export async function listDialogues({
  userId,
  level,
  topic,
  search,
  page = 1,
  limit = 12,
}) {
  const p = Math.max(1, Number(page));
  const l = Math.min(Math.max(1, Number(limit)), 50);
  const skip = (p - 1) * l;

  const query = {};
  if (Array.isArray(level) && level.length) query.level = { $in: level };
  if (Array.isArray(topic) && topic.length) query.topic = { $in: topic };
  const titleFilter = buildTitleSearch(search);
  if (titleFilter) query.title = titleFilter;

  const [dialogues, total] = await Promise.all([
    Dialogue.find(query)
      .select("title level topic scenario createdAt messages.order")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l)
      .lean(),
    Dialogue.countDocuments(query),
  ]);

  const attempts = await DialogueAttempt.find({
    userId,
    dialogueId: { $in: dialogues.map((d) => d._id) },
  })
    .select("dialogueId status")
    .lean();

  const statusByDialogueId = new Map(
    attempts.map((a) => [String(a.dialogueId), a.status]),
  );

  return {
    items: dialogues.map((d) => ({
      ...toListItem(d),
      status: statusByDialogueId.get(String(d._id)) ?? "not_started",
    })),
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
  return {
    ...mapDialogueToResponse(doc),
    ...flattenAttempt(attempt),
  };
}

export async function deleteDialogue({ id }) {
  const result = await Dialogue.findByIdAndDelete(id);
  if (!result) throw ApiError.notFound("Dialogue not found");
}

export async function retry({ userId, dialogueId }) {
  // Retry only deletes the existing attempt (no AI call) → free of charge.
  await DialogueAttempt.deleteOne({ userId, dialogueId });
}

export async function getAzureSpeechToken() {
  return speechAuthProvider.getSpeechToken();
}

function flattenAttempt(attempt) {
  if (!attempt) {
    return {
      status: "not_started",
      messageAttempts: [],
      completedAt: null,
    };
  }
  return {
    status: attempt.status,
    messageAttempts: attempt.messageAttempts,
    completedAt: attempt.completedAt ?? null,
  };
}

async function buildAndSaveAttempt({
  userId,
  dialogueId,
  newAttempt,
  totalLearnerMessages,
}) {
  let attempt = await DialogueAttempt.findOne({ userId, dialogueId });
  if (!attempt) {
    attempt = new DialogueAttempt({
      userId,
      dialogueId,
      messageAttempts: [newAttempt],
    });
  } else {
    const idx = attempt.messageAttempts.findIndex(
      (m) => m.messageOrder === newAttempt.messageOrder,
    );
    if (idx >= 0) {
      attempt.messageAttempts.set(idx, newAttempt);
    } else {
      attempt.messageAttempts.push(newAttempt);
    }
  }

  attempt.completedMessages = attempt.messageAttempts.length;
  if (attempt.completedMessages >= totalLearnerMessages) {
    attempt.status = "completed";
    attempt.completedAt = attempt.completedAt ?? new Date();
  } else {
    attempt.status = "in_progress";
    attempt.completedAt = undefined;
  }

  await attempt.save();
  return attempt;
}

const MAX_SAVE_RETRIES = 3;

export async function recordMessageAttempt({
  userId,
  dialogueId,
  messageOrder,
  targetText,
  feedback,
}) {
  if (!dialogueId) throw ApiError.badRequest("dialogueId required");
  if (typeof messageOrder !== "number" || messageOrder < 0) {
    throw ApiError.badRequest("messageOrder must be a non-negative number");
  }
  if (typeof targetText !== "string" || targetText.trim() === "") {
    throw ApiError.badRequest("targetText required");
  }

  const dlg = await Dialogue.findById(dialogueId)
    .select("mode messages.order messages.speakerKey")
    .lean();
  if (!dlg) throw ApiError.notFound("Dialogue not found");
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

  const newAttempt = {
    messageOrder,
    targetText: targetText.trim(),
    feedback,
    attemptedAt: new Date(),
  };

  return chargeForSubmit(
    {
      userId,
      reason: `submit slang_hang ${dialogueId}/${messageOrder}`,
      referenceType: "DialogueAttempt",
      referenceId: dialogueId,
    },
    () => recordWithRetry(userId, dialogueId, newAttempt, totalLearnerMessages),
  );
}

async function recordWithRetry(userId, dialogueId, newAttempt, totalLearnerMessages) {
  for (let i = 0; i < MAX_SAVE_RETRIES; i++) {
    try {
      const saved = await buildAndSaveAttempt({
        userId,
        dialogueId,
        newAttempt,
        totalLearnerMessages,
      });
      return flattenAttempt(saved);
    } catch (err) {
      const isVersionConflict =
        err?.name === "VersionError" || err?.code === 11000;
      if (isVersionConflict && i < MAX_SAVE_RETRIES - 1) continue;
      throw err;
    }
  }
}
