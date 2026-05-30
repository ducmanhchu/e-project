import * as walletService from "@server/services/wallet/walletService";

/**
 * Charge 1 credit before running fn; refund + rethrow original error if fn throws.
 * Throws 402 if insufficient credits — fn never runs.
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
    await walletService
      .refund(tx._id, { reason: `ai_call_failed: ${err.message}` })
      .catch((rbErr) =>
        console.error(
          `[chargeForSubmit] refund of tx ${tx._id} failed: ${rbErr.message}. Original: ${err.message}`,
        ),
      );
    throw err;
  }
}
