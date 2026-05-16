import mongoose from "mongoose";
import { DECK_LIMITS } from "@server/const/deck";
import { normalizeTags } from "@server/helpers/normalizeTags";

const flipStatsSchema = new mongoose.Schema(
  {
    studyCount: { type: Number, default: 0 },
    knownCount: { type: Number, default: 0 },
    unknownCount: { type: Number, default: 0 },
    lastStudiedAt: Date,
  },
  { _id: false },
);

const modeSchema = new mongoose.Schema(
  {
    flip: { type: flipStatsSchema, default: () => ({}) },
  },
  { _id: false },
);

const cardSchema = new mongoose.Schema(
  {
    deckId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deck",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    frontContent: {
      type: String,
      required: true,
      maxlength: DECK_LIMITS.CARD_CONTENT_MAX,
    },
    backContent: {
      type: String,
      required: true,
      maxlength: DECK_LIMITS.CARD_CONTENT_MAX,
    },
    ipa: { type: String, trim: true, maxlength: DECK_LIMITS.IPA_MAX },
    example: { type: String, trim: true, maxlength: DECK_LIMITS.EXAMPLE_MAX },
    audio: String,
    image: String,
    imagePublicId: String,
    tags: {
      type: [String],
      default: [],
      set: (v) => (Array.isArray(v) ? normalizeTags(v) : v),
    },
    mode: { type: modeSchema, default: () => ({}) },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        delete ret._id;
      },
    },
  },
);

cardSchema.index({ deckId: 1, createdAt: -1 });
cardSchema.index({ userId: 1, deckId: 1 });

cardSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate();
  if (update?.tags !== undefined) {
    update.tags = normalizeTags(update.tags);
  }
});

export const Card = mongoose.model("Card", cardSchema, "cards");
