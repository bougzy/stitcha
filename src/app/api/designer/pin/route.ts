import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";

/* -------------------------------------------------------------------------- */
/*  POST /api/designer/pin                                                     */
/*  Set or update the owner override PIN (4-digit)                            */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const designerId = session.user.id;
    const body = await request.json();
    const { pin } = body;

    if (!pin || typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: "PIN must be exactly 4 digits" },
        { status: 400 }
      );
    }

    await connectDB();

    // Only owners can set a PIN
    const designer = await Designer.findById(designerId).select("role").lean();
    if (!designer || designer.role !== "owner") {
      return NextResponse.json(
        { success: false, error: "Only account owners can set an override PIN" },
        { status: 403 }
      );
    }

    const hashedPin = await bcrypt.hash(pin, 10);
    await Designer.findByIdAndUpdate(designerId, { $set: { ownerPin: hashedPin } });

    return NextResponse.json({
      success: true,
      message: "Owner override PIN set successfully",
    });
  } catch (error) {
    console.error("POST /api/designer/pin error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  PUT /api/designer/pin                                                      */
/*  Verify an owner override PIN (used by staff on the owner's behalf)        */
/* -------------------------------------------------------------------------- */

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const designerId = session.user.id;
    const body = await request.json();
    const { pin } = body;

    if (!pin || typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: "PIN must be exactly 4 digits" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the owner to verify against
    const designer = await Designer.findById(designerId).select("role teamOwnerId").lean();
    if (!designer) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    // If the user IS the owner, verify against their own PIN
    // If staff, verify against their team owner's PIN
    const ownerId = designer.role === "owner" ? designerId : designer.teamOwnerId;
    if (!ownerId) {
      return NextResponse.json(
        { success: false, error: "No team owner configured" },
        { status: 400 }
      );
    }

    const owner = await Designer.findById(ownerId).select("+ownerPin").lean();
    if (!owner?.ownerPin) {
      return NextResponse.json(
        { success: false, error: "Owner has not set an override PIN" },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(pin, owner.ownerPin);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid PIN" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "PIN verified",
    });
  } catch (error) {
    console.error("PUT /api/designer/pin error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
