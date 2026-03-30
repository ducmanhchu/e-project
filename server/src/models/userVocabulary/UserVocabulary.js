import mongoose from "mongoose";

const userVocabularySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vocabularyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vocabulary",
      required: true,
    },
    status: {
      type: String,
      enum: ["new", "learning", "learned"],
      default: "new",
    },
    addedAt: { type: Date, default: Date.now },
    lastReviewedAt: Date,
    reviewCount: { type: Number, default: 0 },
    correctStreak: { type: Number, default: 0 },
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

userVocabularySchema.index({ userId: 1, vocabularyId: 1 }, { unique: true });
userVocabularySchema.index({ userId: 1, status: 1 });
userVocabularySchema.index({ userId: 1, addedAt: -1 });

export const UserVocabulary = mongoose.model(
  "UserVocabulary",
  userVocabularySchema,
  "userVocabularies",
);
