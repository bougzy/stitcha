import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { verifyAdminToken } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import { ManualPayment } from "@/lib/models/manual-payment";
import { Notification } from "@/lib/models/notification";

/* -------------------------------------------------------------------------- */
/*  POST /api/admin/manual-payments/[id]/reject                                */
/*  Body: { adminNote: string }                                                 */
/*                                                                              */
/*  Marks a pending payment as rejected with a designer-facing note.          */
/*  The note is surfaced on the designer's /billing page and via a            */
/*  Notification so they know what to fix.                                     */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }

    const body = (await request.json()) as { adminNote?: string };
    const note = (body.adminNote || "").trim();
    if (!note || note.length < 3) {
      return NextResponse.json(
        { success: false, error: "Add a short note explaining the rejection (it's shown to the designer)." },
        { status: 400 },
      );
    }

    await connectDB();

    const payment = await ManualPayment.findById(id);
    if (!payment) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    if (payment.status !== "pending") {
      return NextResponse.json(
        { success: false, error: `Cannot reject a ${payment.status} payment.` },
        { status: 409 },
      );
    }

    payment.status = "rejected";
    payment.adminNote = note.slice(0, 500);
    payment.rejectedAt = new Date();
    await payment.save();

    // Tell the designer
    Notification.create({
      designerId: payment.designerId,
      type: "system",
      title: "❌ Payment couldn't be verified",
      message: `Your ${String(payment.purpose).replace("_", " ")} payment (${payment.reference}) was rejected: ${note}`,
      link: "/billing",
    }).catch(() => { /* non-fatal */ });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
