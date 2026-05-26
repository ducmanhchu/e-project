const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Returns the Date corresponding to 00:00 Asia/Ho_Chi_Minh (+07) of the day
 * containing `date`. Vietnam has no DST; offset is fixed.
 */
export function startOfDayVN(date = new Date()) {
  const vnTime = new Date(date.getTime() + VN_OFFSET_MS);
  const startVnUtc =
    Date.UTC(
      vnTime.getUTCFullYear(),
      vnTime.getUTCMonth(),
      vnTime.getUTCDate(),
    ) - VN_OFFSET_MS;
  return new Date(startVnUtc);
}

/**
 * Returns "YYYY-MM-DD" of the VN calendar date containing `date`.
 * Used as a key for the unique partial index on CreditTransaction.checkinDate.
 */
export function checkinDateVN(date = new Date()) {
  const vnTime = new Date(date.getTime() + VN_OFFSET_MS);
  return vnTime.toISOString().slice(0, 10);
}
