import mongoose from "mongoose";
import { DECK_LIMITS } from "@server/const/deck";

const folderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: DECK_LIMITS.FOLDER_NAME_MAX,
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

folderSchema.index({ userId: 1, createdAt: -1 });

export const Folder = mongoose.model("Folder", folderSchema, "folders");
