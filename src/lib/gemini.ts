import { GoogleGenAI } from '@google/genai'

export const GEMINI_MODEL = 'gemini-3.6-flash'

export function getGeminiClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
}
