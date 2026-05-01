import mongoose from "mongoose";
import { VERIFICATION_TOKEN_TYPE } from "@server/const/verificationToken";

const verificationTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(VERIFICATION_TOKEN_TYPE),
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    toJSON: {
      transform(_, ret) {
        delete ret._id;
      },
    },
  },
);

verificationTokenSchema.index({ userId: 1, type: 1 });
verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const VerificationToken = mongoose.model(
  "VerificationToken",
  verificationTokenSchema,
  "verificationTokens",
);

export default VerificationToken;
