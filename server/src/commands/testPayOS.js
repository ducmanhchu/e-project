// Usage: TEST_USER_ID=<userId> pnpm dlx @babel/node server/src/commands/testPayOS.js
import mongoose from "mongoose";
import { env } from "@server/config/environment";
import * as paymentService from "@server/services/payment/paymentService";

const TEST_USER_ID = process.env.TEST_USER_ID;
if (!TEST_USER_ID) {
  console.error("Set TEST_USER_ID=<existing user _id> before running.");
  process.exit(1);
}

async function main() {
  await mongoose.connect(env.MONGODB_URI, { dbName: env.DATABASE_NAME });

  const out = await paymentService.createCheckout(TEST_USER_ID, "tier1");
  console.log("Checkout created:");
  console.log("  orderCode:", out.orderCode);
  console.log("  checkoutUrl:", out.checkoutUrl);
  console.log(
    "  qrCode (truncated):",
    String(out.qrCode).slice(0, 60),
    "...",
  );
  console.log(
    "\nScan the QR or open checkoutUrl in browser, complete payment in PayOS sandbox.",
  );
  console.log(
    "Then poll: curl /api/payments/orders/" + out.orderCode,
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
