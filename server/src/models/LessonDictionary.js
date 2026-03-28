import mongoose from "mongoose";

const lessonDictionarySchema = new mongoose.Schema(
  {
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WritingLesson",
      required: true,
    },
    entries: [
      {
        sentenceIndex: Number, // null = applies to whole lesson (Dictionary)
        word: String,
        partOfSpeech: {
          type: String,
          enum: [
            "word",
            "noun",
            "verb",
            "adj",
            "adv",
            "prep",
            "noun_phrase",
            "verb_phrase",
            "adj_phrase",
            "adv_phrase",
            "prep_phrase",
            "phrasal_verb",
          ],
        },
        meaning: String,
        example: String,
        audioUrl: String,
      },
    ],
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

lessonDictionarySchema.index({ lessonId: 1 });

export const LessonDictionary = mongoose.model(
  "LessonDictionary",
  lessonDictionarySchema,
  "lessonDictionaries",
);
