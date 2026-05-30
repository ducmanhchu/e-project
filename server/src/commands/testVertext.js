/**
 * Test kết nối Vertex AI với @google/genai SDK
 *
 * Cách chạy: npx babel-node src/commands/testVertext.js
 */

import { GoogleGenAI } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

// --- Cấu hình Vertex AI ---
const PROJECT_ID = "project-0bcb09cb-1412-4012-ad1";
const LOCATION = "asia-southeast1";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVICE_ACCOUNT_PATH = path.resolve(
  __dirname,
  "../../serviceAccount.json",
);

async function run() {
  // googleAuthOptions chính là GoogleAuthOptions từ google-auth-library
  // Hỗ trợ: keyFile, keyFilename, credentials, scopes, ...
  // Ref: https://github.com/googleapis/google-auth-library-nodejs
  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
    googleAuthOptions: {
      keyFile: SERVICE_ACCOUNT_PATH,
    },
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: 'Sửa lỗi ngữ pháp tiếng Anh câu này: "I has a pen"',
      config: {
        temperature: 0.5,
        maxOutputTokens: 500,
      },
    });

    console.log("------------------------------");
    console.log("Provider: Vertex AI");
    console.log("Project:", PROJECT_ID);
    console.log("Location:", LOCATION);
    console.log("------------------------------");
    console.log("Kết quả từ Gemini:\n", response.text);
    console.log("------------------------------");
  } catch (error) {
    console.error("Lỗi kết nối Vertex AI:", error.message || error);
  }
}

run();
