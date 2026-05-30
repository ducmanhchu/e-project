export const VERIFICATION_TOKEN_TYPE = {
  EMAIL_VERIFY: "email_verify",
  PASSWORD_RESET: "password_reset",
  // Tương lai: EMAIL_CHANGE: "email_change"
};

export const VERIFICATION_TOKEN_TTL_MS = {
  [VERIFICATION_TOKEN_TYPE.EMAIL_VERIFY]: 24 * 60 * 60 * 1000, // 24h
  [VERIFICATION_TOKEN_TYPE.PASSWORD_RESET]: 60 * 60 * 1000, // 1h
};

export const VERIFICATION_TOKEN_BYTES = 32; // → 64 hex chars
