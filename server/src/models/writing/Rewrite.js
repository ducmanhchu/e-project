import mongoose from "mongoose";
import { getBaseWritingFields, BASE_SCHEMA_OPTIONS } from "./baseWritingFields";

const rewriteSchema = new mongoose.Schema(
  {
    ...getBaseWritingFields(),
    targetSentence: { type: String, required: true },
  },
  BASE_SCHEMA_OPTIONS,
);

export const Rewrite = mongoose.model(
  "Rewrite",
  rewriteSchema,
  "rewrites",
);
