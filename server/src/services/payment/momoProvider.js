import crypto from "crypto";
import { env } from "@server/config/environment";

/**
 * MoMo "Capture Wallet" — hosted-checkout flow.
 *  - Server POSTs to MoMo /v2/gateway/api/create with HMAC-SHA256 signed body.
 *  - Response includes payUrl (hosted page), qrCodeUrl (raw QR data), deeplink.
 *  - Client redirects user to payUrl. After payment, MoMo POSTs IPN to our webhook
 *    with another HMAC-SHA256 signature for verification.
 *
 * Docs: https://developers.momo.vn/v3/docs/payment/api/wallet/onetime
 */

const CREATE_PATH = "/v2/gateway/api/create";

function requireConfig() {
  if (
    !env.MOMO_PARTNER_CODE ||
    !env.MOMO_ACCESS_KEY ||
    !env.MOMO_SECRET_KEY ||
    !env.MOMO_IPN_URL
  ) {
    throw new Error("MoMo env vars not configured");
  }
}

function sign(rawSignature) {
  return crypto
    .createHmac("sha256", env.MOMO_SECRET_KEY)
    .update(rawSignature)
    .digest("hex");
}

export async function createPaymentLink({ orderCode, amount, description }) {
  requireConfig();

  const partnerCode = env.MOMO_PARTNER_CODE;
  const accessKey = env.MOMO_ACCESS_KEY;
  const orderId = String(orderCode);
  // MoMo requires unique requestId per call — suffix with timestamp for retry safety
  const requestId = `${orderCode}-${Date.now()}`;
  const orderInfo = description || `Order ${orderCode}`;
  const redirectUrl = env.MOMO_REDIRECT_URL;
  const ipnUrl = env.MOMO_IPN_URL;
  const extraData = "";
  const requestType = "captureWallet";

  // Sign fields in alphabetical order — exact format from MoMo docs.
  const rawSignature =
    `accessKey=${accessKey}` +
    `&amount=${amount}` +
    `&extraData=${extraData}` +
    `&ipnUrl=${ipnUrl}` +
    `&orderId=${orderId}` +
    `&orderInfo=${orderInfo}` +
    `&partnerCode=${partnerCode}` +
    `&redirectUrl=${redirectUrl}` +
    `&requestId=${requestId}` +
    `&requestType=${requestType}`;

  const body = {
    partnerCode,
    accessKey,
    requestId,
    amount: String(amount),
    orderId,
    orderInfo,
    redirectUrl,
    ipnUrl,
    extraData,
    requestType,
    signature: sign(rawSignature),
    lang: "vi",
  };

  const res = await fetch(`${env.MOMO_ENDPOINT}${CREATE_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.resultCode !== 0) {
    throw new Error(
      `MoMo create failed [${data.resultCode}]: ${data.message || "unknown"}`,
    );
  }

  return {
    // requestId is MoMo's idempotency key — store for later API queries
    paymentLinkId: requestId,
    // Hosted payment page user opens to pay
    checkoutUrl: data.payUrl,
    // Raw QR data (not an image URL) — client can render via QR lib if needed
    qrCode: data.qrCodeUrl,
  };
}

export function verifyWebhookSignature(payload, _headers) {
  if (!env.MOMO_SECRET_KEY || !env.MOMO_ACCESS_KEY) return false;

  // IPN signature includes 13 fields, alphabetically ordered.
  const rawSignature =
    `accessKey=${env.MOMO_ACCESS_KEY}` +
    `&amount=${payload?.amount ?? ""}` +
    `&extraData=${payload?.extraData ?? ""}` +
    `&message=${payload?.message ?? ""}` +
    `&orderId=${payload?.orderId ?? ""}` +
    `&orderInfo=${payload?.orderInfo ?? ""}` +
    `&orderType=${payload?.orderType ?? ""}` +
    `&partnerCode=${payload?.partnerCode ?? ""}` +
    `&payType=${payload?.payType ?? ""}` +
    `&requestId=${payload?.requestId ?? ""}` +
    `&responseTime=${payload?.responseTime ?? ""}` +
    `&resultCode=${payload?.resultCode ?? ""}` +
    `&transId=${payload?.transId ?? ""}`;

  const expected = sign(rawSignature);
  const actual = String(payload?.signature || "");
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

/**
 * @returns {{ orderCode: number|null, isPaid: boolean, amount: number|null }}
 */
export function parseWebhook(payload) {
  const orderCode = Number(payload?.orderId);
  const amount = Number(payload?.amount);
  // MoMo: resultCode 0 = success, others = various failure/pending states
  const isPaid = payload?.resultCode === 0;
  return {
    orderCode: Number.isFinite(orderCode) ? orderCode : null,
    isPaid,
    amount: Number.isFinite(amount) ? amount : null,
  };
}
