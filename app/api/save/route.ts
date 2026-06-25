import { NextResponse } from "next/server"
import { PutCommand } from "@aws-sdk/lib-dynamodb"
import { db, TABLE_NAME } from "@/lib/server/db"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const { id, name, props, duration, userId } = await req.json()

    if (!id || !name || !props || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: id, name, props, userId" },
        { status: 400 },
      )
    }

    const item = {
      id,
      userId,
      name,
      props,
      duration: duration || 150,
      updatedAt: Date.now(),
    }

    await db.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      }),
    )

    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    console.error("[v0] Error saving scene to DynamoDB:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
