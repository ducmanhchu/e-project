import mongoose from "mongoose";
import { getBaseWritingFields, BASE_SCHEMA_OPTIONS } from "./baseWritingFields";

const seeWriteSchema = new mongoose.Schema(
  {
    ...getBaseWritingFields(),
    mediaUrl: { type: String, required: true },
    requiredWords: [String],
    wordPool: [String],
    minWordCount: Number,
    maxWordCount: Number,
  },
  BASE_SCHEMA_OPTIONS,
);

export const SeeWrite = mongoose.model(
  "SeeWrite",
  seeWriteSchema,
  "seeWrites",
);
