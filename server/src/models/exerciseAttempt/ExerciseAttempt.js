import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    userAnswer: { type: String, required: true },
    score: { type: Number, min: 0, max: 100, required: true },
    feedback: { type: mongoose.Schema.Types.Mixed },
    gradedBy: { type: String, enum: ["claude", "gemini"] },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const sentenceAttemptSchema = new mongoose.Schema(
  {
    sentenceOrder: { type: Number, required: true },
    submissions: [submissionSchema],
    bestScore: { type: Number, default: 0 },
    attemptCount: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
  },
  { _id: false },
);

const exerciseAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lessonType: {
      type: String,
      required: true,
      enum: ["ReverseTranslation", "SeeWrite", "Rewrite", "Exam"],
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "lessonType",
      required: true,
    },
    status: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "in_progress",
    },
    completedAt: Date,
    sentenceAttempts: [sentenceAttemptSchema],
    totalScore: { type: Number, default: 0 },
    completedSentences: { type: Number, default: 0 },
    keywordQuiz: {
      selectedKeywords: [String],
      correct: [String],
      missed: [String],
      wrong: [String],
      score: { type: Number, default: 0 },
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

exerciseAttemptSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
exerciseAttemptSchema.index({ userId: 1, status: 1 });

export const ExerciseAttempt = mongoose.model(
  "ExerciseAttempt",
  exerciseAttemptSchema,
  "exerciseAttempts",
);
