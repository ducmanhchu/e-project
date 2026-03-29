import mongoose from "mongoose";
import { WRITING_TYPE, EXAM_TYPE } from "@server/const/writting";

const sentenceSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    vietnameseText: { type: String, required: true },
    referenceAnswer: { type: String, required: true },
    explanation: String,
  },
  { _id: false },
);

const vocabRefSchema = new mongoose.Schema(
  {
    vocabularyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vocabulary",
      required: true,
    },
    sentenceIndex: Number, // null = dictionary chung cho cả bài
  },
  { _id: false },
);

const reverseTranslationSchema = new mongoose.Schema(
  {
    vietnameseParagraph: { type: String, required: true },
    sentences: {
      type: [sentenceSchema],
      validate: [(v) => v.length > 0, "sentences must have at least 1 item"],
    },
    vocabularyRefs: [vocabRefSchema],
  },
  { _id: false },
);

const seeAndWriteSchema = new mongoose.Schema(
  {
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, required: true, enum: ["image", "video"] },
    requiredKeywords: [String],
    minWordCount: Number,
    maxWordCount: Number,
  },
  { _id: false },
);

const paraphrasingSchema = new mongoose.Schema(
  {
    targetSentence: { type: String, required: true },
  },
  { _id: false },
);

const examSimulationSchema = new mongoose.Schema(
  {
    examType: { type: String, required: true, enum: Object.values(EXAM_TYPE) },
    examPrompt: { type: String, required: true },
    examDuration: { type: Number, required: true },
    sampleAnswer: String,
  },
  { _id: false },
);

export const CONTENT_SCHEMAS = {
  [WRITING_TYPE.REVERSE_TRANSLATION]: reverseTranslationSchema,
  [WRITING_TYPE.SEE_AND_WRITE]: seeAndWriteSchema,
  [WRITING_TYPE.PARAPHRASING]: paraphrasingSchema,
  [WRITING_TYPE.EXAM_SIMULATION]: examSimulationSchema,
};
