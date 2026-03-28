import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { env } from "@server/config/environment.js";
import { ApiError } from "@server/helpers/ApiError";

export function protectedRoute(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) throw ApiError.unauthorized("Not authorized, no token found");

    jwt.verify(token, env.ACCESS_TOKEN_SECRET, async (err, decodedUser) => {
      if (err) return next(ApiError.forbidden("Invalid token"));

      const user = await User.findById(decodedUser.id).select("-password");
      if (!user) return next(ApiError.notFound("User not found"));

      req.user = user;
      next();
    });
  } catch (e) {
    next(e);
  }
}

export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden("Access denied, insufficient permissions"));
    }
    next();
  };
}
