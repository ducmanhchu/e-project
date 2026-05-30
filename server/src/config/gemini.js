import { GoogleGenAI } from "@google/genai";
import path from "path";
import { env } from "./environment.js";

export const genai = new GoogleGenAI({
  vertexai: true,
  project: env.VERTEX_PROJECT_ID,
  location: env.VERTEX_LOCATION,
  googleAuthOptions: {
    keyFile: path.resolve("serviceAccount.json"),
  },
});
