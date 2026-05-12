import mongoose from "mongoose";
import { WRITING_LEVEL, WRITING_TOPIC } from "@server/const/writting";

const wordPoolItemSchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vocabulary",
      required: true,
    },
    isRequired: { type: Boolean, default: false },
  },
  { _id: false },
);

const seeWriteSchema = new mongoose.Schema(
  {
    topic: { type: String, enum: Object.values(WRITING_TOPIC) },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    level: { type: String, enum: Object.values(WRITING_LEVEL) },
    image: { type: String, required: true },
    wordPool: [wordPoolItemSchema],
    minWordCount: Number,
    maxWordCount: Number,
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

export const SeeWrite = mongoose.model(
  "SeeWrite",
  seeWriteSchema,
  "seeWrites",
);
