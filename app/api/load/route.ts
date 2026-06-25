import { NextResponse } from "next/server"
import { GetCommand } from "@aws-sdk/lib-dynamodb"
import { db, TABLE_NAME } from "@/lib/server/db"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json(
      { error: "Missing required query parameter: id" },
      { status: 400 },
    )
  }

  try {
    const response = await db.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { id } }),
    )

    if (!response.Item) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 })
    }

    return NextResponse.json(response.Item)
  } catch (error: any) {
    console.error("[v0] Error loading scene from DynamoDB:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
