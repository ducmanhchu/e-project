import * as walletService from "@server/services/wallet/walletService";

export async function getCredits(req, res, next) {
  try {
    const balance = await walletService.getBalance(req.user.id);
    res.status(200).json({ success: true, data: balance });
  } catch (e) {
    next(e);
  }
}

export async function listTransactions(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, parseInt(req.query.limit || "20", 10));
    const type = req.query.type;
    const out = await walletService.listTransactions(req.user.id, {
      page,
      limit,
      type,
    });
    res.status(200).json({ success: true, data: out });
  } catch (e) {
    next(e);
  }
}
