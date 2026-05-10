import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import { ManualPayment } from "@/lib/models/manual-payment";
import { Designer } from "@/lib/models/designer";

/* -------------------------------------------------------------------------- */
/*  GET /api/admin/manual-payments?status=pending                              */
/*                                                                              */
/*  Admin-only list of manual payments. Defaults to status=pending so the     */
/*  admin queue is the landing view; pass ?status=all for the full history.   */
/* -------------------------------------------------------------------------- */

export async function GET(request: Request) {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || "pending";
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 200);

    const query: Record<string, unknown> = {};
    if (statusFilter !== "all") query.status = statusFilter;

    const rows = await ManualPayment.find(query)
      .sort({ status: 1, createdAt: -1 })
      .limit(limit)
      .lean();

    // Hydrate designer info for each row in one round-trip
    const designerIds = Array.from(
      new Set(rows.map((r) => String((r as unknown as Record<string, unknown>).designerId))),
    );
    const designers = await Designer.find({ _id: { $in: designerIds } })
      .select("name email phone businessName subscription smsBalance")
      .lean();
    const designerMap = new Map(
      designers.map((d) => [
        String((d as unknown as Record<string, unknown>)._id),
        d as unknown as Record<string, unknown>,
      ]),
    );

    return NextResponse.json({
      success: true,
      data: {
        payments: rows.map((r) => {
          const rr = r as unknown as Record<string, unknown>;
          const designer = designerMap.get(String(rr.designerId));
          return {
            id: String(rr._id),
            purpose: rr.purpose,
            amount: rr.amount,
            reference: rr.reference,
            status: rr.status,
            payload: rr.payload,
            proofImage: rr.proofImage,
            senderName: rr.senderName,
            senderBank: rr.senderBank,
            designerNote: rr.designerNote,
            adminNote: rr.adminNote,
            createdAt: rr.createdAt,
            verifiedAt: rr.verifiedAt,
            rejectedAt: rr.rejectedAt,
            designer: designer
              ? {
                  id: String(designer._id),
                  name: designer.name,
                  email: designer.email,
                  phone: designer.phone,
                  businessName: designer.businessName,
                  subscription: designer.subscription,
                  smsBalance: designer.smsBalance ?? 0,
                }
              : null,
          };
        }),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
