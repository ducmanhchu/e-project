import { Type, genai } from "@server/services/ai/client";
import { ApiError } from "@server/helpers/ApiError";
import { SLANG_HANG_LIMITS, SLANG_HANG_RETRY } from "@server/const/slangHang";

const MODEL = "gemini-2.5-flash";

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractStatusCode(err) {
	return err?.status ?? err?.statusCode ?? err?.response?.status ?? null;
}

async function withRetry(fn, label) {
	let lastErr;
	for (let attempt = 0; attempt < SLANG_HANG_RETRY.MAX_ATTEMPTS; attempt++) {
		try {
			return await fn();
		} catch (err) {
			lastErr = err;
			// ApiErrors thrown from inside fn() (e.g. parse failures) propagate immediately
			if (err instanceof ApiError) throw err;
			const code = extractStatusCode(err);
			const retryable = SLANG_HANG_RETRY.RETRYABLE_CODES.includes(code);
			if (!retryable || attempt === SLANG_HANG_RETRY.MAX_ATTEMPTS - 1) break;
			const delay = Math.min(
				SLANG_HANG_RETRY.MAX_DELAY_MS,
				SLANG_HANG_RETRY.INITIAL_DELAY_MS * 2 ** attempt,
			);
			console.warn(
				`[slang-hang] ${label} failed (code=${code}), retrying in ${delay}ms`,
			);
			await sleep(delay);
		}
	}
	console.error(
		`[slang-hang] ${label} failed after retries:`,
		lastErr?.message,
	);
	throw new ApiError(503, `${label}: AI service unavailable, please try again`);
}

const GENERATE_SYSTEM = `You are a native English speaker and screenwriter who creates short, realistic dialogues showing how natural speakers use slang and colloquial expressions in everyday situations.

Rules:
- Generate ${SLANG_HANG_LIMITS.MIN_MESSAGES}-${SLANG_HANG_LIMITS.MAX_MESSAGES} messages alternating between exactly 2 speakers (A and B).
- Speaker A MUST send the first message (order 0); the conversation always starts with A.
- Speaker A is the conversation opener (TTS-played in the app). Speaker B responds — make B's lines natural, pronounceable responses that flow from A's setup.
- Speakers are distinct people with names (e.g., Mike, Sarah, Diego, Aisha).
- Each message ≤ ${SLANG_HANG_LIMITS.MAX_MESSAGE_LENGTH} chars, sounds spoken (not written).
- Include slang/colloquial expressions scaled to dialogue length: 2-5 messages → 2-4 total; 6+ messages → 4-8 total. Distribute naturally (≤ ${SLANG_HANG_LIMITS.MAX_SLANG_PER_MESSAGE} per message). Mix common slang with mildly regional/generational variants. NEVER invent slang that isn't actually used.
- For each slang term, provide: meaning, part of speech, an example sentence in a different context, and register (informal | very informal | regional).
- Scenario must be specific and unexpected when possible.`;

const GENERATE_SCHEMA = {
	type: Type.OBJECT,
	properties: {
		scenario: { type: Type.STRING },
		speakers: {
			type: Type.ARRAY,
			items: {
				type: Type.OBJECT,
				properties: {
					key: { type: Type.STRING, enum: ["A", "B"] },
					name: { type: Type.STRING },
					persona: { type: Type.STRING },
				},
				propertyOrdering: ["key", "name", "persona"],
			},
		},
		messages: {
			type: Type.ARRAY,
			items: {
				type: Type.OBJECT,
				properties: {
					order: { type: Type.INTEGER },
					speakerKey: { type: Type.STRING, enum: ["A", "B"] },
					text: { type: Type.STRING },
					slang: {
						type: Type.ARRAY,
						items: {
							type: Type.OBJECT,
							properties: {
								term: { type: Type.STRING },
								partOfSpeech: { type: Type.STRING },
								meaning: { type: Type.STRING },
								example: { type: Type.STRING },
								register: { type: Type.STRING },
							},
							propertyOrdering: [
								"term",
								"partOfSpeech",
								"meaning",
								"example",
								"register",
							],
						},
					},
				},
				propertyOrdering: ["order", "speakerKey", "text", "slang"],
			},
		},
	},
	propertyOrdering: ["scenario", "speakers", "messages"],
};

const LEVEL_GUIDANCE = {
	beginner:
		"Learner level: BEGINNER. Use very common, widely-known slang only. Keep sentences short and vocabulary simple. Avoid regional/obscure expressions.",
	intermediate:
		"Learner level: INTERMEDIATE. Mix common slang with some moderately known colloquial expressions. Medium sentence length.",
	advanced:
		"Learner level: ADVANCED. Include richer slang including regional/generational variants. Longer, more nuanced exchanges are welcome.",
};

export async function generateDialogue({ topic, level }) {
	console.log(`[slang-hang] generate request: topic=${topic}, level=${level}`);
	const startedAt = Date.now();
	const levelHint = LEVEL_GUIDANCE[level] ?? "";

	return withRetry(async () => {
		const response = await genai.models.generateContent({
			model: MODEL,
			contents: [
				{
					role: "user",
					parts: [
						{
							text: `Topic: ${topic}\n${levelHint}\nGenerate a dialogue.`,
						},
					],
				},
			],
			config: {
				systemInstruction: GENERATE_SYSTEM,
				responseMimeType: "application/json",
				responseJsonSchema: GENERATE_SCHEMA,
			},
		});

		let parsed;
		try {
			parsed = JSON.parse(response.text);
		} catch {
			throw new ApiError(502, "Invalid AI response: JSON parse failed");
		}
		console.log(
			`[slang-hang] generate ok: messages=${parsed?.messages?.length ?? 0}, latency=${Date.now() - startedAt}ms`,
		);
		return parsed;
	}, "generateDialogue");
}
