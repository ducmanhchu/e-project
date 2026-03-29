import mongoose from "mongoose";

const definitionSchema = new mongoose.Schema(
  {
    partOfSpeech: String,
    definition: String,
    example: String,
  },
  { _id: false },
);

const vocabularySchema = new mongoose.Schema(
  {
    // Core word data
    word: { type: String, required: true, lowercase: true, trim: true },
    partOfSpeech: String,
    meaning: { type: String, required: true }, // Vietnamese
    example: String,

    // Rich data (AI-generated, cached)
    phonetic: String,
    definitions: [definitionSchema],
    synonyms: [String],
    antonyms: [String],
    relatedWords: [String],
    enrichedBy: { type: String, enum: ["claude", "gemini"] },
    enrichedAt: Date,
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

vocabularySchema.index({ word: 1, meaning: 1 }, { unique: true });

export const Vocabulary = mongoose.model(
  "Vocabulary",
  vocabularySchema,
  "vocabularies",
);
