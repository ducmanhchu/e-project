import {
  WRITING_LEVEL,
  WRITING_TOPIC,
} from "@server/const/writting";

export function getBaseWritingFields() {
  return {
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
    sortOrder: Number,
    totalSentences: { type: Number, default: 0 },
  };
}

export const BASE_SCHEMA_OPTIONS = {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform(_, ret) {
      delete ret._id;
    },
  },
};
