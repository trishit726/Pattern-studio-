import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { db, TABLE_NAME } from "./_lib/db";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Missing required query parameter: id" });
  }

  try {
    const response = await db.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { id },
      })
    );

    if (!response.Item) {
      return res.status(404).json({ error: "Scene not found" });
    }

    return res.status(200).json(response.Item);
  } catch (error: any) {
    console.error("Error loading scene from DynamoDB:", error);
    return res.status(500).json({ error: error.message });
  }
}
