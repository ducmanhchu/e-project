import { getPayOS } from "@server/config/payos";

export async function createPaymentLink({
  orderCode,
  amount,
  description,
  returnUrl,
  cancelUrl,
}) {
  const sdk = getPayOS();
  const res = await sdk.paymentRequests.create({
    orderCode,
    amount,
    description,
    returnUrl,
    cancelUrl,
  });
  return {
    paymentLinkId: res.paymentLinkId,
    checkoutUrl: res.checkoutUrl,
    qrCode: res.qrCode,
  };
}

export function verifyWebhookSignature(payload, _headers) {
  try {
    const sdk = getPayOS();
    sdk.webhooks.verify(payload);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract a uniform shape from PayOS webhook payload.
 * @returns {{ orderCode: number, isPaid: boolean, amount: number }}
 */
export function parseWebhook(payload) {
  const orderCode = Number(payload?.data?.orderCode);
  const amount = Number(payload?.data?.amount);
  const isPaid = payload?.code === "00";
  return {
    orderCode: Number.isFinite(orderCode) ? orderCode : null,
    isPaid,
    amount: Number.isFinite(amount) ? amount : null,
  };
}

export async function getPaymentInfo(paymentLinkId) {
  const sdk = getPayOS();
  return sdk.paymentRequests.get(paymentLinkId);
}
