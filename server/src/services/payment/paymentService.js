import { PaymentOrder } from "@server/models/payment/PaymentOrder";
import {
  getProvider,
  getActiveProviderKey,
} from "@server/services/payment/providerSelector";
import * as walletService from "@server/services/wallet/walletService";
import { env } from "@server/config/environment";
import { ApiError } from "@server/helpers/ApiError";
import {
  PACK_DEFINITIONS,
  PAYMENT_ORDER_EXPIRY_MINUTES,
  PRODUCT_TYPE,
  PAYMENT_STATUS,
} from "@server/const/payment";

export function listPacks() {
  const packs = PACK_DEFINITIONS.map((p) => ({
    id: p.id,
    price: p.price,
    credits: Math.round(p.baseCredits * (1 + p.bonusPct / 100)),
    bonusPct: p.bonusPct,
  }));
  return {
    packs,
    activeProvider: getActiveProviderKey(),
  };
}

function generateOrderCode() {
  return (Date.now() * 7 + Math.floor(Math.random() * 7)) % 9_999_999_999;
}

const MAX_ORDER_CODE_RETRIES = 3;

async function createOrderWithRetry(payload) {
  for (let attempt = 0; attempt < MAX_ORDER_CODE_RETRIES; attempt++) {
    try {
      return await PaymentOrder.create(payload);
    } catch (err) {
      const isDup = err?.code === 11000;
      if (!isDup || attempt === MAX_ORDER_CODE_RETRIES - 1) throw err;
      payload.orderCode = generateOrderCode();
    }
  }
  throw new Error("createOrderWithRetry: exhausted retries");
}

async function persistAndCreateLink(order, { amount, description }) {
  const provider = getProvider(order.provider);
  const link = await provider.createPaymentLink({
    orderCode: order.orderCode,
    amount,
    description,
    returnUrl: env.PAYOS_RETURN_URL,
    cancelUrl: env.PAYOS_CANCEL_URL,
  });
  await PaymentOrder.findOneAndUpdate(
    { _id: order._id },
    {
      $set: {
        payosPaymentLinkId: link.paymentLinkId,
        payosCheckoutUrl: link.checkoutUrl,
        payosQrCode: link.qrCode,
      },
    },
  );
  return {
    orderCode: order.orderCode,
    checkoutUrl: link.checkoutUrl,
    qrCode: link.qrCode,
    provider: order.provider,
  };
}

export async function createCheckout(userId, packId) {
  const pack = PACK_DEFINITIONS.find((p) => p.id === packId);
  if (!pack) throw new ApiError(422, "INVALID_PACK");

  const providerKey = getActiveProviderKey();
  const expiresAt = new Date(Date.now() + PAYMENT_ORDER_EXPIRY_MINUTES * 60_000);

  const order = await createOrderWithRetry({
    userId,
    orderCode: generateOrderCode(),
    provider: providerKey,
    productType: PRODUCT_TYPE.PACK,
    productSnapshot: {
      packId: pack.id,
      price: pack.price,
      baseCredits: pack.baseCredits,
      bonusPct: pack.bonusPct,
    },
    status: PAYMENT_STATUS.PENDING,
    expiresAt,
  });

  const link = await persistAndCreateLink(order, {
    amount: pack.price,
    description: `Pack ${pack.id}`,
  });

  return { ...link, expiresAt };
}

export async function handleWebhook(providerKey, payload, headers) {
  const provider = getProvider(providerKey);

  if (!provider.verifyWebhookSignature(payload, headers)) {
    throw new ApiError(401, "INVALID_WEBHOOK_SIGNATURE");
  }

  const parsed = provider.parseWebhook(payload);
  if (!Number.isFinite(parsed.orderCode) || parsed.orderCode <= 0) {
    throw new ApiError(400, "MISSING_ORDER_CODE");
  }

  const order = await PaymentOrder.findOne({ orderCode: parsed.orderCode });
  if (!order) throw ApiError.notFound("ORDER_NOT_FOUND");

  if (order.status === PAYMENT_STATUS.PAID) {
    await PaymentOrder.findOneAndUpdate(
      { _id: order._id },
      { $set: { webhookRaw: payload } },
    );
    return { success: true, alreadyProcessed: true };
  }

  if (!parsed.isPaid) {
    await PaymentOrder.findOneAndUpdate(
      { _id: order._id },
      { $set: { status: PAYMENT_STATUS.CANCELLED, webhookRaw: payload } },
    );
    return { success: true };
  }

  // Amount validation (mainly for Sepay; PayOS confirms exact amount).
  const expectedAmount = order.productSnapshot.price;
  if (
    typeof parsed.amount === "number" &&
    typeof expectedAmount === "number" &&
    parsed.amount !== expectedAmount
  ) {
    await PaymentOrder.findOneAndUpdate(
      { _id: order._id },
      { $set: { status: PAYMENT_STATUS.CANCELLED, webhookRaw: payload } },
    );
    return {
      success: true,
      amountMismatch: true,
      expected: expectedAmount,
      received: parsed.amount,
    };
  }

  // Atomic CAS: only the request that transitions pending → paid grants.
  const claimed = await PaymentOrder.findOneAndUpdate(
    { _id: order._id, status: PAYMENT_STATUS.PENDING },
    {
      $set: {
        status: PAYMENT_STATUS.PAID,
        paidAt: new Date(),
        webhookRaw: payload,
      },
    },
    { new: true },
  );
  if (!claimed) {
    return { success: true, alreadyProcessed: true };
  }

  await walletService.grantPack(order.userId, order);
  return { success: true };
}

export async function getOrderStatus(userId, orderCode) {
  const order = await PaymentOrder.findOne({ userId, orderCode });
  if (!order) throw ApiError.notFound("ORDER_NOT_FOUND");

  let status = order.status;
  if (status === PAYMENT_STATUS.PENDING && order.expiresAt < new Date()) {
    await PaymentOrder.findOneAndUpdate(
      { _id: order._id },
      { $set: { status: PAYMENT_STATUS.EXPIRED } },
    );
    status = PAYMENT_STATUS.EXPIRED;
  }
  return {
    orderCode: order.orderCode,
    status,
    provider: order.provider,
    productType: order.productType,
    productSnapshot: order.productSnapshot,
    paidAt: order.paidAt,
    expiresAt: order.expiresAt,
  };
}
