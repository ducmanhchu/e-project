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
  const orig = await CreditTransaction.findById(transactionId);
  if (!orig) throw ApiError.notFound("Original transaction not found");

  const refundAmount = -orig.amount; // flip sign

  const updated = await User.findOneAndUpdate(
    { _id: orig.userId },
    { $inc: { credits: refundAmount } },
    { new: true },
  );

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
  const updated = await User.findOneAndUpdate(
    { _id: userId },
    { $inc: { credits: SIGNUP_BONUS_CREDITS } },
    { new: true },
  );
  return CreditTransaction.create({
    userId,
    type: TRANSACTION_TYPE.SIGNUP_BONUS,
    amount: SIGNUP_BONUS_CREDITS,
    reason: "signup bonus",
    balanceAfter: updated.credits,
  });
}

export async function grantPack(userId, order) {
  const { baseCredits, bonusPct } = order.productSnapshot;
  const amount = Math.round(baseCredits * (1 + bonusPct / 100));

  const updated = await User.findOneAndUpdate(
    { _id: userId },
    { $inc: { credits: amount } },
    { new: true },
  );

  return CreditTransaction.create({
    userId,
    type: TRANSACTION_TYPE.PURCHASE_PACK,
    amount,
    reason: `purchase pack ${order.productSnapshot.packId}`,
    referenceType: "PaymentOrder",
    referenceId: order._id,
    balanceAfter: updated.credits,
  });
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
