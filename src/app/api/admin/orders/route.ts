import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Designer } from "@/lib/models/designer";
import { Client } from "@/lib/models/client";

/* -------------------------------------------------------------------------- */
/*  GET /api/admin/orders                                                      */
/*                                                                              */
/*  System-wide read-only order list with filters:                            */
/*    ?status=cutting (any OrderStatus)                                        */
/*    ?paymentStatus=unpaid                                                    */
/*    ?search=anki    (substring match on title)                              */
/*    ?limit=50       (max 200)                                                */
/* -------------------------------------------------------------------------- */

export async function GET(request: Request) {
  if (!(await verifyAdminToken())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const search = searchParams.get("search");
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 200);

    const filter: Record<string, unknown> = { isDeleted: { $ne: true } };
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (search && search.trim()) {
      filter.title = { $regex: search.trim(), $options: "i" };
    }

    const rows = await Order.find(filter)
      .select("title status paymentStatus garmentType price depositPaid payments dueDate designerId clientId createdAt")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    /* Hydrate designer + client names in one pair of round-trips */
    const designerIds = Array.from(
      new Set(rows.map((r) => String((r as unknown as Record<string, unknown>).designerId))),
    );
    const clientIds = Array.from(
      new Set(rows.map((r) => String((r as unknown as Record<string, unknown>).clientId))),
    );
    const [designers, clients] = await Promise.all([
      Designer.find({ _id: { $in: designerIds } })
        .select("name businessName")
        .lean(),
      Client.find({ _id: { $in: clientIds } })
        .select("name phone")
        .lean(),
    ]);
    const dMap = new Map(
      designers.map((d) => [
        String((d as unknown as Record<string, unknown>)._id),
        d as unknown as Record<string, unknown>,
      ]),
    );
    const cMap = new Map(
      clients.map((c) => [
        String((c as unknown as Record<string, unknown>)._id),
        c as unknown as Record<string, unknown>,
      ]),
    );

    return NextResponse.json({
      success: true,
      data: {
        orders: rows.map((r) => {
          const rr = r as unknown as Record<string, unknown>;
          const collected =
            ((rr.payments as Array<Record<string, unknown>> | undefined) ?? []).reduce(
              (s, p) => s + ((p.amount as number) || 0),
              0,
            ) + ((rr.depositPaid as number) || 0);
          const balance = Math.max(0, ((rr.price as number) || 0) - collected);
          const designer = dMap.get(String(rr.designerId));
          const client = cMap.get(String(rr.clientId));
          return {
            id: String(rr._id),
            title: rr.title,
            status: rr.status,
            paymentStatus: rr.paymentStatus,
            garmentType: rr.garmentType,
            price: rr.price,
            collected,
            balance,
            dueDate: rr.dueDate,
            createdAt: rr.createdAt,
            designer: designer
              ? {
                  id: String(designer._id),
                  name: designer.name,
                  businessName: designer.businessName,
                }
              : null,
            client: client
              ? {
                  name: client.name,
                  phone: client.phone,
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
