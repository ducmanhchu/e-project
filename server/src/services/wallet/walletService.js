import User from "@server/models/user/User";
import { CreditTransaction } from "@server/models/payment/CreditTransaction";
import { ApiError } from "@server/helpers/ApiError";
import {
  TRANSACTION_TYPE,
  SUBMIT_COST,
  SIGNUP_BONUS_CREDITS,
} from "@server/const/payment";

export async function getBalance(userId) {
  const user = await User.findById(userId).select("credits");
  if (!user) throw ApiError.notFound("User not found");
  return { credits: user.credits };
}

/**
 * Atomic deduct 1 credit. Throws 402 INSUFFICIENT_CREDITS if balance < SUBMIT_COST.
 */
export async function chargeSubmit(
  userId,
  { reason, referenceType = null, referenceId = null },
) {
  const updated = await User.findOneAndUpdate(
    { _id: userId, credits: { $gte: SUBMIT_COST } },
    { $inc: { credits: -SUBMIT_COST } },
    { new: true },
  );

  if (!updated) throw ApiError.paymentRequired("INSUFFICIENT_CREDITS");

  return CreditTransaction.create({
    userId,
    type: TRANSACTION_TYPE.CHARGE_SUBMIT,
    amount: -SUBMIT_COST,
    reason,
    referenceType,
    referenceId,
    balanceAfter: updated.credits,
  });
}

export async function refund(transactionId, { reason }) {
  // Atomic claim: only the caller that flips refundedAt null→now proceeds.
  // This is the idempotency lock — concurrent or repeat calls return silently.
  const orig = await CreditTransaction.findOneAndUpdate(
    { _id: transactionId, refundedAt: null },
    { $set: { refundedAt: new Date() } },
  );
  if (!orig) {
    const exists = await CreditTransaction.exists({ _id: transactionId });
    if (!exists) throw ApiError.notFound("Original transaction not found");
    return null; // already refunded by a prior call
  }

  const refundAmount = -orig.amount;

  const updated = await User.findOneAndUpdate(
    { _id: orig.userId },
    { $inc: { credits: refundAmount } },
    { new: true },
  );
  if (!updated) {
    // User vanished — release the claim so an admin recovery script can retry.
    await CreditTransaction.updateOne(
      { _id: transactionId },
      { $set: { refundedAt: null } },
    ).catch(() => {});
    throw ApiError.notFound("User not found");
  }

  return CreditTransaction.create({
    userId: orig.userId,
    type: TRANSACTION_TYPE.REFUND_AI_FAIL,
    amount: refundAmount,
    reason,
    referenceType: orig.referenceType,
    referenceId: orig.referenceId,
    balanceAfter: updated.credits,
  });
}

export async function grantSignupBonus(userId) {
  // Fast-path idempotency guard.
  const existing = await CreditTransaction.findOne({
    userId,
    type: TRANSACTION_TYPE.SIGNUP_BONUS,
  });
  if (existing) return existing;

  const updated = await User.findOneAndUpdate(
    { _id: userId },
    { $inc: { credits: SIGNUP_BONUS_CREDITS } },
    { new: true },
  );
  if (!updated) throw ApiError.notFound("User not found");

  try {
    return await CreditTransaction.create({
      userId,
      type: TRANSACTION_TYPE.SIGNUP_BONUS,
      amount: SIGNUP_BONUS_CREDITS,
      reason: "signup bonus",
      balanceAfter: updated.credits,
    });
  } catch (err) {
    // Roll back $inc — any error after $inc means the audit row is missing,
    // so the credit grant must be undone to keep balance/log consistent.
    await User.updateOne(
      { _id: userId },
      { $inc: { credits: -SIGNUP_BONUS_CREDITS } },
    ).catch((rbErr) =>
      console.error(
        `[grantSignupBonus] rollback failed for user ${userId}: ${rbErr.message}. Original: ${err.message}`,
      ),
    );
    // Dup-key (race lost): the other caller already granted — return their row.
    if (err?.code === 11000) {
      return CreditTransaction.findOne({
        userId,
        type: TRANSACTION_TYPE.SIGNUP_BONUS,
      });
    }
    throw err;
  }
}

export async function grantPack(userId, order) {
  // Fast-path idempotency guard. Primary lock is order.creditsGranted CAS in
  // paymentService; the unique partial index on CreditTransaction
  // (referenceType, referenceId, type) is the final backstop.
  const existing = await CreditTransaction.findOne({
    referenceType: "Order",
    referenceId: order._id,
    type: TRANSACTION_TYPE.PURCHASE_PACK,
  });
  if (existing) return existing;

  const { baseCredits, bonusPct } = order.packSnapshot;
  const amount = Math.round(baseCredits * (1 + bonusPct / 100));

  const updated = await User.findOneAndUpdate(
    { _id: userId },
    { $inc: { credits: amount } },
    { new: true },
  );
  if (!updated) throw ApiError.notFound("User not found");

  try {
    return await CreditTransaction.create({
      userId,
      type: TRANSACTION_TYPE.PURCHASE_PACK,
      amount,
      reason: `purchase pack ${order.packSnapshot.packId}`,
      referenceType: "Order",
      referenceId: order._id,
      balanceAfter: updated.credits,
    });
  } catch (err) {
    // Roll back $inc — any error after $inc means the audit row is missing,
    // so the credit grant must be undone to keep balance/log consistent.
    await User.updateOne(
      { _id: userId },
      { $inc: { credits: -amount } },
    ).catch((rbErr) =>
      console.error(
        `[grantPack] rollback failed for user ${userId}: ${rbErr.message}. Original: ${err.message}`,
      ),
    );
    // Dup-key (race lost): the other caller already granted — return their row.
    if (err?.code === 11000) {
      return CreditTransaction.findOne({
        referenceType: "Order",
        referenceId: order._id,
        type: TRANSACTION_TYPE.PURCHASE_PACK,
      });
    }
    throw err;
  }
}

export async function listTransactions(
  userId,
  { page = 1, limit = 20, type } = {},
) {
  const filter = { userId, ...(type ? { type } : {}) };
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    CreditTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CreditTransaction.countDocuments(filter),
  ]);
  return { items, page, limit, total };
}
