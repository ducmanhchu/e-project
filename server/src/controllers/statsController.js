import * as statsService from "@server/services/stats/statsService";

export async function getOverview(req, res, next) {
  try {
    const data = await statsService.getOverview({
      groupBy: req.query.groupBy,
      from: req.query.from,
      to: req.query.to,
      allTime: req.query.allTime,
    });
    res.status(200).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
