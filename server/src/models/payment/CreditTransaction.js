import mongoose from "mongoose";
import { TRANSACTION_TYPE } from "@server/const/payment";

const creditTransactionSchema = new mongoose.Schema(
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
      enum: [
        ...Object.values(TRANSACTION_TYPE),
        // Legacy values kept for historical records (no longer generated).
        "charge_retry",
        "purchase_subscription",
        "subscription_expired",
      ],
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number },
    reason: { type: String, required: true },
    referenceType: {
      type: String,
      enum: ["PaymentOrder", "Attempt", "DialogueAttempt", null],
      default: null,
    },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true, versionKey: false },
);

creditTransactionSchema.index({ userId: 1, createdAt: -1 });

export const CreditTransaction = mongoose.model(
  "CreditTransaction",
  creditTransactionSchema,
  "creditTransactions",
);
