export function authMe(req, res, next) {
  try {
    res.status(200).json({ data: req.user, success: true });
  } catch (e) {
    next(e);
  }
}
