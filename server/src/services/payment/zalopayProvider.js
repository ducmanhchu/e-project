import crypto from "crypto";
import { env } from "@server/config/environment";

/**
 * ZaloPay Gateway v2 — hosted checkout page + QR + IPN callback.
 * Docs: https://docs.zalopay.vn/docs/specs/order-create
 *       https://docs.zalopay.vn/docs/developer-tools/knowledge-base/callback
 */

const CREATE_PATH = "/v2/create";

function requireConfig() {
  if (
    !env.ZALOPAY_APP_ID ||
    !env.ZALOPAY_KEY1 ||
    !env.ZALOPAY_KEY2 ||
    !env.ZALOPAY_CALLBACK_URL
  ) {
    throw new Error("ZaloPay env vars not configured");
  }
}

function hmac(key, data) {
  return crypto.createHmac("sha256", key).update(data).digest("hex");
}

function generateAppTransId(orderCode) {
  // ZaloPay requires format YYMMDD_<unique>; we suffix orderCode for parse-back.
  const d = new Date();
  const yymmdd =
    String(d.getFullYear() % 100).padStart(2, "0") +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  return `${yymmdd}_${orderCode}`;
}

export async function createPaymentLink({ orderCode, amount, description }) {
  requireConfig();

  const appId = env.ZALOPAY_APP_ID;
  const appTransId = generateAppTransId(orderCode);
  const appUser = "wordwise";
  const appTime = Date.now();
  const embedData = JSON.stringify({});
  const item = JSON.stringify([]);

  // MAC input: app_id|app_trans_id|app_user|amount|app_time|embed_data|item
  const macInput = `${appId}|${appTransId}|${appUser}|${amount}|${appTime}|${embedData}|${item}`;

  const body = {
    app_id: Number(appId),
    app_user: appUser,
    app_trans_id: appTransId,
    app_time: appTime,
    amount,
    description: description || `Order ${orderCode}`,
    item,
    embed_data: embedData,
    mac: hmac(env.ZALOPAY_KEY1, macInput),
    callback_url: env.ZALOPAY_CALLBACK_URL,
  };

  const res = await fetch(`${env.ZALOPAY_ENDPOINT}${CREATE_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.return_code !== 1) {
    throw new Error(
      `ZaloPay create failed [${data.return_code}/${data.sub_return_code ?? "-"}]: ${data.return_message || data.sub_return_message || "unknown"}`,
    );
  }

  return { checkoutUrl: data.order_url, qrCode: data.qr_code };
}

export function verifyWebhookSignature(payload, _headers) {
  if (!env.ZALOPAY_KEY2 || !payload?.data || !payload?.mac) return false;
  try {
    const expected = hmac(env.ZALOPAY_KEY2, payload.data);
    const actual = String(payload.mac);
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
  } catch {
    return false;
  }
}

/**
 * ZaloPay callback only fires for successful payments — isPaid always true
 * when signature verifies. Failed/cancelled txs never call back.
 * @returns {{ orderCode: number|null, isPaid: boolean, amount: number|null }}
 */
export function parseWebhook(payload) {
  try {
    const data = JSON.parse(payload.data);
    // app_trans_id = "YYMMDD_<orderCode>"
    const orderCode = Number(String(data.app_trans_id).split("_")[1]);
    const amount = Number(data.amount);
    return {
      orderCode: Number.isFinite(orderCode) ? orderCode : null,
      isPaid: true,
      amount: Number.isFinite(amount) ? amount : null,
    };
  } catch {
    return { orderCode: null, isPaid: false, amount: null };
  }
}

/**
 * ZaloPay expects { return_code: 1|2, return_message: string }.
 * Other shapes trigger retry up to 3× / few minutes.
 */
export function formatWebhookResponse(handlerResult, error) {
  if (error) {
    return { return_code: 2, return_message: error.message || "error" };
  }
  return { return_code: 1, return_message: "success" };
}
