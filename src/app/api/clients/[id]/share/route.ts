import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Client } from "@/lib/models/client";
import { generateScanLink } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  POST /api/clients/[id]/share                                              */
/*  Generate (or return existing) share code for a client measurement card    */
/* -------------------------------------------------------------------------- */

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const designerId = (session.user as { id: string }).id;
    const { id } = await params;

    await connectDB();

    const client = await Client.findOne({ _id: id, designerId });
    if (!client) {
      return NextResponse.json(
        { success: false, error: "Client not found" },
        { status: 404 }
      );
    }

    if (!client.measurements) {
      return NextResponse.json(
        { success: false, error: "No measurements to share. Add measurements first." },
        { status: 400 }
      );
    }

    // Return existing share code if one exists
    if (client.shareCode) {
      return NextResponse.json({
        success: true,
        data: { shareCode: client.shareCode },
      });
    }

    // Generate a new unique share code
    let shareCode: string;
    let attempts = 0;
    do {
      shareCode = `mc_${generateScanLink()}`;
      const existing = await Client.findOne({ shareCode });
      if (!existing) break;
      attempts++;
    } while (attempts < 5);

    client.shareCode = shareCode;
    await client.save();

    return NextResponse.json({
      success: true,
      data: { shareCode },
    });
  } catch (error) {
    console.error("POST /api/clients/[id]/share error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
