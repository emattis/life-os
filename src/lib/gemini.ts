import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateText(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text) {
    throw new Error("No text response from Gemini");
  }
  return text;
}

/** Extract JSON from a response that may contain markdown code fences */
export function extractJSON(text: string): string {
  return text
    .replace(/```json?\n?/g, "")
    .replace(/```/g, "")
    .trim();
}
