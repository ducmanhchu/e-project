import * as walletService from "@server/services/wallet/walletService";

/**
 * Wrap an async AI/DB action with a credit charge + refund-on-failure.
 * - Charges 1 credit BEFORE running fn (throws 402 if insufficient → fn never runs).
 * - If fn throws, refund best-effort and rethrow the ORIGINAL error (refund failure is logged, not masked).
 */
export async function chargeForSubmit(
  { userId, reason, referenceType = null, referenceId = null },
  fn,
) {
  const tx = await walletService.chargeSubmit(userId, {
    reason,
    referenceType,
    referenceId,
  });
  try {
    return await fn();
  } catch (err) {
    try {
      await walletService.refund(tx._id, {
        reason: `ai_call_failed: ${err.message}`,
      });
    } catch (refundErr) {
      console.error(
        `[chargeForSubmit] refund of tx ${tx._id} failed: ${refundErr.message}. ` +
          `Original error: ${err.message}`,
      );
    }
    throw err;
  }
}
