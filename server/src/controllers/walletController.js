import * as walletService from "@server/services/wallet/walletService";

export async function getCredits(req, res, next) {
  try {
    const balance = await walletService.getBalance(req.user.id);
    res.status(200).json({ success: true, data: balance });
  } catch (e) {
    next(e);
  }
}

function parseIntInRange(raw, fallback, min, max) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function listTransactions(req, res, next) {
  try {
    const out = await walletService.listTransactions(req.user.id, {
      page: parseIntInRange(req.query.page, 1, 1, Number.MAX_SAFE_INTEGER),
      limit: parseIntInRange(req.query.limit, 20, 1, 100),
      type: req.query.type,
    });
    res.status(200).json({ success: true, data: out });
  } catch (e) {
    next(e);
  }
}
