import mongoose from "mongoose";

const messageAttemptSchema = new mongoose.Schema(
  {
    messageOrder: { type: Number, required: true, min: 0 },
    targetText: { type: String, required: true, trim: true },
    feedback: { type: mongoose.Schema.Types.Mixed },
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
    messageAttempts: { type: [messageAttemptSchema], default: [] },
    completedMessages: { type: Number, default: 0, min: 0 },
    completedAt: Date,
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

dialogueAttemptSchema.index({ userId: 1, dialogueId: 1 }, { unique: true });
dialogueAttemptSchema.index({ userId: 1, updatedAt: -1 });

export const DialogueAttempt = mongoose.model(
  "DialogueAttempt",
  dialogueAttemptSchema,
  "dialogueAttempts",
);
