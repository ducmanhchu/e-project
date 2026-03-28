import mongoose from "mongoose";

const definitionSchema = new mongoose.Schema(
  {
    partOfSpeech: String,
    definition: String,
    example: String,
  },
  { _id: false },
);

const lessonRefSchema = new mongoose.Schema(
  {
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "WritingLesson" },
    sentenceIndex: Number, // null = dictionary chung cho cả bài
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

    // Lesson associations — which lessons use this word
    lessons: [lessonRefSchema],
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

// Unique per word + meaning combo (same word can have different meanings)
vocabularySchema.index({ word: 1, meaning: 1 }, { unique: true });
// Query by lesson
vocabularySchema.index({ "lessons.lessonId": 1 });

export const Vocabulary = mongoose.model(
  "Vocabulary",
  vocabularySchema,
  "vocabularies",
);
