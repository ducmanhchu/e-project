export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }

  // --- 4xx ---
  static badRequest(msg = "Bad request") {
    return new ApiError(400, msg);
  }

  static unauthorized(msg = "Unauthorized") {
    return new ApiError(401, msg);
  }

  static forbidden(msg = "Forbidden") {
    return new ApiError(403, msg);
  }

  static notFound(msg = "Not found") {
    return new ApiError(404, msg);
  }

  static conflict(msg = "Conflict") {
    return new ApiError(409, msg);
  }

  static tooMany(msg = "Too many requests") {
    return new ApiError(429, msg);
  }

  // --- 402 ---
  static paymentRequired(msg = "Payment required") {
    return new ApiError(402, msg);
  }
}
