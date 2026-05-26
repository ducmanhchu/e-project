import { Order } from "@server/models/payment/Order";
import {
  getProvider,
  getActiveProviderKey,
} from "@server/services/payment/providerSelector";
import * as walletService from "@server/services/wallet/walletService";
import { ApiError } from "@server/helpers/ApiError";
import {
  PACK_DEFINITIONS,
  PAYMENT_ORDER_EXPIRY_MINUTES,
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
      return await Order.create(payload);
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
  });
  await Order.findOneAndUpdate(
    { _id: order._id },
    { $set: { checkoutUrl: link.checkoutUrl, qrCode: link.qrCode } },
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
    packSnapshot: {
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
    // Return 200 — provider test pings + memo-less transfers shouldn't trigger retries.
    console.warn(
      `[webhook:${providerKey}] no orderCode in payload, ignoring. Raw:`,
      JSON.stringify(payload).slice(0, 300),
    );
    return { success: true, ignored: "MISSING_ORDER_CODE" };
  }

  const order = await Order.findOne({ orderCode: parsed.orderCode });
  if (!order) {
    console.warn(
      `[webhook:${providerKey}] order ${parsed.orderCode} not found, ignoring.`,
    );
    return { success: true, ignored: "ORDER_NOT_FOUND" };
  }

  if (order.status === PAYMENT_STATUS.PAID) {
    await Order.findOneAndUpdate(
      { _id: order._id },
      { $set: { webhookRaw: payload } },
    );
    // Self-heal: covers prior delivery that flipped PAID but crashed before grant.
    await ensureCreditsGranted(order._id);
    return { success: true, alreadyProcessed: true };
  }

  // Filter status:PENDING on writes below so a late callback can't overwrite a
  // successful PAID set by a concurrent webhook.
  if (!parsed.isPaid) {
    const cancelled = await Order.findOneAndUpdate(
      { _id: order._id, status: PAYMENT_STATUS.PENDING },
      { $set: { status: PAYMENT_STATUS.CANCELLED, webhookRaw: payload } },
    );
    if (!cancelled) return { success: true, alreadyProcessed: true };
    return { success: true };
  }

  const expectedAmount = order.packSnapshot.price;
  if (
    typeof parsed.amount === "number" &&
    typeof expectedAmount === "number" &&
    parsed.amount !== expectedAmount
  ) {
    const cancelled = await Order.findOneAndUpdate(
      { _id: order._id, status: PAYMENT_STATUS.PENDING },
      { $set: { status: PAYMENT_STATUS.CANCELLED, webhookRaw: payload } },
    );
    if (!cancelled) return { success: true, alreadyProcessed: true };
    return {
      success: true,
      amountMismatch: true,
      expected: expectedAmount,
      received: parsed.amount,
    };
  }

  // CAS pending → paid; only the winning request grants.
  const claimed = await Order.findOneAndUpdate(
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
  if (!claimed) return { success: true, alreadyProcessed: true };

  await ensureCreditsGranted(claimed._id);
  return { success: true };
}

/**
 * CAS on `creditsGranted` to claim grant exactly once across concurrent retries.
 * Rolls back the flag on failure so subsequent retries can recover.
 */
async function ensureCreditsGranted(orderId) {
  const claimed = await Order.findOneAndUpdate(
    {
      _id: orderId,
      status: PAYMENT_STATUS.PAID,
      creditsGranted: { $ne: true },
    },
    { $set: { creditsGranted: true } },
    { new: true },
  );
  if (!claimed) return;

  try {
    await walletService.grantPack(claimed.userId, claimed);
  } catch (err) {
    await Order.updateOne(
      { _id: orderId },
      { $set: { creditsGranted: false } },
    ).catch((rbErr) =>
      console.error(
        `[ensureCreditsGranted] rollback failed for order ${orderId}: ${rbErr.message}. Original: ${err.message}`,
      ),
    );
    throw err;
  }
}

export async function getOrderStatus(userId, orderCode) {
  let order = await Order.findOne({ userId, orderCode });
  if (!order) throw ApiError.notFound("ORDER_NOT_FOUND");

  if (order.status === PAYMENT_STATUS.PENDING && order.expiresAt < new Date()) {
    // Filter status:PENDING so a racing webhook can't have PAID overwritten.
    const expired = await Order.findOneAndUpdate(
      { _id: order._id, status: PAYMENT_STATUS.PENDING },
      { $set: { status: PAYMENT_STATUS.EXPIRED } },
      { new: true },
    );
    order = expired || (await Order.findById(order._id));
  }
  return {
    orderCode: order.orderCode,
    status: order.status,
    provider: order.provider,
    packSnapshot: order.packSnapshot,
    paidAt: order.paidAt,
    expiresAt: order.expiresAt,
    checkoutUrl: order.checkoutUrl,
    qrCode: order.qrCode,
  };
}
