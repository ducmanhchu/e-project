import User from "@server/models/user/User";
import { ApiError } from "@server/helpers/ApiError";
import * as verificationTokenService from "@server/services/verificationTokenService";
import * as emailService from "@server/services/emailService";
import { VERIFICATION_TOKEN_TYPE } from "@server/const/verificationToken";

const TYPE = VERIFICATION_TOKEN_TYPE.EMAIL_VERIFY;

export async function createAndSendToken(user) {
  const { token } = await verificationTokenService.createToken(user.id, TYPE);

  emailService
    .sendVerificationEmail({ to: user.email, fullName: user.fullName, token })
    .catch((err) =>
      console.error("[email] sendVerificationEmail failed:", err.message),
    );
}

export async function verifyEmailByToken(tokenStr) {
  const { userId } = await verificationTokenService.consumeToken(tokenStr, TYPE);

  const user = await User.findById(userId);
  if (!user) throw ApiError.badRequest("User not found");

  user.isEmailVerified = true;
  await user.save();
  return user;
}

export async function resend(email) {
  const normalized = email?.toLowerCase().trim();
  const user = await User.findOne({ email: normalized });
  if (!user) return { silent: true };
  if (user.isEmailVerified) {
    throw ApiError.conflict("Email is already verified");
  }
  await createAndSendToken(user);
  return { silent: false };
}
