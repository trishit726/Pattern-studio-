import { GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { db, TABLE_NAME } from "./_lib/db";

export default async function handler(req: any, res: any) {
  if (req.method !== "DELETE" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Support both DELETE (query/body) and POST (body) for client flexibility
  const id = req.query.id || req.body?.id;
  const userId = req.query.userId || req.body?.userId;

  if (!id || !userId) {
    return res.status(400).json({ error: "Missing required parameters: id, userId" });
  }

  try {
    // 1. Fetch item to confirm ownership
    const getResponse = await db.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { id },
      })
    );

    if (!getResponse.Item) {
      return res.status(404).json({ error: "Scene not found" });
    }

    if (getResponse.Item.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized: You do not own this scene" });
    }

    // 2. Delete item
    await db.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id },
      })
    );

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Error deleting scene from DynamoDB:", error);
    return res.status(500).json({ error: error.message });
  }
}
