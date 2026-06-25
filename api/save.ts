import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { db, TABLE_NAME } from "./_lib/db";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id, name, props, duration, userId } = req.body;

    if (!id || !name || !props || !userId) {
      return res.status(400).json({ error: "Missing required fields: id, name, props, userId" });
    }

    const item = {
      id,
      userId,
      name,
      props,
      duration: duration || 150,
      updatedAt: Date.now(),
    };

    await db.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );

    return res.status(200).json({ success: true, item });
  } catch (error: any) {
    console.error("Error saving scene to DynamoDB:", error);
    return res.status(500).json({ error: error.message });
  }
}
