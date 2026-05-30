import * as progressService from "@server/services/progress/progressService";
import * as attemptHistoryService from "@server/services/progress/attemptHistoryService";

export async function getSummary(req, res, next) {
  try {
    const data = await progressService.getSummary(req.user._id);
    res.status(200).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function getAttemptHistory(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit || "20", 10) || 20),
    );
    const { items, total } = await attemptHistoryService.getAttemptHistory({
      userId: req.user._id,
      feature: req.query.feature,
      lessonType: req.query.lessonType,
      page,
      limit,
    });
    res.status(200).json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    next(e);
  }
}
