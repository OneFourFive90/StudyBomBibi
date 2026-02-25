import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

// 1. Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY as string;

if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY environment variable");
}

const genAI = new GoogleGenerativeAI(apiKey);

export const fileManager = new GoogleAIFileManager(apiKey);

// 2. Export Models
export const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
export const reasoningModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function generateContent(prompt: string) {
  try {
    const result = await textModel.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("AI Service Error:", error);
    throw error;
  }
}