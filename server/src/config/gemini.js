import { GoogleGenAI } from "@google/genai";
import { env } from "./environment.js";

export const genai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
