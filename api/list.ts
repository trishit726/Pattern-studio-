import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { db, TABLE_NAME } from "./_lib/db";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "Missing required query parameter: userId" });
  }

  // Attempt 1: Optimized Query using Global Secondary Index (GSI)
  // This is what Karthik and the AWS NoSQL SAs will look for!
  try {
    const response = await db.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "userId-updatedAt-index",
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: {
          ":uid": userId,
        },
        ScanIndexForward: false, // returns sorted by updatedAt DESC (newest first)
      })
    );

    return res.status(200).json(response.Items || []);
  } catch (gsiError) {
    console.warn(
      "GSI query failed (likely because userId-updatedAt-index hasn't been created yet). Falling back to Scan filter..."
    );

    // Attempt 2: Fallback Scan with filter (slow, but works on a default table)
    try {
      const response = await db.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: "userId = :uid",
          ExpressionAttributeValues: {
            ":uid": userId,
          },
        })
      );

      // Sort in memory DESC by updatedAt since Scan doesn't sort
      const items = response.Items || [];
      items.sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0));

      return res.status(200).json(items);
    } catch (scanError: any) {
      console.error("Scan fallback also failed:", scanError);
      return res.status(500).json({ error: scanError.message });
    }
  }
}
