import { env } from "@server/config/environment";
import { ApiError } from "@server/helpers/ApiError";
import { validateFields } from "@server/helpers/validateFields";
import User from "@server/models/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { TOKEN_LIFE } from "@server/const/auth";

/**
 * @param {Object} data
 * @returns {Object}
 */
export async function signIn(data) {
  const { email, password } = data;
  validateFields(data, ["email", "password"]);
  const user = await User.findOne({ email });
  const isValid = user && (await bcrypt.compare(password, user.password));
  if (!isValid) throw ApiError.unauthorized("Invalid email or password");

  const userInfo = { id: user.id, email: user.email, role: user.role };

  const accessToken = generateToken(userInfo, env.ACCESS_TOKEN_SECRET, TOKEN_LIFE.ACCESS);

  const refreshToken = generateToken(userInfo, env.REFRESH_TOKEN_SECRET, TOKEN_LIFE.REFRESH);

  return { accessToken, refreshToken };
}

/**
 * @param {Object} userInfo
 * @param {string} secretSignature
 * @param {string} tokenLife
 * @returns {string}
 */
export function generateToken(userInfo, secretSignature, tokenLife = TOKEN_LIFE.ACCESS) {
  return jwt.sign(userInfo, secretSignature, { expiresIn: tokenLife });
}

/**
 * @param {string} token
 * @param {string} secretSignature
 * @returns {Object}
 */
export function verifyToken(token, secretSignature) {
  return jwt.verify(token, secretSignature);
}

/**
 * @param {string} token
 * @returns
 */
export async function refreshToken(token) {
  if (!token) throw ApiError.unauthorized("Refresh token is required");

  const decoded = verifyToken(token, env.REFRESH_TOKEN_SECRET);

  const user = await User.findById(decoded.id);
  if (!user) throw ApiError.notFound("User not found");

  const userInfo = { id: user.id, email: user.email, role: user.role };

  const accessToken = generateToken(userInfo, env.ACCESS_TOKEN_SECRET, TOKEN_LIFE.ACCESS);

  return { accessToken };
}
