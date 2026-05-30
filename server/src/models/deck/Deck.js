import mongoose from "mongoose";
import { DECK_LIMITS, DECK_VISIBILITY } from "@server/const/deck";
import { normalizeTags } from "@server/helpers/normalizeTags";

const deckSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: DECK_LIMITS.NAME_MAX,
    },
    description: {
      type: String,
      trim: true,
      maxlength: DECK_LIMITS.DESCRIPTION_MAX,
    },
    visibility: {
      type: String,
      enum: Object.values(DECK_VISIBILITY), 
      default: DECK_VISIBILITY.PRIVATE,
    },
    tags: {
      type: [String],
      default: [],
      set: (v) => (Array.isArray(v) ? normalizeTags(v) : v),
    },
    image: String,
    imagePublicId: String,
    cardCount: { type: Number, default: 0 },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },
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

deckSchema.index({ userId: 1, createdAt: -1 });
deckSchema.index({ userId: 1, folderId: 1, createdAt: -1 });
deckSchema.index({ visibility: 1, createdAt: -1 });

deckSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate();
  if (update?.tags !== undefined) {
    update.tags = normalizeTags(update.tags);
  }
});

export const Deck = mongoose.model("Deck", deckSchema, "decks");
