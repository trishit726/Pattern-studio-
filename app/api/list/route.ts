import { NextResponse } from "next/server"
import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb"
import { db, TABLE_NAME } from "@/lib/server/db"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json(
      { error: "Missing required query parameter: userId" },
      { status: 400 },
    )
  }

  // Attempt 1: Optimized Query using Global Secondary Index (GSI).
  try {
    const response = await db.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "userId-updatedAt-index",
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": userId },
        ScanIndexForward: false, // sorted by updatedAt DESC (newest first)
      }),
    )
    return NextResponse.json(response.Items || [])
  } catch {
    console.warn(
      "[v0] GSI query failed (userId-updatedAt-index may not exist). Falling back to Scan filter...",
    )

    // Attempt 2: Fallback Scan with filter (slower, works on a default table).
    try {
      const response = await db.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: "userId = :uid",
          ExpressionAttributeValues: { ":uid": userId },
        }),
      )
      const items = response.Items || []
      items.sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0))
      return NextResponse.json(items)
    } catch (scanError: any) {
      console.error("[v0] Scan fallback also failed:", scanError)
      return NextResponse.json({ error: scanError.message }, { status: 500 })
    }
  }
}
