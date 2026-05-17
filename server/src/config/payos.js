import { PayOS } from "@payos/node";
import { env } from "@server/config/environment";

let instance = null;

export function getPayOS() {
  if (instance) return instance;
  if (!env.PAYOS_CLIENT_ID || !env.PAYOS_API_KEY || !env.PAYOS_CHECKSUM_KEY) {
    throw new Error("PayOS env vars not configured");
  }
  instance = new PayOS({
    clientId: env.PAYOS_CLIENT_ID,
    apiKey: env.PAYOS_API_KEY,
    checksumKey: env.PAYOS_CHECKSUM_KEY,
  });
  return instance;
}
