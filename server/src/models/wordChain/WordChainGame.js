import mongoose from "mongoose";
import {
  WORD_CHAIN_LEVEL,
  WORD_CHAIN_STATUS,
  WORD_CHAIN_FAIL_REASON,
  WORD_CHAIN_SPEAKER,
} from "@server/const/wordChain";

const wordEntrySchema = new mongoose.Schema(
  {
    word: { type: String, required: true, lowercase: true, trim: true },
    by: {
      type: String,
      enum: Object.values(WORD_CHAIN_SPEAKER),
      required: true,
    },
    source: {
      type: String,
      enum: ["vocabulary", "wordlist", null],
      default: null,
    },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const wordChainGameSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    level: {
      type: String,
      enum: Object.values(WORD_CHAIN_LEVEL),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(WORD_CHAIN_STATUS),
      default: WORD_CHAIN_STATUS.ACTIVE,
      required: true,
    },
    words: {
      type: [wordEntrySchema],
      required: true,
      validate: [(v) => v.length >= 1, "words must contain at least seed word"],
    },
    finalScore: { type: Number, default: 0, min: 0 },
    failReason: {
      type: String,
      enum: [...Object.values(WORD_CHAIN_FAIL_REASON), null],
      default: null,
    },
    turnStartedAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: "__v",
    optimisticConcurrency: true,
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        delete ret._id;
      },
    },
  },
);

wordChainGameSchema.index({ userId: 1, status: 1, createdAt: -1 });
wordChainGameSchema.index({ userId: 1, level: 1, finalScore: -1 });

export const WordChainGame = mongoose.model(
  "WordChainGame",
  wordChainGameSchema,
  "wordChainGames",
);
