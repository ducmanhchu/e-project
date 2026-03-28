import mongoose from "mongoose";
import {
  WRITING_TYPE,
  WRITING_LEVEL,
  WRITING_TOPIC,
  CONTENT_TYPE,
  EXAM_TYPE,
} from "@server/const/writting";

const sentenceSchema = new mongoose.Schema({
  order: { type: Number, required: true },
  vietnameseText: { type: String, required: true },
  referenceAnswer: { type: String, required: true, select: false },
  explanation: String,
});

const writingLessonSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: Object.values(WRITING_TYPE),
    },
    contentType: {
      type: String,
      enum: Object.values(CONTENT_TYPE),
      default: CONTENT_TYPE.GENERAL,
    },
    topic: {
      type: String,
      enum: Object.values(WRITING_TOPIC),
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    level: {
      type: String,
      enum: Object.values(WRITING_LEVEL),
    },
    isPremium: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false },
    order: Number,

    // --- reverse_translation: embedded sentence array ---
    sentences: [sentenceSchema],

    // --- see_and_write ---
    mediaUrl: String,
    mediaType: { type: String, enum: ["image", "video"] },
    requiredKeywords: [String],
    minWordCount: Number,
    maxWordCount: Number,

    // --- paraphrasing ---
    targetSentence: String,

    // --- exam_simulation ---
    examType: { type: String, enum: Object.values(EXAM_TYPE) },
    examPrompt: String,
    examDuration: Number,
    sampleAnswer: { type: String, select: false },

    // --- Metadata ---
    totalSentences: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
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

export const WritingLesson = mongoose.model(
  "writingLessons",
  writingLessonSchema,
);
