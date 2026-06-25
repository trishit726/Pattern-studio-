import { NextResponse } from "next/server"
import { recordRender } from "@/app/lib/db"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const { userId, composition, durationSec, status } = await req.json()

  if (!userId || !composition || durationSec === undefined || !status) {
    return NextResponse.json(
      {
        error:
          "Missing required parameters: userId, composition, durationSec, status",
      },
      { status: 400 },
    )
  }

  try {
    const event = await recordRender({
      userId,
      composition,
      durationSec: Number(durationSec),
      status,
    })
    return NextResponse.json({ success: true, event })
  } catch (error: any) {
    console.error("[v0] Error recording render to DynamoDB:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
