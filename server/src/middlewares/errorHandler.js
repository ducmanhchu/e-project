import { ApiError } from "@server/helpers/ApiError";

// Express error handler — must have 4 params
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Custom ApiError — known, expected errors
  if (err instanceof ApiError) {
    return res
      .status(err.statusCode)
      .json({ success: false, error: err.message });
  }

  // Mongoose validation error → 400
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({ success: false, errors });
  }

  // Mongoose duplicate key → 409
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res
      .status(409)
      .json({ success: false, error: `${field} already exists` });
  }

  // JWT errors → 401
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res
      .status(401)
      .json({ success: false, error: "Invalid or expired token" });
  }

  // Unknown error → 500
  console.error(err);
  res.status(500).json({ success: false, error: "Internal server error" });
}

