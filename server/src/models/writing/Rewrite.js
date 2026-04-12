import mongoose from "mongoose";
import { getBaseWritingFields, BASE_SCHEMA_OPTIONS } from "./baseWritingFields";

const rewriteSentenceSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    targetSentence: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const rewriteSchema = new mongoose.Schema(
  {
    ...getBaseWritingFields(),
    sentences: {
      type: [rewriteSentenceSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: "sentences must be a non-empty array",
      },
    },
  },
  BASE_SCHEMA_OPTIONS,
);

export const Rewrite = mongoose.model("Rewrite", rewriteSchema, "rewrites");
