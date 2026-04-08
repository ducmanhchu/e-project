import mongoose from "mongoose";
import { getBaseWritingFields, BASE_SCHEMA_OPTIONS } from "./baseWritingFields";

const sentenceSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    vietnameseText: { type: String, required: true },
    referenceAnswer: { type: String, required: true },
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
    sentenceIndex: Number,
  },
  { _id: false },
);

const reverseTranslationSchema = new mongoose.Schema(
  {
    ...getBaseWritingFields(),
    vietnameseParagraph: { type: String, required: true },
    sentences: {
      type: [sentenceSchema],
      validate: [(v) => v.length > 0, "sentences must have at least 1 item"],
    },
    vocabularyRefs: [vocabRefSchema],
  },
  {
    ...BASE_SCHEMA_OPTIONS,
    toJSON: {
      ...BASE_SCHEMA_OPTIONS.toJSON,
      transform(_, ret) {
        delete ret._id;
        if (ret.sentences) {
          ret.sentences = ret.sentences.map(
            ({ referenceAnswer, ...rest }) => rest,
          );
        }
      },
    },
  },
);

export const ReverseTranslation = mongoose.model(
  "ReverseTranslation",
  reverseTranslationSchema,
  "reverseTranslations",
);
