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
 * Atomic -1 credit. Throws 402 INSUFFICIENT_CREDITS if balance < SUBMIT_COST.
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
  // CAS on refundedAt — only the first caller proceeds; repeats return null.
  const orig = await CreditTransaction.findOneAndUpdate(
    { _id: transactionId, refundedAt: null },
    { $set: { refundedAt: new Date() } },
  );
  if (!orig) {
    const exists = await CreditTransaction.exists({ _id: transactionId });
    if (!exists) throw ApiError.notFound("Original transaction not found");
    return null;
  }

  const refundAmount = -orig.amount;
  const updated = await User.findOneAndUpdate(
    { _id: orig.userId },
    { $inc: { credits: refundAmount } },
    { new: true },
  );
  if (!updated) {
    // Release claim so a recovery script can retry.
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
  const lookup = { userId, type: TRANSACTION_TYPE.SIGNUP_BONUS };
  const existing = await CreditTransaction.findOne(lookup);
  if (existing) return existing;

  const updated = await User.findOneAndUpdate(
    { _id: userId },
    { $inc: { credits: SIGNUP_BONUS_CREDITS } },
    { new: true },
  );
  if (!updated) throw ApiError.notFound("User not found");

  try {
    return await CreditTransaction.create({
      ...lookup,
      amount: SIGNUP_BONUS_CREDITS,
      reason: "signup bonus",
      balanceAfter: updated.credits,
    });
  } catch (err) {
    // Roll back $inc to keep balance/audit consistent regardless of error type.
    await User.updateOne(
      { _id: userId },
      { $inc: { credits: -SIGNUP_BONUS_CREDITS } },
    ).catch((rbErr) =>
      console.error(
        `[grantSignupBonus] rollback failed for user ${userId}: ${rbErr.message}. Original: ${err.message}`,
      ),
    );
    // Dup-key: race lost, the other caller already granted.
    if (err?.code === 11000) return CreditTransaction.findOne(lookup);
    throw err;
  }
}

export async function grantPack(userId, order) {
  // Defense-in-depth on top of order.creditsGranted CAS + unique partial index.
  const lookup = {
    referenceType: "Order",
    referenceId: order._id,
    type: TRANSACTION_TYPE.PURCHASE_PACK,
  };
  const existing = await CreditTransaction.findOne(lookup);
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
      ...lookup,
      userId,
      amount,
      reason: `purchase pack ${order.packSnapshot.packId}`,
      balanceAfter: updated.credits,
    });
  } catch (err) {
    await User.updateOne(
      { _id: userId },
      { $inc: { credits: -amount } },
    ).catch((rbErr) =>
      console.error(
        `[grantPack] rollback failed for user ${userId}: ${rbErr.message}. Original: ${err.message}`,
      ),
    );
    if (err?.code === 11000) return CreditTransaction.findOne(lookup);
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
