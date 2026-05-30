import mongoose from "mongoose";
import { WRITING_LEVEL, WRITING_TOPIC } from "@server/const/writting";

const rewriteSentenceSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    targetSentence: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const rewriteSchema = new mongoose.Schema(
  {
    topic: { type: String, enum: Object.values(WRITING_TOPIC) },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    level: { type: String, enum: Object.values(WRITING_LEVEL) },
    totalSentences: { type: Number, default: 0 },
    sentences: {
      type: [rewriteSentenceSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: "sentences must be a non-empty array",
      },
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

export const Rewrite = mongoose.model("Rewrite", rewriteSchema, "rewrites");
