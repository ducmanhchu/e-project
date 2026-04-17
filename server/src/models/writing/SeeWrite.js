import mongoose from "mongoose";
import { getBaseWritingFields, BASE_SCHEMA_OPTIONS } from "./baseWritingFields";

const seeWriteSchema = new mongoose.Schema(
  {
    ...(() => { const { totalSentences, ...rest } = getBaseWritingFields(); return rest; })(),
    image: { type: String, required: true },
    wordPool: [{ word: String, meaning: String, isRequired: Boolean }],
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
