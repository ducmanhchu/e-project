import { GoogleGenAI } from "@google/genai";
import path from "path";
import { env } from "./environment.js";

// Prod: load credentials from the env var (no secret file on disk).
// Local: fall back to the gitignored serviceAccount.json file.
const googleAuthOptions = env.GOOGLE_SERVICE_ACCOUNT_JSON
  ? { credentials: JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON) }
  : { keyFile: path.resolve("serviceAccount.json") };

export const genai = new GoogleGenAI({
  vertexai: true,
  project: env.VERTEX_PROJECT_ID,
  location: env.VERTEX_LOCATION,
  googleAuthOptions,
});
