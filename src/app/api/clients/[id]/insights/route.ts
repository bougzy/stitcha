import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";

/* -------------------------------------------------------------------------- */
/*  GET /api/clients/[id]/insights                                            */
/*  Returns client analytics: lifetime value, order stats, VIP status         */
/* -------------------------------------------------------------------------- */

export async function GET(
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
    const { id: clientId } = await params;

    await connectDB();

    // Get all orders for this client
    const orders = await Order.find({
      clientId,
      designerId,
      status: { $ne: "cancelled" },
    })
      .select("price depositPaid status garmentType createdAt dueDate paymentStatus")
      .sort({ createdAt: -1 })
      .lean();

    const totalOrders = orders.length;
    const totalSpent = orders.reduce((s, o) => s + (o.price || 0), 0);
    const totalPaid = orders.reduce((s, o) => s + (o.depositPaid || 0), 0);
    const outstandingBalance = totalSpent - totalPaid;
    const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
    const activeOrders = orders.filter(
      (o) => !["delivered", "cancelled"].includes(o.status as string)
    ).length;

    // Last order date
    const lastOrderDate = orders.length > 0 ? orders[0].createdAt : null;

    // First order date (for calculating duration)
    const firstOrderDate =
      orders.length > 0 ? orders[orders.length - 1].createdAt : null;

    // Average order value
    const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    // Favorite garment type
    const garmentCounts: Record<string, number> = {};
    for (const o of orders) {
      const gt = o.garmentType as string;
      garmentCounts[gt] = (garmentCounts[gt] || 0) + 1;
    }
    const favoriteGarment =
      Object.entries(garmentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Overdue orders
    const now = new Date();
    const overdueOrders = orders.filter(
      (o) =>
        o.dueDate &&
        new Date(o.dueDate as Date) < now &&
        !["delivered", "cancelled"].includes(o.status as string)
    ).length;

    // VIP tier calculation
    // VIP: 5+ orders or 100K+ spent
    // Regular: 2+ orders or 30K+ spent
    // New: everything else
    let tier: "vip" | "regular" | "new" = "new";
    if (totalOrders >= 5 || totalSpent >= 100_000) {
      tier = "vip";
    } else if (totalOrders >= 2 || totalSpent >= 30_000) {
      tier = "regular";
    }

    // Months since first order
    const monthsActive = firstOrderDate
      ? Math.max(
          1,
          Math.ceil(
            (now.getTime() - new Date(firstOrderDate as Date).getTime()) /
              (1000 * 60 * 60 * 24 * 30)
          )
        )
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalOrders,
        activeOrders,
        deliveredOrders,
        totalSpent,
        totalPaid,
        outstandingBalance,
        avgOrderValue: Math.round(avgOrderValue),
        favoriteGarment,
        lastOrderDate,
        firstOrderDate,
        overdueOrders,
        tier,
        monthsActive,
        ordersPerMonth:
          monthsActive > 0
            ? Math.round((totalOrders / monthsActive) * 10) / 10
            : 0,
      },
    });
  } catch (error) {
    console.error("GET /api/clients/[id]/insights error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
