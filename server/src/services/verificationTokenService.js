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
    throw ApiError.badRequest("Invalid token");
  }

  const doc = await VerificationToken.findOne({ token: tokenStr, type });
  if (!doc) {
    throw ApiError.badRequest("Token not found or already used");
  }
  if (doc.expiresAt < new Date()) {
    await VerificationToken.deleteOne({ _id: doc._id });
    throw ApiError.badRequest("Token has expired. Please request a new one");
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
