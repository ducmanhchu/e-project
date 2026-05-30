import mongoose from "mongoose";

const LESSON_TYPES = ["ReverseTranslation", "SeeWrite", "Rewrite", "Exam"];

const sentenceProgressSchema = new mongoose.Schema(
  {
    sentenceOrder: { type: Number, required: true },
    bestScore: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
  },
  { _id: false },
);

const keywordQuizSchema = new mongoose.Schema(
  {
    correct: [String],
    missed: [String],
    wrong: [String],
    score: { type: Number, default: 0 },
  },
  { _id: false },
);

const attemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lessonType: {
      type: String,
      required: true,
      enum: LESSON_TYPES,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "lessonType",
      required: true,
    },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
    },
    bestScore: { type: Number, default: 0 },
    completedSentences: { type: Number, default: 0 },
    completedAt: Date,
    sentenceProgress: [sentenceProgressSchema],
    keywordQuiz: { type: keywordQuizSchema, default: undefined },
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

attemptSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
attemptSchema.index({ userId: 1, status: 1 });

export const Attempt = mongoose.model("Attempt", attemptSchema, "attempts");
