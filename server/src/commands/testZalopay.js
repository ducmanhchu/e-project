// Usage: pnpm dlx @babel/node server/src/commands/testZalopay.js
import { createPaymentLink } from "@server/services/payment/zalopayProvider";

async function main() {
  // Random orderCode each run — ZaloPay rejects duplicate app_trans_id per day.
  const orderCode = Math.floor(Math.random() * 9_999_999_999);
  const out = await createPaymentLink({
    orderCode,
    amount: 10000,
    description: "Test pack tier1",
  });
  console.log("  orderCode    :", orderCode);
  console.log("ZaloPay createPaymentLink OK:");
  console.log("  paymentLinkId:", out.paymentLinkId);
  console.log("  checkoutUrl  :", out.checkoutUrl);
  console.log("  qrCode       :", String(out.qrCode).slice(0, 80), "...");
}

main().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
