import { env } from "@server/config/environment";

/**
 * Sepay — no create API: we generate a VietQR pointing at our bank account
 * with memo `<prefix><orderCode>`. User transfers via any banking app; Sepay
 * watches the bank, sends webhook when matching credit appears.
 * Webhook auth: `Authorization: Apikey <SEPAY_API_KEY>` header.
 */

function requireConfig() {
  if (!env.SEPAY_ACCOUNT_NUMBER || !env.SEPAY_BANK_CODE) {
    throw new Error("Sepay env vars not configured");
  }
}

export async function createPaymentLink({ orderCode, amount }) {
  requireConfig();
  const memo = `${env.SEPAY_ORDER_PREFIX}${orderCode}`;
  const qrUrl =
    `https://qr.sepay.vn/img?` +
    `acc=${encodeURIComponent(env.SEPAY_ACCOUNT_NUMBER)}` +
    `&bank=${encodeURIComponent(env.SEPAY_BANK_CODE)}` +
    `&amount=${encodeURIComponent(amount)}` +
    `&des=${encodeURIComponent(memo)}`;
  return { checkoutUrl: qrUrl, qrCode: qrUrl };
}

export function verifyWebhookSignature(_payload, headers) {
  if (!env.SEPAY_API_KEY) return false;
  const auth = headers?.authorization || headers?.Authorization;
  return auth === `Apikey ${env.SEPAY_API_KEY}`;
}

/**
 * @returns {{ orderCode: number|null, isPaid: boolean, amount: number|null }}
 */
export function parseWebhook(payload) {
  const content = String(payload?.content || "");
  const prefix = env.SEPAY_ORDER_PREFIX || "DH";

  // Some banks prepend/append text — find prefix anywhere, take digits right after.
  const idx = content.indexOf(prefix);
  if (idx === -1) return { orderCode: null, isPaid: false, amount: null };
  const match = content.slice(idx + prefix.length).match(/^(\d+)/);
  if (!match) return { orderCode: null, isPaid: false, amount: null };

  const orderCode = Number(match[1]);
  const amount = Number(payload?.transferAmount);
  return {
    orderCode: Number.isFinite(orderCode) ? orderCode : null,
    // Sepay only fires for incoming credit; double-check transferType.
    isPaid: payload?.transferType === "in",
    amount: Number.isFinite(amount) ? amount : null,
  };
}
