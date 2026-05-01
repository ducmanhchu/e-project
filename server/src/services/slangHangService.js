import { ApiError } from "@server/helpers/ApiError";
import { Dialogue } from "@server/models/slangHang/Dialogue";
import { WRITING_TOPIC } from "@server/const/writting";
import { SLANG_HANG_LIMITS } from "@server/const/slangHang";
import * as slangHangProvider from "@server/services/ai/slangHangProvider";

function validateTopic(topic) {
  if (!Object.values(WRITING_TOPIC).includes(topic)) {
    throw ApiError.badRequest("Invalid topic");
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
    scenario: json.scenario,
    speakers: json.speakers,
    messages: json.messages,
    createdAt: json.createdAt,
  };
}

export async function generateDialogue({ userId, topic }) {
  validateTopic(topic);
  const ai = await slangHangProvider.generateDialogue({ topic });
  const sanitized = sanitizeMessages(ai);
  const doc = await Dialogue.create({ userId, topic, ...sanitized });
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
  const doc = await Dialogue.findById(id).lean();
  if (!doc) throw ApiError.notFound("Dialogue not found");
  if (String(doc.userId) !== String(userId)) {
    throw ApiError.forbidden("Forbidden");
  }
  return mapDialogueToResponse(doc);
}

export async function deleteDialogue({ userId, id }) {
  const result = await Dialogue.findOneAndDelete({ _id: id, userId });
  if (!result) throw ApiError.notFound("Dialogue not found");
}

function validateAudio(buffer, mimeType) {
  if (!buffer || buffer.length === 0) {
    throw ApiError.badRequest("Audio file required");
  }
  if (buffer.length > SLANG_HANG_LIMITS.MAX_AUDIO_BYTES) {
    throw ApiError.badRequest(
      `Audio file too large (max ${SLANG_HANG_LIMITS.MAX_AUDIO_BYTES} bytes)`,
    );
  }
  if (!SLANG_HANG_LIMITS.ALLOWED_AUDIO_MIME.includes(mimeType)) {
    throw ApiError.badRequest("Unsupported audio format");
  }
}

export async function gradePronunciation({
  audioBuffer,
  mimeType,
  targetText,
  slangContext = "",
}) {
  if (typeof targetText !== "string" || targetText.trim() === "") {
    throw ApiError.badRequest("Target text required");
  }
  validateAudio(audioBuffer, mimeType);

  return slangHangProvider.gradePronunciation({
    audioBuffer,
    mimeType,
    targetText,
    slangContext,
  });
}
