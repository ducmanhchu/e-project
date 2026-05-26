// Usage: ORDER_CODE=<orderCode> [AMOUNT=10000] pnpm dlx @babel/node server/src/commands/simulateSepayIpn.js
// Fires a valid Sepay-shaped IPN to local webhook — bypasses real bank transfer.
import { env } from "@server/config/environment";

const orderCode = process.env.ORDER_CODE;
const amount = Number(process.env.AMOUNT || 10000);
const webhookUrl =
  process.env.WEBHOOK_URL ||
  `http://localhost:${env.LOCAL_PORT || 5004}/api/payments/webhook/sepay`;

if (!orderCode) {
  console.error("Set ORDER_CODE=<orderCode of a PENDING order>.");
  console.error("Tip: create an order via UI /wallet/packs, then copy orderCode from URL.");
  process.exit(1);
}

async function main() {
  const prefix = env.SEPAY_ORDER_PREFIX || "WW";
  const payload = {
    id: Date.now(),
    gateway: env.SEPAY_BANK_CODE || "TPB",
    transactionDate: new Date().toISOString(),
    accountNumber: env.SEPAY_ACCOUNT_NUMBER || "0000000000",
    code: null,
    content: `CT GD ${prefix}${orderCode}`,
    transferType: "in",
    transferAmount: amount,
    accumulated: 0,
    subAccount: null,
    referenceCode: `FT${Date.now()}`,
    description: `${prefix}${orderCode}`,
  };

  console.log(`POST ${webhookUrl}`);
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Apikey ${env.SEPAY_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  console.log(`Response [${res.status}]:`, text);

  if (res.status === 200) {
    console.log("\n✓ Server accepted IPN.");
    console.log(`Verify: curl /api/payments/orders/${orderCode}`);
    console.log("Expect: status=paid, creditsGranted=true.");
  } else {
    console.error("\n✗ Server rejected. Check server logs.");
  }
}

main().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
