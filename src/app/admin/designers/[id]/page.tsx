"use client";

/* -------------------------------------------------------------------------- */
/*  /admin/designers/[id]                                                       */
/*                                                                              */
/*  Single-designer control panel:                                             */
/*    • Profile + lifetime counters                                            */
/*    • Manual grants (subscription, SMS, Studio, free trial scans)           */
/*    • Suspend / unsuspend toggle                                             */
/*    • Recent payments + activity                                             */
/* -------------------------------------------------------------------------- */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Crown,
  Users,
  Package,
  ScanLine,
  Megaphone,
  Sparkles,
  Banknote,
  ShieldOff,
  ShieldCheck,
  Loader2,
  ExternalLink,
  Calendar,
  Activity as ActivityIcon,
  Globe,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface DesignerData {
  _id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  bio?: string;
  city?: string;
  state?: string;
  country?: string;
  subscription: "free" | "plus" | "pro";
  subscriptionExpiry?: string;
  publicProfile?: boolean;
  suspended?: boolean;
  suspendedAt?: string;
  suspendedReason?: string;
  smsBalance?: number;
  smsLifetimePurchased?: number;
  studioAddon?: { expiresAt?: string; brandColor?: string; logoUrl?: string };
  isVerified?: boolean;
  isOnboarded?: boolean;
  createdAt?: string;
}

interface Stats {
  clients: number;
  orders: number;
  totalCollectedNGN: number;
  featuredPosts: number;
  activeBoosts: number;
  scans: number;
  completedScans: number;
  broadcasts: number;
  pendingPayments: number;
  paidToStitchaNGN: number;
}

interface Payment {
  _id: string;
  purpose: string;
  amount: number;
  reference: string;
  status: string;
  createdAt: string;
}

interface ActivityRow {
  _id: string;
  action: string;
  entity: string;
  details?: string;
  createdAt: string;
}

function formatNGN(n: number) {
  return `₦${n.toLocaleString("en-NG")}`;
}

function formatDate(iso: string | undefined | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export default function AdminDesignerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [designer, setDesigner] = useState<DesignerData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/designers/${id}`);
      const json = await res.json();
      if (json.success) {
        setDesigner(json.data.designer);
        setStats(json.data.stats);
        setPayments(json.data.recentPayments);
        setActivity(json.data.recentActivity);
      } else if (res.status === 401) {
        router.push("/admin/login");
      } else {
        toast.error(json.error || "Failed to load");
      }
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { refresh(); }, [refresh]);

  if (loading || !designer) {
    return (
      <div className="flex items-center gap-2 text-sm text-white/55">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  const subscriptionExpired = designer.subscriptionExpiry
    ? new Date(designer.subscriptionExpiry) < new Date()
    : false;
  const studioActive = designer.studioAddon?.expiresAt
    ? new Date(designer.studioAddon.expiresAt) > new Date()
    : false;

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/admin/designers"
            className="inline-flex items-center gap-1.5 text-xs text-white/45 hover:text-white/70"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Designers
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-white">
            {designer.businessName || designer.name}
          </h1>
          <p className="text-sm text-white/55">{designer.name}</p>
        </div>
        <SuspendButton designer={designer} onChange={refresh} />
      </header>

      {/* Suspension banner */}
      {designer.suspended && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
          <p className="font-semibold flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Account suspended {designer.suspendedAt && `· ${formatDate(designer.suspendedAt)}`}
          </p>
          {designer.suspendedReason && (
            <p className="mt-1 text-red-200/80">{designer.suspendedReason}</p>
          )}
        </div>
      )}

      {/* Profile + plan */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Profile */}
        <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/45">
            Profile
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={designer.email} />
            <Field icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={designer.phone} />
            <Field
              icon={<MapPin className="h-3.5 w-3.5" />}
              label="Location"
              value={[designer.city, designer.state, designer.country].filter(Boolean).join(", ") || "—"}
            />
            <Field
              icon={<Calendar className="h-3.5 w-3.5" />}
              label="Joined"
              value={formatDate(designer.createdAt)}
            />
            {designer.bio && (
              <div className="sm:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Bio</p>
                <p className="mt-1 text-sm text-white/70">{designer.bio}</p>
              </div>
            )}
          </div>
        </section>

        {/* Plan + addons */}
        <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/45">
            Subscription & addons
          </h2>
          <PlanRow
            label="Plan"
            primary={designer.subscription.toUpperCase()}
            secondary={
              designer.subscriptionExpiry
                ? subscriptionExpired
                  ? `Expired ${formatDate(designer.subscriptionExpiry)}`
                  : `Until ${formatDate(designer.subscriptionExpiry)}`
                : "No expiry"
            }
            tone={designer.subscription === "pro" ? "gold" : designer.subscription === "plus" ? "primary" : "neutral"}
            warning={subscriptionExpired}
          />
          <PlanRow
            label="SMS balance"
            primary={`${designer.smsBalance ?? 0}`}
            secondary={`Lifetime: ${designer.smsLifetimePurchased ?? 0}`}
            tone="neutral"
          />
          <PlanRow
            label="Studio addon"
            primary={studioActive ? "Active" : "Inactive"}
            secondary={
              designer.studioAddon?.expiresAt
                ? `Until ${formatDate(designer.studioAddon.expiresAt)}`
                : "Never activated"
            }
            tone={studioActive ? "gold" : "neutral"}
          />
        </section>
      </div>

      {/* Lifetime stats */}
      {stats && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<Users className="h-4 w-4" />} label="Clients" value={stats.clients} />
          <StatCard icon={<Package className="h-4 w-4" />} label="Orders" value={stats.orders} />
          <StatCard icon={<ScanLine className="h-4 w-4" />} label="Scans completed" value={stats.completedScans} />
          <StatCard icon={<Megaphone className="h-4 w-4" />} label="Broadcasts" value={stats.broadcasts} />
          <StatCard icon={<Globe className="h-4 w-4" />} label="Featured posts" value={stats.featuredPosts} />
          <StatCard icon={<Sparkles className="h-4 w-4" />} label="Active boosts" value={stats.activeBoosts} />
          <StatCard
            icon={<Banknote className="h-4 w-4" />}
            label="Their order revenue"
            value={formatNGN(stats.totalCollectedNGN)}
          />
          <StatCard
            icon={<Banknote className="h-4 w-4" />}
            label="Paid to Stitcha"
            value={formatNGN(stats.paidToStitchaNGN)}
            highlight
          />
        </section>
      )}

      {/* Manual grants */}
      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/45">
          Manual grants
        </h2>
        <GrantsPanel designerId={id} onChange={refresh} />
      </section>

      {/* Recent payments + activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/45">
            Recent payments
          </h2>
          {payments.length === 0 ? (
            <p className="text-xs text-white/40">No payments submitted yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {payments.map((p) => (
                <li key={p._id} className="flex items-center justify-between gap-3 rounded-lg bg-black/20 px-3 py-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">
                      {p.purpose.replace("_", " ")}{" "}
                      <span className="font-mono text-[10px] text-white/45">{p.reference}</span>
                    </p>
                    <p className="text-[10px] text-white/45">
                      {formatNGN(p.amount)} · {formatDate(p.createdAt)}
                    </p>
                  </div>
                  <PaymentChip status={p.status} />
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/admin/payments"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-white/55 hover:text-white"
          >
            All payments <ExternalLink className="h-3 w-3" />
          </Link>
        </section>

        <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
            <ActivityIcon className="h-3 w-3" /> Recent activity
          </h2>
          {activity.length === 0 ? (
            <p className="text-xs text-white/40">No activity yet.</p>
          ) : (
            <ul className="space-y-1">
              {activity.slice(0, 12).map((a) => (
                <li key={a._id} className="rounded-lg bg-black/20 px-3 py-1.5 text-[11px]">
                  <p className="text-white/75">{a.details || a.action}</p>
                  <p className="text-[10px] text-white/35">{formatDate(a.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                              */
/* -------------------------------------------------------------------------- */

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-white/40">
        {icon} {label}
      </p>
      <p className="mt-0.5 text-sm text-white/85">{value}</p>
    </div>
  );
}

function PlanRow({
  label,
  primary,
  secondary,
  tone,
  warning,
}: {
  label: string;
  primary: string;
  secondary?: string;
  tone: "primary" | "gold" | "neutral";
  warning?: boolean;
}) {
  const tones = {
    primary: "bg-purple-500/15 text-purple-300",
    gold: "bg-amber-500/15 text-amber-300",
    neutral: "bg-white/[0.06] text-white/65",
  } as const;
  return (
    <div className="mb-2 flex items-center justify-between gap-3 last:mb-0">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{label}</p>
        <p className="mt-0.5 text-sm font-bold text-white">
          {primary}
          {warning && <span className="ml-1 text-red-400">!</span>}
        </p>
        {secondary && <p className="text-[10px] text-white/45">{secondary}</p>}
      </div>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tones[tone]}`}>
        {tone === "gold" ? "Premium" : tone === "primary" ? "Plus" : "—"}
      </span>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight
          ? "border-emerald-500/30 bg-emerald-500/[0.06]"
          : "border-white/8 bg-white/[0.02]"
      }`}
    >
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">
        {icon} {label}
      </p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function PaymentChip({ status }: { status: string }) {
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">
        <CheckCircle2 className="h-2.5 w-2.5" /> Verified
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-red-300">
        <XCircle className="h-2.5 w-2.5" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">
      Pending
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  GrantsPanel                                                                 */
/* -------------------------------------------------------------------------- */

function GrantsPanel({
  designerId,
  onChange,
}: {
  designerId: string;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [smsCount, setSmsCount] = useState(50);
  const [studioDays, setStudioDays] = useState(30);
  const [trialDays, setTrialDays] = useState(7);
  const [planId, setPlanId] = useState<"plus" | "pro">("plus");
  const [planDays, setPlanDays] = useState(30);
  const [reason, setReason] = useState("");

  async function send(payload: Record<string, unknown>) {
    setBusy(JSON.stringify(payload));
    try {
      const res = await fetch(`/api/admin/designers/${designerId}/grant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, reason: reason || undefined }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed");
      toast.success("Grant applied");
      setReason("");
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <input
        type="text"
        placeholder="Reason (visible to designer)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-md border border-white/8 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C75B39]/50"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Subscription */}
        <GrantBlock title="Subscription override">
          <div className="flex items-center gap-2">
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value as "plus" | "pro")}
              className="rounded-md border border-white/8 bg-black/30 px-2 py-1 text-xs text-white focus-visible:outline-none"
            >
              <option value="plus">Plus</option>
              <option value="pro">Pro</option>
            </select>
            <input
              type="number"
              min={1}
              max={365}
              value={planDays}
              onChange={(e) => setPlanDays(parseInt(e.target.value) || 30)}
              className="w-16 rounded-md border border-white/8 bg-black/30 px-2 py-1 text-xs text-white focus-visible:outline-none"
            />
            <span className="text-[10px] text-white/45">days</span>
          </div>
          <button
            onClick={() => send({ type: "subscription", planId, days: planDays })}
            disabled={!!busy}
            className="mt-2 w-full rounded-md bg-purple-500/20 px-3 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-500/30 disabled:opacity-50"
          >
            Grant {planId.toUpperCase()} for {planDays}d
          </button>
        </GrantBlock>

        {/* SMS */}
        <GrantBlock title="Free SMS credits">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={5000}
              value={smsCount}
              onChange={(e) => setSmsCount(parseInt(e.target.value) || 50)}
              className="w-20 rounded-md border border-white/8 bg-black/30 px-2 py-1 text-xs text-white focus-visible:outline-none"
            />
            <span className="text-[10px] text-white/45">SMS</span>
          </div>
          <button
            onClick={() => send({ type: "sms", count: smsCount })}
            disabled={!!busy}
            className="mt-2 w-full rounded-md bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50"
          >
            Grant {smsCount} SMS
          </button>
        </GrantBlock>

        {/* Studio */}
        <GrantBlock title="Studio addon">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={365}
              value={studioDays}
              onChange={(e) => setStudioDays(parseInt(e.target.value) || 30)}
              className="w-16 rounded-md border border-white/8 bg-black/30 px-2 py-1 text-xs text-white focus-visible:outline-none"
            />
            <span className="text-[10px] text-white/45">days</span>
          </div>
          <button
            onClick={() => send({ type: "studio", days: studioDays })}
            disabled={!!busy}
            className="mt-2 w-full rounded-md bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/30 disabled:opacity-50"
          >
            Grant Studio for {studioDays}d
          </button>
        </GrantBlock>

        {/* Trial scans (Plus burst) */}
        <GrantBlock title="Free AI scans (Plus burst)">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={90}
              value={trialDays}
              onChange={(e) => setTrialDays(parseInt(e.target.value) || 7)}
              className="w-16 rounded-md border border-white/8 bg-black/30 px-2 py-1 text-xs text-white focus-visible:outline-none"
            />
            <span className="text-[10px] text-white/45">days</span>
          </div>
          <button
            onClick={() => send({ type: "trial_scans", days: trialDays })}
            disabled={!!busy}
            className="mt-2 w-full rounded-md bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/30 disabled:opacity-50"
          >
            Grant {trialDays}d of Plus access
          </button>
        </GrantBlock>
      </div>
      {busy && (
        <p className="flex items-center gap-1.5 text-[11px] text-white/45">
          <Loader2 className="h-3 w-3 animate-spin" /> Applying grant…
        </p>
      )}
    </div>
  );
}

function GrantBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/20 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/45">{title}</p>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  SuspendButton                                                               */
/* -------------------------------------------------------------------------- */

function SuspendButton({
  designer,
  onChange,
}: {
  designer: DesignerData;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (designer.suspended) {
      setBusy(true);
      try {
        const res = await fetch(`/api/admin/designers/${designer._id}/suspend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ suspended: false }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Failed");
        toast.success("Account restored");
        onChange();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      } finally {
        setBusy(false);
      }
      return;
    }
    setOpen(true);
  }

  async function submitSuspend() {
    if (!reason.trim() || reason.trim().length < 3) {
      toast.error("Reason required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/designers/${designer._id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspended: true, reason: reason.trim() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed");
      toast.success("Account suspended");
      setOpen(false);
      setReason("");
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (open) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
        <p className="text-xs font-semibold text-red-200">Suspend this designer?</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="Reason — shown to the designer."
          className="mt-2 w-full resize-none rounded-md border border-red-500/30 bg-black/40 px-2 py-1 text-xs text-white placeholder:text-white/30 focus-visible:outline-none"
        />
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => { setOpen(false); setReason(""); }}
            className="rounded-md border border-white/8 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white/65"
          >
            Cancel
          </button>
          <button
            onClick={submitSuspend}
            disabled={busy || reason.trim().length < 3}
            className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm suspend"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition active:scale-95 ${
        designer.suspended
          ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
          : "bg-red-500/15 text-red-300 hover:bg-red-500/25"
      }`}
    >
      {designer.suspended ? (
        <>
          <ShieldCheck className="h-3.5 w-3.5" /> Restore account
        </>
      ) : (
        <>
          <ShieldOff className="h-3.5 w-3.5" /> Suspend
        </>
      )}
    </button>
  );
}

