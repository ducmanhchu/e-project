import { env } from "@server/config/environment";

/**
 * Sepay flow:
 *  - No "create" API call — we just generate a VietQR pointing at our bank account
 *    with `des` = `<prefix><orderCode>` so the bank statement carries the orderCode.
 *  - User scans + transfers via their banking app.
 *  - Sepay watches the bank account, sends webhook when matching credit appears.
 *
 * Webhook auth: Sepay sends `Authorization: Apikey <SEPAY_API_KEY>` header.
 */

function requireConfig() {
  if (!env.SEPAY_ACCOUNT_NUMBER || !env.SEPAY_BANK_CODE) {
    throw new Error("Sepay env vars not configured");
  }
}

export async function createPaymentLink({ orderCode, amount, description }) {
  requireConfig();
  const memo = `${env.SEPAY_ORDER_PREFIX}${orderCode}`;
  const qrUrl =
    `https://qr.sepay.vn/img?` +
    `acc=${encodeURIComponent(env.SEPAY_ACCOUNT_NUMBER)}` +
    `&bank=${encodeURIComponent(env.SEPAY_BANK_CODE)}` +
    `&amount=${encodeURIComponent(amount)}` +
    `&des=${encodeURIComponent(memo)}`;
  return {
    paymentLinkId: memo, // Sepay has no server-side link id; reuse memo for our records
    checkoutUrl: qrUrl, // Sepay has no hosted checkout — return the QR image URL
    qrCode: qrUrl,
    description,
  };
}

export function verifyWebhookSignature(_payload, headers) {
  if (!env.SEPAY_API_KEY) return false;
  const auth = headers?.authorization || headers?.Authorization;
  return auth === `Apikey ${env.SEPAY_API_KEY}`;
}

/**
 * Extract orderCode + paid status from Sepay webhook.
 * Sepay payload fields used: { content, transferType, transferAmount }
 * `content` carries the bank statement memo, which contains our prefix + orderCode.
 * @returns {{ orderCode: number|null, isPaid: boolean, amount: number|null }}
 */
export function parseWebhook(payload) {
  const content = String(payload?.content || "");
  const prefix = env.SEPAY_ORDER_PREFIX || "DH";

  // Find prefix anywhere in content (some banks add extra prefixes/suffixes).
  const idx = content.indexOf(prefix);
  if (idx === -1) return { orderCode: null, isPaid: false, amount: null };

  // Take consecutive digits right after the prefix.
  const match = content.slice(idx + prefix.length).match(/^(\d+)/);
  if (!match) return { orderCode: null, isPaid: false, amount: null };

  const orderCode = Number(match[1]);
  const amount = Number(payload?.transferAmount);
  // Sepay only fires for incoming credit; double-check transferType.
  const isPaid = payload?.transferType === "in";
  return {
    orderCode: Number.isFinite(orderCode) ? orderCode : null,
    isPaid,
    amount: Number.isFinite(amount) ? amount : null,
  };
}

// Sepay has no "get payment info" API — return null so callers can skip.
export async function getPaymentInfo(_paymentLinkId) {
  return null;
}
