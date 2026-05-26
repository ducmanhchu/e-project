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
import {
	buildTitleSearch,
	buildLessonsListPromise,
	resolveSort,
} from "@server/helpers/writing/listLessonsQuery";
import { chargeForSubmit } from "@server/helpers/chargeForSubmit";

/** Projection dùng khi admin list có sort (aggregate hoặc find). */
const DIALOGUE_LIST_PROJECTION = Object.freeze({
	title: 1,
	level: 1,
	topic: 1,
	scenario: 1,
	createdAt: 1,
	messages: 1,
});

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

/**
 * Chuẩn hóa một mục slang; term và meaning bắt buộc.
 * @param {object} item
 * @param {number} messageIndex
 * @param {number} slangIndex
 */
function normalizeSlangItem(item, messageIndex, slangIndex) {
	if (!item || typeof item !== "object") {
		throw ApiError.badRequest(
			`message ${messageIndex} slang[${slangIndex}]: invalid item`,
		);
	}
	const term = typeof item.term === "string" ? item.term.trim() : "";
	const meaning = typeof item.meaning === "string" ? item.meaning.trim() : "";
	if (!term) {
		throw ApiError.badRequest(
			`message ${messageIndex} slang[${slangIndex}]: term is required`,
		);
	}
	if (!meaning) {
		throw ApiError.badRequest(
			`message ${messageIndex} slang[${slangIndex}]: meaning is required`,
		);
	}
	return {
		term,
		meaning,
		partOfSpeech:
			typeof item.partOfSpeech === "string" ? item.partOfSpeech.trim() : "",
		example: typeof item.example === "string" ? item.example.trim() : "",
		register: typeof item.register === "string" ? item.register.trim() : "",
	};
}

/**
 * @param {object} m
 * @param {number} index
 */
function normalizeMessage(m, index) {
	const expectedKey = index % 2 === 0 ? "A" : "B";
	if (m.speakerKey !== expectedKey) {
		throw ApiError.badRequest(
			`message at order ${index} must have speakerKey "${expectedKey}"`,
		);
	}
	const text = typeof m.text === "string" ? m.text.trim() : "";
	if (!text) {
		throw ApiError.badRequest(`message at order ${index}: text is required`);
	}
	if (text.length > SLANG_HANG_LIMITS.MAX_MESSAGE_LENGTH) {
		throw ApiError.badRequest(
			`message at order ${index}: text must be ≤ ${SLANG_HANG_LIMITS.MAX_MESSAGE_LENGTH} characters`,
		);
	}
	const rawSlang = Array.isArray(m.slang) ? m.slang : [];
	if (rawSlang.length > SLANG_HANG_LIMITS.MAX_SLANG_PER_MESSAGE) {
		throw ApiError.badRequest(
			`message at order ${index}: slang per message must be ≤ ${SLANG_HANG_LIMITS.MAX_SLANG_PER_MESSAGE}`,
		);
	}
	const slang = rawSlang.map((item, slangIndex) =>
		normalizeSlangItem(item, index, slangIndex),
	);
	return { order: index, speakerKey: expectedKey, text, slang };
}

/**
 * @param {unknown} messages
 */
function normalizeMessagesArray(messages) {
	if (!Array.isArray(messages)) {
		throw ApiError.badRequest("messages must be an array");
	}
	const { MIN_MESSAGES, MAX_MESSAGES } = SLANG_HANG_LIMITS;
	if (messages.length < MIN_MESSAGES || messages.length > MAX_MESSAGES) {
		throw ApiError.badRequest(
			`messages must be between ${MIN_MESSAGES} and ${MAX_MESSAGES}`,
		);
	}
	if (messages.length % 2 !== 0) {
		throw ApiError.badRequest("messages count must be even");
	}

	const sorted = [...messages].sort(
		(a, b) => (Number(a.order) || 0) - (Number(b.order) || 0),
	);
	return sorted.map((m, index) => normalizeMessage(m, index));
}

/**
 * @param {unknown} speakers
 */
function normalizeSpeakers(speakers) {
	if (!Array.isArray(speakers) || speakers.length !== 2) {
		throw ApiError.badRequest("speakers must contain exactly 2 entries");
	}
	const keys = speakers.map((s) => s?.key);
	if (!keys.includes("A") || !keys.includes("B") || keys[0] === keys[1]) {
		throw ApiError.badRequest("speakers must have keys A and B");
	}
	return speakers.map((s) => {
		if (!s || !["A", "B"].includes(s.key)) {
			throw ApiError.badRequest('each speaker key must be "A" or "B"');
		}
		const name = typeof s.name === "string" ? s.name.trim() : "";
		if (!name) {
			throw ApiError.badRequest(`speaker ${s.key}: name is required`);
		}
		return {
			key: s.key,
			name,
			persona: typeof s.persona === "string" ? s.persona.trim() : "",
		};
	});
}

/**
 * @param {unknown} scenario
 */
function normalizeScenario(scenario) {
	const value = typeof scenario === "string" ? scenario.trim() : "";
	if (!value) throw ApiError.badRequest("scenario is required");
	return value;
}

/**
 * @param {{ scenario: unknown, speakers: unknown, messages: unknown }} input
 */
function normalizeDialogueContent({ scenario, speakers, messages }) {
	return {
		scenario: normalizeScenario(scenario),
		speakers: normalizeSpeakers(speakers),
		messages: normalizeMessagesArray(messages),
	};
}

function sanitizeMessages(ai) {
	if (!ai || typeof ai !== "object") {
		throw new ApiError(502, "Invalid AI response: empty payload");
	}
	if (!Array.isArray(ai.messages) || !Array.isArray(ai.speakers)) {
		throw new ApiError(
			502,
			"Invalid AI response: missing messages or speakers",
		);
	}
	try {
		return normalizeDialogueContent({
			scenario: ai.scenario,
			speakers: ai.speakers,
			messages: ai.messages,
		});
	} catch (err) {
		if (err instanceof ApiError && err.statusCode === 400) {
			throw new ApiError(502, `Invalid AI response: ${err.message}`);
		}
		throw err;
	}
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

/**
 * POST /admin/slang-hang/dialogues — Tạo dialogue thủ công
 * @param {object} body
 */
export async function createDialogue(body) {
	validateTitle(body.title);
	validateLevel(body.level);
	validateTopic(body.topic);
	validateMode(body.mode);

	const normalized = normalizeDialogueContent({
		scenario: body.scenario,
		speakers: body.speakers,
		messages: body.messages,
	});

	const doc = await Dialogue.create({
		title: body.title.trim(),
		level: body.level,
		topic: body.topic,
		mode: body.mode || SLANG_HANG_MODE.SINGLE_ROLE,
		...normalized,
	});
	return mapDialogueToResponse(doc);
}

const DIALOGUE_UPDATE_FIELDS = [
	"title",
	"level",
	"topic",
	"mode",
	"scenario",
	"speakers",
	"messages",
];

/**
 * PUT /admin/slang-hang/dialogues/:id — Cập nhật một phần
 * @param {string} id
 * @param {object} body
 */
export async function updateDialogue(id, body) {
	const updates = {};

	if (body.title !== undefined) {
		validateTitle(body.title);
		updates.title = body.title.trim();
	}
	if (body.level !== undefined) {
		validateLevel(body.level);
		updates.level = body.level;
	}
	if (body.topic !== undefined) {
		validateTopic(body.topic);
		updates.topic = body.topic;
	}
	if (body.mode !== undefined) {
		validateMode(body.mode);
		updates.mode = body.mode;
	}
	if (body.scenario !== undefined) {
		updates.scenario = normalizeScenario(body.scenario);
	}
	if (body.speakers !== undefined) {
		updates.speakers = normalizeSpeakers(body.speakers);
	}
	if (body.messages !== undefined) {
		updates.messages = normalizeMessagesArray(body.messages);
	}

	const hasAllowedField = DIALOGUE_UPDATE_FIELDS.some(
		(field) => body[field] !== undefined,
	);
	if (!hasAllowedField) {
		throw ApiError.badRequest("No valid fields to update");
	}
	if (Object.keys(updates).length === 0) {
		throw ApiError.badRequest("No valid fields to update");
	}

	const updated = await Dialogue.findByIdAndUpdate(
		id,
		{ $set: updates },
		{ new: true, runValidators: true },
	);
	if (!updated) throw ApiError.notFound("Dialogue not found");
	return mapDialogueToResponse(updated);
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

/**
 * Truy vấn dialogue có phân trang (dùng chung user list và admin list).
 * Khi có `sortBy`, dùng sort tùy chỉnh (level rank hoặc createdAt); không thì mặc định createdAt giảm dần.
 * @param {object} opts
 * @param {string} [opts.sortBy] — "level" | "createdAt" (chỉ admin truyền)
 * @param {1|-1} [opts.order] — 1 = asc, -1 = desc
 */
async function queryDialoguesPaginated({
	level,
	topic,
	search,
	page = 1,
	limit = 12,
	sortBy,
	order,
}) {
	const p = Math.max(1, Number(page));
	const l = Math.min(Math.max(1, Number(limit)), 50);
	const skip = (p - 1) * l;

	const query = {};
	if (Array.isArray(level) && level.length) query.level = { $in: level };
	if (Array.isArray(topic) && topic.length) query.topic = { $in: topic };
	const titleFilter = buildTitleSearch(search);
	if (titleFilter) query.title = titleFilter;

	const dialoguesPromise =
		sortBy !== undefined
			? buildLessonsListPromise(Dialogue, {
					query,
					projection: DIALOGUE_LIST_PROJECTION,
					sortBy,
					order,
					page: p,
					limit: l,
				})
			: Dialogue.find(query)
					.select("title level topic scenario createdAt messages.order")
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(l)
					.lean();

	const [dialogues, total] = await Promise.all([
		dialoguesPromise,
		Dialogue.countDocuments(query),
	]);

	return { dialogues, total, page: p, limit: l };
}

/**
 * GET /admin/slang-hang/dialogues — Danh sách dialogue (không có progress user)
 * @param {object} filters
 * @param {string} [filters.sortBy] — "level" | "createdAt" (mặc định "level")
 * @param {string} [filters.order] — "asc" | "desc" (mặc định "asc")
 */
export async function adminListDialogues({
	level,
	topic,
	search,
	page = 1,
	limit = 12,
	sortBy,
	order,
}) {
	const { sortBy: resolvedSortBy, order: resolvedOrder } = resolveSort({
		sortBy,
		order,
	});
	const {
		dialogues,
		total,
		page: p,
		limit: l,
	} = await queryDialoguesPaginated({
		level,
		topic,
		search,
		page,
		limit,
		sortBy: resolvedSortBy,
		order: resolvedOrder,
	});

	return {
		items: dialogues.map(toListItem),
		total,
		page: p,
		limit: l,
	};
}

/**
 * GET /admin/slang-hang/dialogues/:id — Chi tiết dialogue (không có attempt user)
 * @param {string} id
 */
export async function adminGetDialogue(id) {
	const doc = await Dialogue.findById(id).lean();
	if (!doc) throw ApiError.notFound("Dialogue not found");
	return mapDialogueToResponse(doc);
}

export async function listDialogues({
	userId,
	level,
	topic,
	search,
	page = 1,
	limit = 12,
}) {
	const {
		dialogues,
		total,
		page: p,
		limit: l,
	} = await queryDialoguesPaginated({
		level,
		topic,
		search,
		page,
		limit,
	});

	const statusByDialogueId = new Map();
	if (userId && dialogues.length > 0) {
		const attempts = await DialogueAttempt.find({
			userId,
			dialogueId: { $in: dialogues.map((d) => d._id) },
		})
			.select("dialogueId status")
			.lean();
		for (const a of attempts) {
			statusByDialogueId.set(String(a.dialogueId), a.status);
		}
	}

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

/**
 * DELETE /admin/slang-hang/dialogues?ids=a,b,c — Bulk delete + cascade attempts
 */
export async function bulkDeleteDialogues(ids) {
	const docs = await Dialogue.find({ _id: { $in: ids } })
		.select("_id")
		.lean();
	if (docs.length === 0) return { deleted: 0 };

	const docIds = docs.map((d) => d._id);
	await Promise.all([
		Dialogue.deleteMany({ _id: { $in: docIds } }),
		DialogueAttempt.deleteMany({ dialogueId: { $in: docIds } }),
	]);

	return { deleted: docs.length };
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

async function recordWithRetry(
	userId,
	dialogueId,
	newAttempt,
	totalLearnerMessages,
) {
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
