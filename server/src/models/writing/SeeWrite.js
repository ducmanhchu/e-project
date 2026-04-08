import mongoose from "mongoose";
import { getBaseWritingFields, BASE_SCHEMA_OPTIONS } from "./baseWritingFields";

const seeWriteSchema = new mongoose.Schema(
  {
    ...getBaseWritingFields(),
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, required: true, enum: ["image", "video"] },
    requiredKeywords: [String],
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
