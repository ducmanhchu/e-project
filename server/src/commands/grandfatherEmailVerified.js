import "dotenv/config";
import mongoose from "mongoose";
import { CONNECT_DB } from "@server/config/mongodb";
import User from "@server/models/user/User";

async function run() {
  await CONNECT_DB();
  const result = await User.updateMany(
    { googleId: { $exists: false }, isEmailVerified: false },
    { $set: { isEmailVerified: true } },
  );
  console.log(
    `Grandfathered ${result.modifiedCount} local users as verified (matched: ${result.matchedCount})`,
  );
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
