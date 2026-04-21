import User from "@server/models/user/User";
import bcrypt from "bcrypt";
import { ApiError } from "@server/helpers/ApiError";
import * as verificationTokenService from "@server/services/verificationTokenService";
import * as emailService from "@server/services/emailService";
import { VERIFICATION_TOKEN_TYPE } from "@server/const/verificationToken";

const TYPE = VERIFICATION_TOKEN_TYPE.PASSWORD_RESET;
const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_SALT_ROUNDS = 10;

export async function requestPasswordReset(email) {
  const normalized = email?.toString().toLowerCase().trim();
  if (!normalized) throw ApiError.badRequest("Email thiếu");

  const user = await User.findOne({ email: normalized });
  if (!user) return { silent: true };

  const { token } = await verificationTokenService.createToken(user.id, TYPE);

  emailService
    .sendPasswordResetEmail({ to: user.email, fullName: user.fullName, token })
    .catch((err) =>
      console.error("[email] sendPasswordResetEmail failed:", err.message),
    );

  return { silent: false };
}

export async function resetPassword(tokenStr, newPassword) {
  validatePasswordStrength(newPassword);

  const { userId } = await verificationTokenService.consumeToken(tokenStr, TYPE);

  const user = await User.findById(userId);
  if (!user) throw ApiError.badRequest("User không tồn tại");

  user.password = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
  if (!user.isEmailVerified) {
    user.isEmailVerified = true;
  }
  await user.save();
  return user;
}

export async function changePassword(userId, oldPassword, newPassword) {
  validatePasswordStrength(newPassword);

  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User không tồn tại");
  if (!user.password) {
    throw ApiError.badRequest(
      "Account này chưa có password. Dùng /auth/forgot-password để set password",
    );
  }

  const valid = await bcrypt.compare(oldPassword, user.password);
  if (!valid) throw ApiError.unauthorized("Mật khẩu cũ không đúng");

  user.password = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
  await user.save();
}

function validatePasswordStrength(password) {
  if (!password || typeof password !== "string") {
    throw ApiError.badRequest("Password thiếu hoặc không hợp lệ");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw ApiError.badRequest(
      `Password phải ít nhất ${MIN_PASSWORD_LENGTH} ký tự`,
    );
  }
}
