import mongoose from "mongoose";
import { env } from "@server/config/environment";
import { Attempt } from "@server/models/attempt/Attempt";
import { Submission } from "@server/models/attempt/Submission";

const BATCH_SIZE = 500;

async function flush(items) {
  const ops = items.map(({ _id, userId }) => ({
    updateMany: {
      filter: { attemptId: _id, userId: { $exists: false } },
      update: { $set: { userId } },
    },
  }));
  const res = await Submission.bulkWrite(ops, { ordered: false });
  return res.modifiedCount ?? 0;
}

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("[backfill] connected");

  const cursor = Attempt.find({}, { _id: 1, userId: 1 }).lean().cursor();
  let batch = [];
  let totalAttempts = 0;
  let totalUpdated = 0;

  for await (const attempt of cursor) {
    batch.push(attempt);
    if (batch.length >= BATCH_SIZE) {
      totalUpdated += await flush(batch);
      totalAttempts += batch.length;
      console.log(
        `[backfill] attempts=${totalAttempts} submissions_updated=${totalUpdated}`,
      );
      batch = [];
    }
  }
  if (batch.length) {
    totalUpdated += await flush(batch);
    totalAttempts += batch.length;
  }

  console.log(
    `[backfill] DONE attempts=${totalAttempts} submissions_updated=${totalUpdated}`,
  );
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("[backfill] FAILED:", err);
  process.exit(1);
});
