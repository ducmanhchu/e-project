// Usage: TEST_USER_ID=<userId> pnpm dlx @babel/node server/src/commands/testMomo.js
import mongoose from "mongoose";
import { env } from "@server/config/environment";
import * as paymentService from "@server/services/payment/paymentService";

const TEST_USER_ID = process.env.TEST_USER_ID;
if (!TEST_USER_ID) {
  console.error("Set TEST_USER_ID=<existing user _id> before running.");
  process.exit(1);
}

async function main() {
  if (env.PAYMENT_PROVIDER !== "momo") {
    console.warn(
      `Note: PAYMENT_PROVIDER=${env.PAYMENT_PROVIDER}. Smoke test still runs but checkout will go to that provider.`,
    );
  }

  await mongoose.connect(env.MONGODB_URI, { dbName: env.DATABASE_NAME });

  const out = await paymentService.createCheckout(TEST_USER_ID, "tier1");
  console.log("Checkout created:");
  console.log("  orderCode:", out.orderCode);
  console.log("  provider :", out.provider);
  console.log("  payUrl   :", out.checkoutUrl);
  console.log("  qrData   :", String(out.qrCode).slice(0, 80), "...");
  console.log("");
  console.log("Open payUrl in browser, log in MoMo test account, pay.");
  console.log(
    "MoMo will POST IPN to MOMO_IPN_URL — check server logs for [webhook:momo].",
  );
  console.log(`Poll: curl /api/payments/orders/${out.orderCode}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
