import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Outreach } from "@/lib/models/outreach";

/* -------------------------------------------------------------------------- */
/*  GET /api/clients/outreach?clientId=xxx                                     */
/*  Returns outreach history for a client                                     */
/* -------------------------------------------------------------------------- */

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const designerId = (session.user as { id: string }).id;
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    await connectDB();

    const filter: Record<string, unknown> = { designerId };
    if (clientId) filter.clientId = clientId;

    const history = await Outreach.find(filter)
      .sort({ sentAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      data: { outreach: JSON.parse(JSON.stringify(history)) },
    });
  } catch (error) {
    console.error("GET /api/clients/outreach error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/* -------------------------------------------------------------------------- */
/*  POST /api/clients/outreach                                                 */
/*  Log an outreach action (whatsapp, call, note)                             */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const designerId = (session.user as { id: string }).id;
    const body = await request.json();
    const { clientId, type, message } = body;

    if (!clientId || !type) {
      return NextResponse.json(
        { success: false, error: "clientId and type are required" },
        { status: 400 }
      );
    }

    if (!["whatsapp", "call", "note"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "type must be whatsapp, call, or note" },
        { status: 400 }
      );
    }

    await connectDB();

    const outreach = await Outreach.create({
      designerId,
      clientId,
      type,
      message: message || undefined,
      sentAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: JSON.parse(JSON.stringify(outreach)),
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/clients/outreach error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
