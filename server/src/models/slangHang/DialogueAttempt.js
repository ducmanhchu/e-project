import mongoose from "mongoose";

const scoreSchema = new mongoose.Schema(
  {
    accuracy: { type: Number, required: true, min: 0, max: 100 },
    fluency: { type: Number, required: true, min: 0, max: 100 },
    completeness: { type: Number, required: true, min: 0, max: 100 },
    pronunciation: { type: Number, required: true, min: 0, max: 100 },
    prosody: { type: Number, min: 0, max: 100 },
  },
  { _id: false },
);

const phonemeResultSchema = new mongoose.Schema(
  {
    phoneme: { type: String, required: true },
    accuracyScore: { type: Number, min: 0, max: 100 },
  },
  { _id: false },
);

const syllableResultSchema = new mongoose.Schema(
  {
    syllable: { type: String, required: true },
    accuracyScore: { type: Number, min: 0, max: 100 },
  },
  { _id: false },
);

const wordResultSchema = new mongoose.Schema(
  {
    word: { type: String, required: true },
    accuracyScore: { type: Number, min: 0, max: 100 },
    errorType: { type: String },
    offset: { type: Number, min: 0 },
    duration: { type: Number, min: 0 },
    syllables: { type: [syllableResultSchema], default: undefined },
    phonemes: { type: [phonemeResultSchema], default: undefined },
  },
  { _id: false },
);

const utteranceSchema = new mongoose.Schema(
  {
    messageOrder: { type: Number, required: true, min: 0 },
    targetText: { type: String, required: true, trim: true },
    scores: { type: scoreSchema, required: true },
    words: { type: [wordResultSchema], default: [] },
    attemptedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const dialogueAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dialogueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dialogue",
      required: true,
    },
    status: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "in_progress",
      index: true,
    },
    utterances: { type: [utteranceSchema], default: [] },
    completedMessages: { type: Number, default: 0, min: 0 },
    overallScores: {
      accuracy: { type: Number, min: 0, max: 100 },
      fluency: { type: Number, min: 0, max: 100 },
      completeness: { type: Number, min: 0, max: 100 },
      pronunciation: { type: Number, min: 0, max: 100 },
      prosody: { type: Number, min: 0, max: 100 },
    },
    completedAt: Date,
  },
  {
    timestamps: true,
    versionKey: "__v",
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        delete ret._id;
      },
    },
  },
);

dialogueAttemptSchema.index({ userId: 1, dialogueId: 1 }, { unique: true });
dialogueAttemptSchema.index({ userId: 1, updatedAt: -1 });

export const DialogueAttempt = mongoose.model(
  "DialogueAttempt",
  dialogueAttemptSchema,
  "dialogueAttempts",
);
