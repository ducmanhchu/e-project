import { env } from "@server/config/environment";
import { ApiError } from "@server/helpers/ApiError";
import { validateFields } from "@server/helpers/validateFields";
import User from "@server/models/user/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { TOKEN_LIFE } from "@server/const/auth";
import * as googleAuthProvider from "@server/services/auth/googleAuthProvider";
import * as walletService from "@server/services/wallet/walletService";

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

  if (!user.googleId && !user.isEmailVerified) {
    throw ApiError.forbidden(
      "Email is not verified. Please check your inbox or call /auth/resend-verification",
    );
  }

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

/**
 * Verify Google ID token, auto-create/auto-link user, issue JWT tokens.
 * @param {string} idToken
 * @returns {Promise<{ accessToken: string, refreshToken: string, isNewUser: boolean }>}
 */
export async function googleLogin(idToken) {
  const profile = await googleAuthProvider.verifyIdToken(idToken);

  if (!profile.emailVerified) {
    throw ApiError.unauthorized("Google email is not verified");
  }

  let user = await User.findOne({
    $or: [{ googleId: profile.googleId }, { email: profile.email }],
  });
  let isNewUser = false;

  if (!user) {
    try {
      user = await User.create({
        email: profile.email,
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl,
        googleId: profile.googleId,
        isEmailVerified: true,
      });
      isNewUser = true;
      walletService
        .grantSignupBonus(user._id)
        .catch((err) =>
          console.error("[googleLogin] grantSignupBonus failed:", err.message),
        );
    } catch (err) {
      if (err.code === 11000) {
        user = await User.findOne({
          $or: [{ googleId: profile.googleId }, { email: profile.email }],
        });
        if (!user) throw err;
      } else {
        throw err;
      }
    }
  } else if (!user.googleId) {
    user.googleId = profile.googleId;
    if (!user.avatarUrl && profile.avatarUrl) {
      user.avatarUrl = profile.avatarUrl;
    }
    if (!user.isEmailVerified) {
      // Local account was never email-verified → password may have been set by an attacker
      // who signed up with this email without mailbox access. Neutralize by clearing it.
      // Google has verified the email owner, so they become the sole authenticator.
      user.password = undefined;
      console.warn(
        `[auth] Auto-link Google to unverified local account ${user.email}; password cleared`,
      );
    }
    user.isEmailVerified = true;
    await user.save();
  } else if (user.googleId !== profile.googleId) {
    throw ApiError.conflict(
      "Account conflict: email is linked to a different Google account",
    );
  }

  const userInfo = { id: user.id, email: user.email, role: user.role };
  const accessToken = generateToken(userInfo, env.ACCESS_TOKEN_SECRET, TOKEN_LIFE.ACCESS);
  const refreshToken = generateToken(userInfo, env.REFRESH_TOKEN_SECRET, TOKEN_LIFE.REFRESH);

  return { accessToken, refreshToken, isNewUser };
}
