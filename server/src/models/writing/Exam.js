import mongoose from "mongoose";
import { EXAM_TYPE } from "@server/const/writting";
import { getBaseWritingFields, BASE_SCHEMA_OPTIONS } from "./baseWritingFields";

const examSchema = new mongoose.Schema(
  {
    ...getBaseWritingFields(),
    examType: { type: String, required: true, enum: Object.values(EXAM_TYPE) },
    examPrompt: { type: String, required: true },
    examDuration: { type: Number, required: true },
    sampleAnswer: String,
  },
  {
    ...BASE_SCHEMA_OPTIONS,
    toJSON: {
      ...BASE_SCHEMA_OPTIONS.toJSON,
      transform(_, ret) {
        delete ret._id;
        delete ret.sampleAnswer;
      },
    },
  },
);

export const Exam = mongoose.model(
  "Exam",
  examSchema,
  "exams",
);
