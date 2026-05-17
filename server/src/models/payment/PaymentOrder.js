import mongoose from "mongoose";
import {
  PAYMENT_STATUS,
  PRODUCT_TYPE,
  PAYMENT_PROVIDER,
} from "@server/const/payment";

const paymentOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderCode: { type: Number, required: true, unique: true },
    provider: {
      type: String,
      enum: Object.values(PAYMENT_PROVIDER),
      default: PAYMENT_PROVIDER.PAYOS,
    },
    productType: {
      type: String,
      required: true,
      enum: Object.values(PRODUCT_TYPE),
    },
    productSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    payosPaymentLinkId: String,
    payosCheckoutUrl: String,
    payosQrCode: String,
    paidAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
    webhookRaw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true, versionKey: false },
);

paymentOrderSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const PaymentOrder = mongoose.model(
  "PaymentOrder",
  paymentOrderSchema,
  "paymentOrders",
);
