export const SLANG_HANG_LIMITS = {
  MIN_MESSAGES: 10,
  MAX_MESSAGES: 14,
  MAX_MESSAGE_LENGTH: 500,
  MAX_SLANG_PER_MESSAGE: 3,
  MIN_SPEAKERS: 2,
  MAX_SPEAKERS: 2,
};

export const SLANG_HANG_MODE = {
  SINGLE_ROLE: "single_role", // A = TTS opener, B = learner records
  BOTH_ROLES: "both_roles", // learner records both A and B
};

export const SLANG_HANG_RETRY = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY_MS: 500,
  MAX_DELAY_MS: 4000,
  RETRYABLE_CODES: [429, 500, 502, 503, 504],
};
