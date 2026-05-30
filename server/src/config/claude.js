import Anthropic from "@anthropic-ai/sdk";
import { env } from "./environment.js";

export const claude = new Anthropic({
  apiKey: null,
  authToken: env.CLAUDE_API_KEY,
  defaultHeaders: {
    "anthropic-dangerous-direct-browser-access": "true",
    "anthropic-beta": "oauth-2025-04-20",
  },
});
