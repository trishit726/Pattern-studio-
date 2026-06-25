import { logRenderEvent } from "./_lib/db";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, composition, durationSec, status } = req.body;

  if (!userId || !composition || durationSec === undefined || !status) {
    return res.status(400).json({ error: "Missing required parameters: userId, composition, durationSec, status" });
  }

  try {
    await logRenderEvent(userId, composition, Number(durationSec), status);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Error logging render to Postgres:", error);
    return res.status(500).json({ error: error.message });
  }
}
