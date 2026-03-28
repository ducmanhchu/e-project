import "dotenv/config";

export const env = {
  MONGODB_URI: process.env.MONGODB_URI,
  DATABASE_NAME: process.env.DATABASE_NAME,
  LOCAL_PORT: process.env.LOCAL_PORT,
  LOCAL_HOST: process.env.LOCAL_HOST,
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
};
