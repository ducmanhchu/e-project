import { OAuth2Client } from "google-auth-library";
import { ApiError } from "@server/helpers/ApiError";
import { env } from "@server/config/environment";

export async function verifyIdToken(idToken) {
  if (!idToken || typeof idToken !== "string") {
    throw ApiError.badRequest("idToken is required");
  }

  if (!env.GOOGLE_CLIENT_ID) {
    throw new ApiError(500, "Google auth not configured: GOOGLE_CLIENT_ID missing");
  }

  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
  } catch (err) {
    throw ApiError.unauthorized("Google ID token invalid or expired");
  }

  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw ApiError.unauthorized("Google token missing email");
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase().trim(),
    emailVerified: payload.email_verified === true,
    fullName: payload.name || payload.email.split("@")[0],
    avatarUrl: payload.picture || undefined,
  };
}
