import crypto from "crypto";
import VerificationToken from "@server/models/verificationToken/VerificationToken";
import { ApiError } from "@server/helpers/ApiError";
import {
  VERIFICATION_TOKEN_TTL_MS,
  VERIFICATION_TOKEN_BYTES,
} from "@server/const/verificationToken";

function generateTokenString() {
  return crypto.randomBytes(VERIFICATION_TOKEN_BYTES).toString("hex");
}

export async function createToken(userId, type) {
  const ttl = VERIFICATION_TOKEN_TTL_MS[type];
  if (!ttl) {
    throw new Error(`Unknown verification token type: ${type}`);
  }

  await VerificationToken.deleteMany({ userId, type });

  const token = generateTokenString();
  const doc = await VerificationToken.create({
    userId,
    type,
    token,
    expiresAt: new Date(Date.now() + ttl),
  });
  return doc;
}

export async function consumeToken(tokenStr, type) {
  if (!tokenStr || typeof tokenStr !== "string") {
    throw ApiError.badRequest("Token không hợp lệ");
  }

  const doc = await VerificationToken.findOne({ token: tokenStr, type });
  if (!doc) {
    throw ApiError.badRequest("Token không tồn tại hoặc đã được sử dụng");
  }
  if (doc.expiresAt < new Date()) {
    await VerificationToken.deleteOne({ _id: doc._id });
    throw ApiError.badRequest("Token đã hết hạn. Vui lòng yêu cầu gửi lại");
  }

  await VerificationToken.deleteOne({ _id: doc._id });
  return { userId: doc.userId };
}

export async function findActiveToken(userId, type) {
  return VerificationToken.findOne({
    userId,
    type,
    expiresAt: { $gt: new Date() },
  });
}
