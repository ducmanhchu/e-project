import mongoose from "mongoose";
import {
  WRITING_TYPE,
  WRITING_LEVEL,
  WRITING_TOPIC,
  CONTENT_TYPE,
} from "@server/const/writting";
// Content validation handled by prepareContentByType in service layer

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
    sortOrder: Number,
    totalSentences: { type: Number, default: 0 },

    content: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        delete ret._id;
        // Strip referenceAnswer from content.sentences
        if (ret.content?.sentences) {
          ret.content.sentences = ret.content.sentences.map(
            ({ referenceAnswer, ...rest }) => rest,
          );
        }
        // Strip sampleAnswer from exam content
        if (ret.content?.sampleAnswer) {
          delete ret.content.sampleAnswer;
        }
      },
    },
  },
);


export const WritingLesson = mongoose.model(
  "WritingLesson",
  writingLessonSchema,
  "writingLessons",
);
