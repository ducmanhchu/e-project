import mongoose from "mongoose";
import { PAYMENT_STATUS, PAYMENT_PROVIDER } from "@server/const/payment";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderCode: { type: Number, required: true, unique: true },
    // Immutable copy of the pack at checkout time: { packId, price, baseCredits, bonusPct }.
    packSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      validate: {
        validator: (v) =>
          v &&
          typeof v.packId === "string" &&
          typeof v.price === "number" &&
          typeof v.baseCredits === "number" &&
          typeof v.bonusPct === "number",
        message: "packSnapshot must include packId, price, baseCredits, bonusPct",
      },
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    paidAt: { type: Date, default: null },
    // CAS target in paymentService.ensureCreditsGranted — prevents double-grant.
    creditsGranted: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
    provider: {
      type: String,
      enum: Object.values(PAYMENT_PROVIDER),
      required: true,
    },
    checkoutUrl: String,
    qrCode: String,
    webhookRaw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true, versionKey: false },
);

orderSchema.index({ userId: 1, status: 1, createdAt: -1 });

// Reconciliation: scan PAID orders whose grant crashed before completion.
orderSchema.index(
  { paidAt: 1 },
  {
    partialFilterExpression: {
      status: PAYMENT_STATUS.PAID,
      creditsGranted: false,
    },
  },
);

export const Order = mongoose.model("Order", orderSchema, "orders");
