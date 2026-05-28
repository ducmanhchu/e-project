import * as progressService from "@server/services/progress/progressService";
import * as recentScoresService from "@server/services/progress/recentScoresService";
import * as attemptHistoryService from "@server/services/progress/attemptHistoryService";

export async function getSummary(req, res, next) {
  try {
    const data = await progressService.getSummary(req.user._id);
    res.status(200).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function getRecentScores(req, res, next) {
  try {
    const data = await recentScoresService.getRecentScores({
      userId: req.user._id,
      n: req.query.n,
    });
    res.status(200).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function getAttemptHistory(req, res, next) {
  try {
    const data = await attemptHistoryService.getAttemptHistory({
      userId: req.user._id,
      feature: req.query.feature,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.status(200).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
