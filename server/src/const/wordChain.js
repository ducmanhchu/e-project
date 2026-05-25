export const WORD_CHAIN_LEVEL = {
  BEGINNER: "beginner",
  INTERMEDIATE: "intermediate",
  ADVANCED: "advanced",
};

export const WORD_CHAIN_STATUS = {
  ACTIVE: "active",
  ENDED: "ended",
};

export const WORD_CHAIN_SPEAKER = {
  BOT: "bot",
  USER: "user",
};

export const WORD_CHAIN_FAIL_REASON = {
  TIMEOUT: "timeout",
  WRONG_LETTER: "wrong_letter",
  TOO_SHORT: "too_short",
  NOT_IN_DICTIONARY: "not_in_dictionary",
  DUPLICATE: "duplicate",
  GAVE_UP: "gave_up",
  BOT_CANT_CONTINUE: "bot_cant_continue",
  ABANDONED: "abandoned",
};

export const TIME_LIMIT_PER_LEVEL_MS = {
  beginner: 20_000,
  intermediate: 15_000,
  advanced: 10_000,
};

export const CEFR_BY_LEVEL = {
  beginner: ["A1", "A2"],
  intermediate: ["B1", "B2"],
  advanced: ["C1", "C2"],
};

export const HARD_END_LETTERS = ["x", "q", "z"];
export const MIN_WORD_LENGTH = 3;
