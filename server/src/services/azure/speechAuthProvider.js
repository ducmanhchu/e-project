import { env } from "@server/config/environment";
import { ApiError } from "@server/helpers/ApiError";

const TOKEN_TTL_MS = 9 * 60 * 1000;

let cached = null;

export function _resetCacheForTests() {
  cached = null;
}

async function fetchNewToken() {
  if (!env.AZURE_SPEECH_KEY || !env.AZURE_SPEECH_REGION) {
    throw new ApiError(500, "Azure Speech credentials not configured");
  }

  const url = `https://${env.AZURE_SPEECH_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": env.AZURE_SPEECH_KEY,
      "Content-Length": "0",
    },
  });

  if (!res.ok) {
    throw new ApiError(502, `Azure issueToken failed: ${res.status}`);
  }

  return res.text();
}

export async function getSpeechToken() {
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return {
      token: cached.token,
      region: env.AZURE_SPEECH_REGION,
      expiresAt: cached.expiresAt,
    };
  }

  const token = await fetchNewToken();
  cached = { token, expiresAt: now + TOKEN_TTL_MS };
  return {
    token,
    region: env.AZURE_SPEECH_REGION,
    expiresAt: cached.expiresAt,
  };
}
