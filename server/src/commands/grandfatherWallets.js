// Usage: pnpm dlx @babel/node server/src/commands/grandfatherWallets.js
import mongoose from "mongoose";
import { env } from "@server/config/environment";
import User from "@server/models/user/User";
import { CreditTransaction } from "@server/models/payment/CreditTransaction";
import * as walletService from "@server/services/wallet/walletService";
import { TRANSACTION_TYPE } from "@server/const/payment";

async function main() {
  await mongoose.connect(env.MONGODB_URI, { dbName: env.DATABASE_NAME });

  const users = await User.find().select("_id").lean();
  let granted = 0;
  let skipped = 0;

  for (const u of users) {
    const existing = await CreditTransaction.findOne({
      userId: u._id,
      type: TRANSACTION_TYPE.SIGNUP_BONUS,
    }).lean();
    if (existing) {
      skipped += 1;
      continue;
    }
    await walletService.grantSignupBonus(u._id);
    granted += 1;
    console.log(`granted ${u._id}`);
  }

  console.log(`\nDone. granted=${granted} skipped=${skipped}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
