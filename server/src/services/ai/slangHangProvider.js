import { Type, genai } from "@server/services/ai/client";
import { ApiError } from "@server/helpers/ApiError";
import { SLANG_HANG_LIMITS, SLANG_HANG_RETRY } from "@server/const/slangHang";

const MODEL = "gemini-2.5-flash";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractStatusCode(err) {
  return (
    err?.status ??
    err?.statusCode ??
    err?.response?.status ??
    null
  );
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
  console.error(`[slang-hang] ${label} failed after retries:`, lastErr?.message);
  throw new ApiError(503, `${label}: AI service unavailable, please try again`);
}

const GENERATE_SYSTEM = `You are a native English speaker and screenwriter who creates short, realistic dialogues showing how natural speakers use slang and colloquial expressions in everyday situations.

Rules:
- Generate ${SLANG_HANG_LIMITS.MIN_MESSAGES}-${SLANG_HANG_LIMITS.MAX_MESSAGES} messages alternating between exactly 2 speakers (A and B).
- Speakers are distinct people with names (e.g., Mike, Sarah, Diego, Aisha).
- Each message ≤ ${SLANG_HANG_LIMITS.MAX_MESSAGE_LENGTH} chars, sounds spoken (not written).
- Include 4-8 slang/colloquial expressions total, distributed naturally across messages (≤ ${SLANG_HANG_LIMITS.MAX_SLANG_PER_MESSAGE} per message). Mix common slang with mildly regional/generational variants. NEVER invent slang that isn't actually used.
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

const GRADE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.INTEGER },
    accuracyComment: { type: Type.STRING },
    fluencyComment: { type: Type.STRING },
    slangComment: { type: Type.STRING },
    problemWords: { type: Type.ARRAY, items: { type: Type.STRING } },
    suggestion: { type: Type.STRING },
  },
  propertyOrdering: [
    "score",
    "accuracyComment",
    "fluencyComment",
    "slangComment",
    "problemWords",
    "suggestion",
  ],
};

const GRADE_PROMPT = ({ targetText, slangContext }) => `You are an English pronunciation coach evaluating a learner reading a single line of dialogue containing slang/colloquial expressions.

Target line (what they should have said):
"${targetText}"

Slang in this line: ${slangContext || "none"}

Listen to the audio and evaluate:
1. Accuracy — were the words recognizable and pronounced correctly?
2. Fluency — natural pace, no awkward pauses?
3. Slang nuance — did they pronounce slang naturally (right stress/intonation)?

Return JSON with:
- score: 0-100 (0 = unintelligible; 100 = native-like)
- accuracyComment: 1 sentence about word accuracy (English)
- fluencyComment: 1 sentence about pace/intonation (English)
- slangComment: 1 sentence about slang delivery, or "N/A" if no slang (English)
- problemWords: list of words mispronounced or unclear (may be empty)
- suggestion: 1 actionable tip in Vietnamese

Be encouraging but honest.`;

export async function gradePronunciation({
  audioBuffer,
  mimeType,
  targetText,
  slangContext = "",
}) {
  console.log(
    `[slang-hang] grade request: targetTextLen=${targetText.length}, audioBytes=${audioBuffer.length}, mime=${mimeType}`,
  );
  const startedAt = Date.now();

  return withRetry(async () => {
    const response = await genai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBuffer.toString("base64"),
              },
            },
            { text: GRADE_PROMPT({ targetText, slangContext }) },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: GRADE_SCHEMA,
      },
    });

    let parsed;
    try {
      parsed = JSON.parse(response.text);
    } catch {
      throw new ApiError(502, "Invalid AI response: JSON parse failed");
    }
    console.log(
      `[slang-hang] grade ok: score=${parsed?.score}, latency=${Date.now() - startedAt}ms`,
    );
    return parsed;
  }, "gradePronunciation");
}

export async function generateDialogue({ topic }) {
  console.log(`[slang-hang] generate request: topic=${topic}`);
  const startedAt = Date.now();

  return withRetry(async () => {
    const response = await genai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: `Topic: ${topic}\nGenerate a dialogue.` }],
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
