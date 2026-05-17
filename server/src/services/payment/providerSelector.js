import { env } from "@server/config/environment";
import { PAYMENT_PROVIDER } from "@server/const/payment";
import { ApiError } from "@server/helpers/ApiError";
import * as payosProvider from "@server/services/payment/payosProvider";
import * as sepayProvider from "@server/services/payment/sepayProvider";

const PROVIDERS = {
  [PAYMENT_PROVIDER.PAYOS]: payosProvider,
  [PAYMENT_PROVIDER.SEPAY]: sepayProvider,
};

/**
 * Get a payment provider module by key. Throws 400 ApiError if unknown
 * (key typically comes from a URL param, so misuse = client error).
 */
export function getProvider(key) {
  const provider = PROVIDERS[key];
  if (!provider) {
    throw new ApiError(
      400,
      `UNKNOWN_PROVIDER: "${key}". Use one of: ${Object.keys(PROVIDERS).join(", ")}`,
    );
  }
  return provider;
}

/**
 * Resolve the active provider key for new checkouts, from env.
 * Misconfigured env is a server error (500) — operator must fix.
 */
export function getActiveProviderKey() {
  const key = env.PAYMENT_PROVIDER;
  if (!PROVIDERS[key]) {
    throw new Error(
      `Invalid PAYMENT_PROVIDER env "${key}". Use one of: ${Object.keys(PROVIDERS).join(", ")}`,
    );
  }
  return key;
}
