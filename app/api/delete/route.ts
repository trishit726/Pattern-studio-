import { NextResponse } from "next/server"
import { GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb"
import { db, TABLE_NAME } from "@/lib/server/db"

export const runtime = "nodejs"

async function handleDelete(id: string | null, userId: string | null) {
  if (!id || !userId) {
    return NextResponse.json(
      { error: "Missing required parameters: id, userId" },
      { status: 400 },
    )
  }

  try {
    // 1. Fetch item to confirm ownership.
    const getResponse = await db.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { id } }),
    )

    if (!getResponse.Item) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 })
    }

    if (getResponse.Item.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized: You do not own this scene" },
        { status: 403 },
      )
    }

    // 2. Delete item.
    await db.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { id } }))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error deleting scene from DynamoDB:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  return handleDelete(searchParams.get("id"), searchParams.get("userId"))
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  return handleDelete(body?.id ?? null, body?.userId ?? null)
}
