import mongoose from "mongoose";
import { WRITING_LEVEL, WRITING_TOPIC } from "@server/const/writting";

const examSchema = new mongoose.Schema(
  {
    topic: { type: String, enum: Object.values(WRITING_TOPIC) },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    level: { type: String, enum: Object.values(WRITING_LEVEL) },
    examType: {
      type: String,
      required: true,
      enum: ["ielts_task1", "ielts_task2"],
    },
    examPrompt: { type: String, required: true },
    imageUrl: { type: String },
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

export const Exam = mongoose.model("Exam", examSchema, "exams");
