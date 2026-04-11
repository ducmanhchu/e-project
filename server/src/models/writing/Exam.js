import mongoose from "mongoose";
import { getBaseWritingFields, BASE_SCHEMA_OPTIONS } from "./baseWritingFields";

const examSchema = new mongoose.Schema(
  {
    ...getBaseWritingFields(),
    examType: {
      type: String,
      required: true,
      enum: ["ielts_task1", "ielts_task2"],
    },
    examPrompt: { type: String, required: true },
    imageUrl: { type: String },
  },
  BASE_SCHEMA_OPTIONS,
);

export const Exam = mongoose.model("Exam", examSchema, "exams");
