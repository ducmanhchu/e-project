import "dotenv/config";

export const env = {
  MONGODB_URI: process.env.MONGODB_URI,
  DATABASE_NAME: process.env.DATABASE_NAME,
  LOCAL_PORT: process.env.LOCAL_PORT,
  LOCAL_HOST: process.env.LOCAL_HOST,
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  VERTEX_PROJECT_ID: process.env.VERTEX_PROJECT_ID,
  VERTEX_LOCATION: process.env.VERTEX_LOCATION,
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
  AI_PRIMARY_PROVIDER: process.env.AI_PRIMARY_PROVIDER || "claude",

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,

  GMAIL_USER: process.env.GMAIL_USER,
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || "English Platform",
  APP_URL: process.env.APP_URL || "http://localhost:5000",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",

  AZURE_SPEECH_KEY: process.env.AZURE_SPEECH_KEY,
  AZURE_SPEECH_REGION: process.env.AZURE_SPEECH_REGION,

  // Active payment provider for new checkouts: "sepay" | "momo"
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || "sepay",

  // Sepay (bank transfer via VietQR)
  SEPAY_API_KEY: process.env.SEPAY_API_KEY,            // for webhook auth header
  SEPAY_ACCOUNT_NUMBER: process.env.SEPAY_ACCOUNT_NUMBER, // receiving bank account
  SEPAY_BANK_CODE: process.env.SEPAY_BANK_CODE,        // e.g. "MB", "VCB", "TCB"
  SEPAY_ORDER_PREFIX: process.env.SEPAY_ORDER_PREFIX || "WW", // prefix for QR memo

  // MoMo (Capture Wallet — hosted checkout + IPN webhook)
  MOMO_PARTNER_CODE: process.env.MOMO_PARTNER_CODE,
  MOMO_ACCESS_KEY: process.env.MOMO_ACCESS_KEY,
  MOMO_SECRET_KEY: process.env.MOMO_SECRET_KEY,
  // Test: https://test-payment.momo.vn  | Prod: https://payment.momo.vn
  MOMO_ENDPOINT: process.env.MOMO_ENDPOINT || "https://test-payment.momo.vn",
  MOMO_REDIRECT_URL:
    process.env.MOMO_REDIRECT_URL ||
    `${process.env.FRONTEND_URL || "http://localhost:5173"}/wallet`,
  // IPN: server URL MoMo posts result to (use tunnel URL in dev)
  MOMO_IPN_URL: process.env.MOMO_IPN_URL,
};
