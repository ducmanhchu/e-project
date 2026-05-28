import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attempt",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sentenceOrder: { type: Number, required: true },
    userAnswer: { type: String, required: true },
    score: { type: Number, min: 0, max: 100, required: true },
    gradedBy: { type: String, enum: ["claude", "gemini"], required: true },
    feedback: { type: mongoose.Schema.Types.Mixed, required: true },
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

submissionSchema.index({ attemptId: 1, sentenceOrder: 1, createdAt: -1 });
submissionSchema.index({ attemptId: 1, createdAt: -1 });
submissionSchema.index({ userId: 1, createdAt: -1 });

export const Submission = mongoose.model(
  "Submission",
  submissionSchema,
  "submissions",
);
