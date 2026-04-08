import mongoose from "mongoose";

const exampleSchema = new mongoose.Schema(
  {
    engEx: String,
    viEx: String,
  },
  { _id: false },
);

const definitionSchema = new mongoose.Schema(
  {
    definitionCefrLevel: String,
    engDef: String,
    viDef: String,
    example: exampleSchema,
    synonyms: [String],
    antonyms: [String],
  },
  { _id: false },
);

const vocabularySchema = new mongoose.Schema(
  {
    word: { type: String, required: true, lowercase: true, trim: true },
    partOfSpeech: String,
    ipa: String,
    definitions: [definitionSchema],
    audio: String,
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

vocabularySchema.index({ word: 1, partOfSpeech: 1 }, { unique: true });

export const Vocabulary = mongoose.model(
  "Vocabulary",
  vocabularySchema,
  "vocabularies",
);
