import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Outreach } from "@/lib/models/outreach";

/* -------------------------------------------------------------------------- */
/*  POST /api/broadcast/whatsapp-log                                           */
/*                                                                              */
/*  Body: { clientId: string, message: string }                                */
/*                                                                              */
/*  The WhatsApp broadcast path is client-side: the browser opens wa.me        */
/*  links one at a time and the designer manually taps Send in WhatsApp.       */
/*  When the designer marks a message as sent in the queue UI, the client     */
/*  POSTs to this endpoint to record the outreach (so the Heartbeat dashboard */
/*  reflects engagement).                                                      */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { clientId?: string; message?: string };
    const clientId = body.clientId;
    if (!clientId || !Types.ObjectId.isValid(clientId)) {
      return NextResponse.json({ success: false, error: "Invalid clientId" }, { status: 400 });
    }
    const message = (body.message || "").slice(0, 280);

    await connectDB();

    await Outreach.create({
      designerId: userId,
      clientId,
      type: "whatsapp",
      message,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Log failed" },
      { status: 500 },
    );
  }
}
