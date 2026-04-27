export const SLANG_HANG_LIMITS = {
  MIN_MESSAGES: 10,
  MAX_MESSAGES: 14,
  MAX_MESSAGE_LENGTH: 500,
  MAX_SLANG_PER_MESSAGE: 3,
  MIN_SPEAKERS: 2,
  MAX_SPEAKERS: 2,
  MAX_AUDIO_BYTES: 5 * 1024 * 1024, // 5MB
  ALLOWED_AUDIO_MIME: [
    "audio/webm",
    "audio/ogg",
    "audio/wav",
    "audio/mp4",
    "audio/mpeg",
  ],
};

export const SLANG_HANG_RETRY = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY_MS: 500,
  MAX_DELAY_MS: 4000,
  RETRYABLE_CODES: [429, 500, 502, 503, 504],
};
