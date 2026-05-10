import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Client } from "@/lib/models/client";
import { Order } from "@/lib/models/order";

/* -------------------------------------------------------------------------- */
/*  GET /api/broadcast/recipients?segment=...                                  */
/*                                                                              */
/*  Segments:                                                                   */
/*    "all"        — every client                                              */
/*    "debtors"    — clients with at least one unpaid/partial order            */
/*    "dormant"    — no orders in the last 90 days                             */
/*    "no-measure" — clients with no saved measurements                        */
/*    "vip"        — 5+ orders                                                  */
/*    "loyal"      — 3+ orders                                                  */
/*    "new"        — 1 order                                                    */
/*    "female"     — gender filter                                              */
/*    "male"       — gender filter                                              */
/*                                                                              */
/*  Returns: { count, recipients: [{ _id, name, phone, hasPhone, owes? }] }   */
/*  Recipients without a usable phone are filtered out.                        */
/* -------------------------------------------------------------------------- */

const VALID_SEGMENTS = new Set([
  "all", "debtors", "dormant", "no-measure", "vip", "loyal", "new", "female", "male",
]);

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function hasUsablePhone(p: unknown): boolean {
  if (typeof p !== "string") return false;
  const digits = p.replace(/\D/g, "");
  return digits.length >= 10;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const segment = (searchParams.get("segment") || "all").toLowerCase();
    if (!VALID_SEGMENTS.has(segment)) {
      return NextResponse.json({ success: false, error: "Invalid segment" }, { status: 400 });
    }

    await connectDB();

    /* --- Special segments that need order data --- */
    if (segment === "debtors") {
      // Distinct client IDs that have at least one unpaid/partial order
      const debtorIds = await Order.distinct("clientId", {
        designerId: userId,
        paymentStatus: { $in: ["unpaid", "partial"] },
        isDeleted: { $ne: true },
        status: { $ne: "cancelled" },
      });
      const clients = await Client.find({
        designerId: userId,
        _id: { $in: debtorIds },
      })
        .select("name phone gender")
        .sort({ name: 1 })
        .lean();

      const recipients = clients
        .filter((c) => hasUsablePhone((c as Record<string, unknown>).phone))
        .map((c) => {
          const cc = c as Record<string, unknown>;
          return {
            _id: String(cc._id),
            name: cc.name as string,
            phone: cc.phone as string,
            gender: cc.gender as string,
          };
        });
      return NextResponse.json({ success: true, data: { count: recipients.length, recipients } });
    }

    if (segment === "dormant") {
      // Clients whose latest order is older than 90 days (or have no orders)
      const since = new Date(Date.now() - NINETY_DAYS_MS);
      // Get clients with a recent order to EXCLUDE
      const recentClientIds = await Order.distinct("clientId", {
        designerId: userId,
        createdAt: { $gte: since },
        isDeleted: { $ne: true },
      });
      const clients = await Client.find({
        designerId: userId,
        _id: { $nin: recentClientIds },
      })
        .select("name phone gender")
        .sort({ name: 1 })
        .lean();
      const recipients = clients
        .filter((c) => hasUsablePhone((c as Record<string, unknown>).phone))
        .map((c) => {
          const cc = c as Record<string, unknown>;
          return {
            _id: String(cc._id),
            name: cc.name as string,
            phone: cc.phone as string,
            gender: cc.gender as string,
          };
        });
      return NextResponse.json({ success: true, data: { count: recipients.length, recipients } });
    }

    if (["vip", "loyal", "new"].includes(segment)) {
      const minOrders = segment === "vip" ? 5 : segment === "loyal" ? 3 : 1;
      const maxOrders = segment === "new" ? 1 : Infinity;

      const counts: { _id: Types.ObjectId; n: number }[] = await Order.aggregate([
        { $match: {
          designerId: new Types.ObjectId(userId),
          isDeleted: { $ne: true },
          status: { $ne: "cancelled" },
        } },
        { $group: { _id: "$clientId", n: { $sum: 1 } } },
        { $match: {
          n: maxOrders === Infinity
            ? { $gte: minOrders }
            : { $gte: minOrders, $lte: maxOrders },
        } },
      ]);
      const ids = counts.map((c) => c._id);
      const clients = await Client.find({ designerId: userId, _id: { $in: ids } })
        .select("name phone gender")
        .sort({ name: 1 })
        .lean();
      const recipients = clients
        .filter((c) => hasUsablePhone((c as Record<string, unknown>).phone))
        .map((c) => {
          const cc = c as Record<string, unknown>;
          return {
            _id: String(cc._id),
            name: cc.name as string,
            phone: cc.phone as string,
            gender: cc.gender as string,
          };
        });
      return NextResponse.json({ success: true, data: { count: recipients.length, recipients } });
    }

    /* --- Plain client filters (no order join needed) --- */
    const filter: Record<string, unknown> = { designerId: userId };
    if (segment === "no-measure") filter.lastMeasuredAt = { $exists: false };
    if (segment === "female") filter.gender = "female";
    if (segment === "male") filter.gender = "male";

    const clients = await Client.find(filter)
      .select("name phone gender")
      .sort({ name: 1 })
      .lean();

    const recipients = clients
      .filter((c) => hasUsablePhone((c as Record<string, unknown>).phone))
      .map((c) => {
        const cc = c as Record<string, unknown>;
        return {
          _id: String(cc._id),
          name: cc.name as string,
          phone: cc.phone as string,
          gender: cc.gender as string,
        };
      });

    return NextResponse.json({ success: true, data: { count: recipients.length, recipients } });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to load recipients" },
      { status: 500 },
    );
  }
}
