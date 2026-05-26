import mongoose from "mongoose";
import { TRANSACTION_TYPE } from "@server/const/payment";

const creditTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(TRANSACTION_TYPE),
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number },
    reason: { type: String, required: true },
    referenceType: {
      type: String,
      enum: ["Order", "Attempt", "DialogueAttempt", null],
      default: null,
    },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    // CAS target in walletService.refund — null → now flips claim ownership.
    refundedAt: { type: Date, default: null },
    // "YYYY-MM-DD" in +07 — only set for DAILY_CHECKIN tx type. Key for the unique partial index below.
    checkinDate: { type: String, default: null },
  },
  { timestamps: true, versionKey: false },
);

creditTransactionSchema.index({ userId: 1, createdAt: -1 });
creditTransactionSchema.index({ userId: 1, type: 1, createdAt: -1 });

// DB-level idempotency: 1 PURCHASE_PACK per Order; 1 SIGNUP_BONUS per user.
creditTransactionSchema.index(
  { referenceType: 1, referenceId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      referenceType: "Order",
      type: TRANSACTION_TYPE.PURCHASE_PACK,
    },
  },
);
creditTransactionSchema.index(
  { userId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { type: TRANSACTION_TYPE.SIGNUP_BONUS },
  },
);

// DB-level idempotency for daily check-in: 1 tx per (userId, calendar day +07).
creditTransactionSchema.index(
  { userId: 1, type: 1, checkinDate: 1 },
  {
    unique: true,
    partialFilterExpression: { type: TRANSACTION_TYPE.DAILY_CHECKIN },
  },
);

export const CreditTransaction = mongoose.model(
  "CreditTransaction",
  creditTransactionSchema,
  "creditTransactions",
);
