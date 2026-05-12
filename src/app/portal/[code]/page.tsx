/* -------------------------------------------------------------------------- */
/*  /portal/[code]                                                              */
/*                                                                              */
/*  Server shell:                                                                */
/*    1. Fetch initial data from MongoDB (one round-trip, SEO-friendly).      */
/*    2. Hand off to <PortalLive /> client component which then polls         */
/*       /api/portal/[code] every 30s for live status updates.                */
/*                                                                              */
/*  No customer login required. Access is by shareCode only.                  */
/* -------------------------------------------------------------------------- */

import Link from "next/link";
import { Metadata } from "next";
import connectDB from "@/lib/db";
import { Client } from "@/lib/models/client";
import { Designer } from "@/lib/models/designer";
import { Order } from "@/lib/models/order";
import {
  PortalLive,
  type PortalData,
} from "@/components/portal/portal-live";

/* -------------------------------------------------------------------------- */
/*  Initial server-side data fetch                                              */
/* -------------------------------------------------------------------------- */

async function getPortalData(code: string): Promise<PortalData | null> {
  try {
    await connectDB();

    const client = await Client.findOne({ shareCode: code }).lean();
    if (!client) return null;

    const designer = await Designer.findById(client.designerId)
      .select("businessName name phone city state")
      .lean();

    const orders = await Order.find({
      clientId: client._id,
      status: { $ne: "cancelled" },
      isDeleted: { $ne: true },
    })
      .select(
        "title garmentType status statusHistory dueDate createdAt updatedAt " +
          "price currency depositPaid payments paymentStatus notifyWhenReady",
      )
      .sort({ createdAt: -1 })
      .lean();

    const d = designer as Record<string, unknown> | null;

    return {
      clientName: client.name as string,
      clientGender: client.gender as "male" | "female",
      clientPhone: client.phone as string,
      measurements: client.measurements
        ? JSON.parse(JSON.stringify(client.measurements))
        : null,
      lastMeasuredAt: client.lastMeasuredAt
        ? new Date(client.lastMeasuredAt as Date).toISOString()
        : null,
      designer: d
        ? {
            businessName: d.businessName as string,
            name: d.name as string,
            phone: d.phone as string,
            location: [d.city, d.state].filter(Boolean).join(", "),
          }
        : null,
      orders: orders.map((o) => {
        const order = o as Record<string, unknown>;
        const payments =
          (order.payments as Array<Record<string, unknown>> | undefined) ?? [];
        const paymentsTotal = payments.reduce(
          (s, p) => s + ((p.amount as number) || 0),
          0,
        );
        const depositPaid = (order.depositPaid as number) || 0;
        const totalPaid = depositPaid + paymentsTotal;
        const price = (order.price as number) || 0;
        const balance = Math.max(0, price - totalPaid);
        return {
          _id: String(order._id),
          title: order.title as string,
          garmentType: order.garmentType as string,
          status: order.status as string,
          statusHistory: Array.isArray(order.statusHistory)
            ? (
                order.statusHistory as {
                  status: string;
                  changedAt: Date;
                  note?: string;
                }[]
              ).map((h) => ({
                status: h.status,
                changedAt: new Date(h.changedAt).toISOString(),
                note: h.note,
              }))
            : [],
          dueDate: order.dueDate
            ? new Date(order.dueDate as Date).toISOString()
            : null,
          createdAt: new Date(order.createdAt as Date).toISOString(),
          updatedAt: new Date(order.updatedAt as Date).toISOString(),
          price,
          currency: (order.currency as string) || "NGN",
          totalPaid,
          balance,
          paymentStatus: (order.paymentStatus as string) || "unpaid",
          notifyWhenReady: !!order.notifyWhenReady,
        };
      }),
    };
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Metadata                                                                    */
/* -------------------------------------------------------------------------- */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const data = await getPortalData(code);
  if (!data) return { title: "Client Portal — Stitcha" };

  return {
    title: `${data.clientName} — My Portal`,
    description: `View your measurements and order status from ${data.designer?.businessName || "your designer"}`,
    openGraph: {
      title: `${data.clientName} — Client Portal`,
      description: `Your measurements and orders from ${data.designer?.businessName || "Stitcha"}`,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Not-found view                                                              */
/* -------------------------------------------------------------------------- */

function NotFoundView() {
  return (
    <div className="relative min-h-screen bg-[#FAFAF8]">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-[#C75B39]/[0.06] blur-[120px]" />
      </div>
      <div className="relative z-10 mx-auto max-w-md px-6 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#1A1A2E]/8 bg-white">
          <span className="text-3xl">🔒</span>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-[#1A1A2E]">Portal not found</h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-[#1A1A2E]/55">
          This client portal link is not valid. Please contact your designer for a new link.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#C75B39] to-[#D4A853] px-6 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                        */
/* -------------------------------------------------------------------------- */

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const data = await getPortalData(code);

  if (!data) return <NotFoundView />;

  return <PortalLive code={code} initialData={data} />;
}
