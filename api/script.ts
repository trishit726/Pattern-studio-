import { generateText } from "./_lib/ai";

const SYSTEM_SCRIPT = `You are a scriptwriter for short product-demo and brand videos. Given a brand or topic, write a punchy spoken voiceover script for a 45-75 second video. Structure it as: a 1-line HOOK, a 1-2 line PROBLEM, a 2-3 line SOLUTION/what it does, and a 1-line CALL TO ACTION. Write plain narration the creator reads aloud (no stage directions, no headers unless they help). Keep it energetic, concrete, and under ~140 words.`;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body || {};
  if (!prompt || !String(prompt).trim()) {
    return res.status(400).json({ error: "Missing required parameter: prompt" });
  }

  try {
    const script = (
      await generateText({
        system: SYSTEM_SCRIPT,
        user: `Brand / topic: ${String(prompt).trim()}`,
        maxTokens: 1200,
      })
    ).trim();

    return res.status(200).json({ script });
  } catch (error: any) {
    console.error("Error writing script:", error);
    return res.status(500).json({ error: error.message });
  }
}
