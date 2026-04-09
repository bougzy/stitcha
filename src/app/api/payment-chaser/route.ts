import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models/order";
import { Client } from "@/lib/models/client";
import { Designer } from "@/lib/models/designer";

/**
 * Payment Chaser API
 *
 * GET  /api/payment-chaser
 *   Returns all orders with outstanding balances, grouped by urgency:
 *   - URGENT:  overdue 14+ days
 *   - CHASE:   overdue 7–13 days
 *   - REMIND:  overdue 3–6 days
 *   - NEW:     0–2 days (too soon to chase)
 *
 * POST /api/payment-chaser/send
 *   Generates a WhatsApp chase message for a specific order.
 *   Body: { orderId, tone: "gentle" | "firm" | "final" }
 *   Returns: { whatsappUrl: string }
 *
 * The cron job (Vercel cron or external) calls:
 *   POST /api/payment-chaser/auto
 * to trigger automatic reminders. Each designer can configure
 * their auto-chase preferences in settings.
 */

function formatNaira(n: number) {
  return `₦${n.toLocaleString("en-NG")}`;
}

function calcBalance(order: any): number {
  const payments = (order.payments || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
  return Math.max(0, order.price - (order.depositPaid || 0) - payments);
}

function daysSince(date: Date | string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

function urgencyLevel(order: any): "urgent" | "chase" | "remind" | "new" {
  const days = daysSince(order.updatedAt || order.createdAt);
  if (days >= 14) return "urgent";
  if (days >= 7)  return "chase";
  if (days >= 3)  return "remind";
  return "new";
}

/* -------------------------------------------------------------------------- */
/*  GET — list all chaseable orders                                            */
/* -------------------------------------------------------------------------- */

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const designerId = (session.user as any).id;
    await connectDB();

    const orders = await Order.find({
      designerId,
      paymentStatus: { $in: ["unpaid", "partial"] },
      isDeleted: { $ne: true },
      status:    { $ne: "cancelled" },
    })
      .populate("clientId", "name phone")
      .sort({ createdAt: -1 })
      .lean();

    const enriched = orders.map((o: any) => {
      const balance = calcBalance(o);
      const days    = daysSince(o.updatedAt || o.createdAt);
      return {
        _id:        o._id.toString(),
        title:      o.title,
        balance,
        days,
        urgency:    urgencyLevel(o),
        client: {
          _id:   o.clientId?._id?.toString(),
          name:  o.clientId?.name  || "Unknown",
          phone: o.clientId?.phone || "",
        },
        dueDate:     o.dueDate,
        status:      o.status,
        lastChasedAt: o.lastChasedAt || null,
      };
    }).filter((o) => o.balance > 0);

    const grouped = {
      urgent: enriched.filter((o) => o.urgency === "urgent"),
      chase:  enriched.filter((o) => o.urgency === "chase"),
      remind: enriched.filter((o) => o.urgency === "remind"),
      new:    enriched.filter((o) => o.urgency === "new"),
      total:  enriched.reduce((s, o) => s + o.balance, 0),
      count:  enriched.length,
    };

    return NextResponse.json({ success: true, data: grouped });
  } catch (error) {
    console.error("Payment chaser GET error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/* -------------------------------------------------------------------------- */
/*  POST — generate WhatsApp chase message for one order                      */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const designerId = (session.user as any).id;
    const body       = await request.json();
    const { orderId, tone = "gentle" } = body;

    await connectDB();

    const order = await Order.findOne({ _id: orderId, designerId })
      .populate("clientId", "name phone")
      .lean() as any;

    if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });

    const designer = await Designer.findById(designerId).select("name businessName").lean() as any;
    const client   = order.clientId as any;
    const balance  = calcBalance(order);
    const days     = daysSince(order.updatedAt || order.createdAt);

    if (balance <= 0) return NextResponse.json({ success: false, error: "No outstanding balance" }, { status: 400 });

    // Build message based on tone
    let message = "";
    const biz = designer?.businessName || "Your Fashion Designer";

    if (tone === "gentle") {
      message =
        `Hi ${client.name}! 😊\n\n` +
        `Just a friendly reminder about your *${order.title}* order.\n\n` +
        `Outstanding balance: *${formatNaira(balance)}*\n\n` +
        `Whenever you're ready, you can pay via bank transfer or cash. Would you like my account details?\n\n` +
        `Thank you so much! 🙏\n— ${biz}`;
    } else if (tone === "firm") {
      message =
        `Hello ${client.name},\n\n` +
        `This is a reminder that your *${order.title}* order has an outstanding balance of *${formatNaira(balance)}* that has been pending for ${days} days.\n\n` +
        `Please arrange payment at your earliest convenience. The work has been completed and we would appreciate prompt settlement.\n\n` +
        `Bank transfer or cash accepted. Please reply to confirm when payment will be made.\n\n` +
        `Thank you.\n— ${biz}`;
    } else {
      // final
      message =
        `Dear ${client.name},\n\n` +
        `We have reached out multiple times about the outstanding balance of *${formatNaira(balance)}* for your *${order.title}* order.\n\n` +
        `This balance is now ${days} days overdue. We kindly request immediate payment to resolve this matter.\n\n` +
        `Please contact us urgently to arrange payment. Thank you.\n— ${biz}`;
    }

    // Clean phone for WhatsApp link
    let phone = (client.phone || "").replace(/[\s\-().+]/g, "");
    if (phone.startsWith("234")) phone = "0" + phone.slice(3);
    if (phone.startsWith("0"))   phone = "234" + phone.slice(1);

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    // Mark order as chased
    await Order.updateOne({ _id: orderId }, { $set: { lastChasedAt: new Date() } });

    return NextResponse.json({
      success: true,
      data: { whatsappUrl, message, balance, clientName: client.name },
    });
  } catch (error) {
    console.error("Payment chaser POST error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
