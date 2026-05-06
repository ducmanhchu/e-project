import mongoose from "mongoose";
import { WRITING_TOPIC } from "@server/const/writting";
import { SLANG_HANG_LIMITS, SLANG_HANG_MODE } from "@server/const/slangHang";

const slangSchema = new mongoose.Schema(
  {
    term: { type: String, required: true, trim: true },
    partOfSpeech: { type: String, trim: true },
    meaning: { type: String, required: true, trim: true },
    example: { type: String, trim: true },
    register: { type: String, trim: true },
  },
  { _id: false },
);

const messageSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    speakerKey: { type: String, enum: ["A", "B"], required: true },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: SLANG_HANG_LIMITS.MAX_MESSAGE_LENGTH,
    },
    slang: {
      type: [slangSchema],
      validate: {
        validator: (arr) => arr.length <= SLANG_HANG_LIMITS.MAX_SLANG_PER_MESSAGE,
        message: `slang per message must be ≤ ${SLANG_HANG_LIMITS.MAX_SLANG_PER_MESSAGE}`,
      },
    },
  },
  { _id: false },
);

const speakerSchema = new mongoose.Schema(
  {
    key: { type: String, enum: ["A", "B"], required: true },
    name: { type: String, required: true, trim: true },
    persona: { type: String, trim: true },
  },
  { _id: false },
);

const dialogueSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    topic: {
      type: String,
      enum: Object.values(WRITING_TOPIC),
      required: true,
    },
    mode: {
      type: String,
      enum: Object.values(SLANG_HANG_MODE),
      default: SLANG_HANG_MODE.SINGLE_ROLE,
      required: true,
    },
    scenario: { type: String, required: true, trim: true },
    speakers: {
      type: [speakerSchema],
      validate: {
        validator: (arr) =>
          arr.length >= SLANG_HANG_LIMITS.MIN_SPEAKERS &&
          arr.length <= SLANG_HANG_LIMITS.MAX_SPEAKERS,
        message: "speakers must contain exactly 2 entries",
      },
    },
    messages: {
      type: [messageSchema],
      validate: [
        {
          validator: (arr) =>
            arr.length >= SLANG_HANG_LIMITS.MIN_MESSAGES &&
            arr.length <= SLANG_HANG_LIMITS.MAX_MESSAGES,
          message: `messages must be between ${SLANG_HANG_LIMITS.MIN_MESSAGES} and ${SLANG_HANG_LIMITS.MAX_MESSAGES}`,
        },
        {
          validator: (arr) => arr.length === 0 || arr[0].speakerKey === "A",
          message: "first message must be from speaker A",
        },
      ],
    },
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

dialogueSchema.index({ userId: 1, createdAt: -1 });

export const Dialogue = mongoose.model(
  "Dialogue",
  dialogueSchema,
  "dialogues",
);
