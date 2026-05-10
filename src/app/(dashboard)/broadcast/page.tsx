"use client";

/* -------------------------------------------------------------------------- */
/*  /broadcast — Send one message to many clients                              */
/*                                                                              */
/*  Three steps:                                                                */
/*    1. Pick segment (all, debtors, dormant, no measurements, VIP, etc.)      */
/*    2. Compose (English / Pidgin starter templates, {{name}} substitution)   */
/*    3. Pick channel (WhatsApp manual queue OR Termii SMS batch)              */
/*                                                                              */
/*  The WhatsApp path opens wa.me links one at a time — designer taps Send    */
/*  in WhatsApp, comes back, taps Next. Free, no API.                          */
/*  The SMS path sends through the existing Termii integration via            */
/*  /api/broadcast/sms — costs 1 credit per recipient.                         */
/* -------------------------------------------------------------------------- */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Megaphone,
  Users,
  AlertTriangle,
  Clock,
  Sparkles,
  Crown,
  MessageCircle,
  Send,
  ChevronRight,
  ExternalLink,
  Loader2,
  ArrowLeft,
  X,
  CheckCircle2,
  Languages,
  Calendar,
  History as HistoryIcon,
} from "lucide-react";
import { PageTransition } from "@/components/common/page-transition";
import { GlassCard } from "@/components/common/glass-card";
import { Button } from "@/components/ui/button";

interface Recipient {
  _id: string;
  name: string;
  phone: string;
  gender: string;
}

type Segment = "all" | "debtors" | "dormant" | "no-measure" | "vip" | "loyal" | "new" | "female" | "male";
type Channel = "whatsapp" | "sms";
type Timing = "now" | "later";
type Step = "segment" | "compose" | "channel" | "send-wa" | "send-sms" | "scheduled" | "done";

const SEGMENTS: { id: Segment; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "all",        label: "All clients",       description: "Everyone in your address book",         icon: Users },
  { id: "debtors",    label: "Owe money",          description: "Clients with outstanding balances",     icon: AlertTriangle },
  { id: "dormant",    label: "Dormant (90 days)",  description: "Haven't ordered in 3 months",          icon: Clock },
  { id: "no-measure", label: "No measurements",    description: "Need a scan or tape session",          icon: Sparkles },
  { id: "vip",        label: "VIP (5+ orders)",    description: "Your top regulars",                     icon: Crown },
  { id: "loyal",      label: "Loyal (3+ orders)",  description: "Repeat clients, not yet VIP",          icon: Crown },
  { id: "new",        label: "Just one order",     description: "First-time clients",                    icon: Users },
];

/* ---- English / Pidgin starter templates ---- */
const TEMPLATES: { id: string; label: string; en: string; pidgin: string }[] = [
  {
    id: "blank",
    label: "Blank",
    en: "",
    pidgin: "",
  },
  {
    id: "checkin",
    label: "Check-in",
    en: "Hi {{first_name}}! 👋 Just checking in — any new outfit you'd like me to make? I'd love to dress you up again. 🙏",
    pidgin: "Hello {{first_name}}! 👋 Long time no see o. Any new outfit wey you wan make? I dey here for you. 🙏",
  },
  {
    id: "promo",
    label: "Promotion",
    en: "Hi {{first_name}}! 🎉 Special offer this week — book any new order and get 10% off the first deposit. Reply YES to claim.",
    pidgin: "Hello {{first_name}}! 🎉 Special offer this week — book any new order and get 10% off your first deposit. Reply YES to claim am.",
  },
  {
    id: "owambe",
    label: "Owambe season",
    en: "Hi {{first_name}}! 👗 Owambe season is here. Book your aso-ebi or special outfit early so I can deliver on time. Slots are limited!",
    pidgin: "Hello {{first_name}}! 👗 Owambe season don land. Book your aso-ebi or your special outfit early so I go fit deliver on time. Space don dey reduce!",
  },
  {
    id: "reminder",
    label: "Outstanding balance",
    en: "Hi {{first_name}}, friendly reminder you have a balance with me. Please reply when you're ready to settle and I'll send the account details. Thank you. 🙏",
    pidgin: "Hello {{first_name}}, abeg I dey remind you small say balance still dey for your order. Reply when you ready to pay and I go send you account. Thank you. 🙏",
  },
];

/* ---- wa.me helpers ---- */
function cleanPhone(phone: string): string {
  let p = phone.replace(/[\s\-()+]/g, "");
  if (p.startsWith("0")) p = "234" + p.slice(1);
  if (!p.startsWith("234")) p = "234" + p;
  return p;
}
function waLink(phone: string, message: string): string {
  return `https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(message)}`;
}
function personalise(message: string, name: string): string {
  const first = name.split(" ")[0] || name;
  return message
    .replace(/\{\{\s*name\s*\}\}/gi, name)
    .replace(/\{\{\s*first_name\s*\}\}/gi, first);
}

/* -------------------------------------------------------------------------- */

export default function BroadcastPage() {
  const searchParams = useSearchParams();
  const resumeJobId = searchParams.get("resume");

  const [step, setStep] = useState<Step>("segment");
  const [segment, setSegment] = useState<Segment>("all");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [lang, setLang] = useState<"english" | "pidgin">("english");
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [timing, setTiming] = useState<Timing>("now");
  const [scheduledAt, setScheduledAt] = useState<string>(""); // datetime-local string
  const [smsBalance, setSmsBalance] = useState<number | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);

  /* WA queue state */
  const [waIdx, setWaIdx] = useState(0);
  const [waSentIds, setWaSentIds] = useState<Set<string>>(new Set());
  const [waJobId, setWaJobId] = useState<string | null>(null);

  /* SMS send state */
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState<{
    sent: number;
    failed: number;
    remaining: number;
  } | null>(null);

  /* ---- Resume a scheduled WhatsApp job from cron-fired notification ---- */
  useEffect(() => {
    if (!resumeJobId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/broadcast/schedule/${resumeJobId}`);
        const json = await res.json();
        if (!json.success || cancelled) {
          if (!cancelled) toast.error(json.error || "Couldn't load the scheduled broadcast.");
          return;
        }
        const data = json.data;
        if (data.channel !== "whatsapp") {
          // SMS jobs are dispatched server-side — designer doesn't need to do anything.
          toast.info("This SMS broadcast is handled by the system.");
          return;
        }
        const sentIds = new Set<string>(
          (data.recipients as { _id: string; sent: boolean }[])
            .filter((r) => r.sent)
            .map((r) => r._id),
        );
        const firstUnsent = (data.recipients as { _id: string }[]).findIndex(
          (r) => !sentIds.has(r._id),
        );
        setWaJobId(resumeJobId);
        setRecipients(data.recipients);
        setMessage(data.message);
        setLang(data.language || "english");
        setChannel("whatsapp");
        setStep("send-wa");
        setWaIdx(firstUnsent === -1 ? 0 : firstUnsent);
        setWaSentIds(sentIds);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Resume failed");
      }
    })();
    return () => { cancelled = true; };
  }, [resumeJobId]);

  /* ---- Load recipients on segment change ---- */
  const loadRecipients = useCallback(async (seg: Segment) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/broadcast/recipients?segment=${seg}`);
      const json = await res.json();
      if (json.success) {
        setRecipients(json.data.recipients);
      } else {
        toast.error(json.error || "Failed to load recipients");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { loadRecipients(segment); }, [loadRecipients, segment]);

  /* Load SMS balance when channel step opens */
  useEffect(() => {
    if (step !== "channel") return;
    fetch("/api/sms/buy")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setSmsBalance(j.data.balance);
      })
      .catch(() => {});
  }, [step]);

  /* ---- Step actions ---- */
  function applyTemplate(id: string) {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setMessage(lang === "pidgin" ? t.pidgin : t.en);
  }

  async function startWASend() {
    setWaIdx(0);
    setWaSentIds(new Set());

    // Create a BroadcastJob so the queue is observable in /broadcast/history
    try {
      const res = await fetch("/api/broadcast/whatsapp-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment,
          message,
          language: lang,
          recipients: recipients.map((r) => ({
            clientId: r._id,
            name: r.name,
            phone: r.phone,
          })),
        }),
      });
      const json = await res.json();
      if (json.success) setWaJobId(json.data.jobId);
    } catch {
      /* non-fatal — designer can still send, history just won't track */
    }

    setStep("send-wa");
  }

  async function startSMSSend() {
    setSmsSending(true);
    try {
      const res = await fetch("/api/broadcast/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientIds: recipients.map((r) => r._id),
          message,
          segment,
          language: lang,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "SMS broadcast failed");
        if (json.needsTopUp) {
          // Surface the upsell
          setStep("channel");
        }
        return;
      }
      setSmsResult({
        sent: json.data.sent,
        failed: json.data.failed,
        remaining: json.data.remainingBalance,
      });
      setStep("done");
    } finally {
      setSmsSending(false);
    }
  }

  async function scheduleBroadcast() {
    if (!scheduledAt) {
      toast.error("Pick a date and time first.");
      return;
    }
    const when = new Date(scheduledAt);
    if (isNaN(when.getTime()) || when.getTime() < Date.now() + 5 * 60 * 1000) {
      toast.error("Schedule at least 5 minutes from now.");
      return;
    }
    setScheduling(true);
    try {
      const res = await fetch("/api/broadcast/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientIds: recipients.map((r) => r._id),
          message,
          segment,
          language: lang,
          channel,
          scheduledFor: when.toISOString(),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Failed to schedule");
        return;
      }
      setScheduledFor(when.toISOString());
      setStep("scheduled");
    } finally {
      setScheduling(false);
    }
  }

  /* WA: when designer marks a recipient as sent, attach to the BroadcastJob */
  async function logWASent(r: Recipient) {
    if (!waJobId) return;
    try {
      await fetch("/api/broadcast/whatsapp-log", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: waJobId,
          clientId: r._id,
          message: personalise(message, r.name).slice(0, 280),
        }),
      });
    } catch { /* best-effort */ }
  }

  function markWASent(r: Recipient) {
    if (waSentIds.has(r._id)) return;
    const next = new Set(waSentIds);
    next.add(r._id);
    setWaSentIds(next);
    logWASent(r);
  }

  function nextWA() {
    const cur = recipients[waIdx];
    if (cur) markWASent(cur);
    if (waIdx + 1 >= recipients.length) {
      setStep("done");
    } else {
      setWaIdx(waIdx + 1);
    }
  }

  const messageValid = message.trim().length >= 5 && message.length <= 480;

  /* ====================================================================== */
  /*  Render                                                                  */
  /* ====================================================================== */

  return (
    <PageTransition>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-[#C75B39]" />
            <h1 className="text-2xl font-bold text-[#1A1A2E]">Broadcast</h1>
          </div>
          <p className="mt-1 text-sm text-[#1A1A2E]/55">
            Send one message to many clients — via your WhatsApp (free) or SMS (₦4 each).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/broadcast/history"
            className="hidden h-9 items-center gap-1.5 rounded-lg border border-[#1A1A2E]/10 bg-white/40 px-3 text-xs font-medium text-[#1A1A2E]/65 hover:bg-white/60 sm:inline-flex"
          >
            <HistoryIcon className="h-3.5 w-3.5" />
            History
          </Link>
          <BackHomeButton step={step} setStep={setStep} />
        </div>
      </header>

      {/* Progress dots */}
      <Progress step={step} />

      {/* ========================== STEP 1: SEGMENT ========================= */}
      {step === "segment" && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/50">
            Who are you reaching?
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {SEGMENTS.map((s) => {
              const Icon = s.icon;
              const active = segment === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSegment(s.id)}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                    active
                      ? "border-[#C75B39]/60 bg-[#C75B39]/[0.06] shadow-sm"
                      : "border-[#1A1A2E]/8 bg-white/40 hover:border-[#C75B39]/30"
                  }`}
                >
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${active ? "text-[#C75B39]" : "text-[#1A1A2E]/45"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#1A1A2E]">{s.label}</p>
                    <p className="mt-0.5 text-[11px] text-[#1A1A2E]/55">{s.description}</p>
                  </div>
                  {active && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#C75B39]" />}
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-[#1A1A2E]/8 bg-white/40 px-4 py-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-[#1A1A2E]/55">
                <Loader2 className="h-4 w-4 animate-spin" /> Counting recipients…
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#1A1A2E]/65">
                  <span className="font-semibold text-[#1A1A2E]">{recipients.length}</span>
                  {" "}recipient{recipients.length === 1 ? "" : "s"} match this segment.
                </p>
                <Button
                  onClick={() => setStep("compose")}
                  disabled={recipients.length === 0}
                >
                  Compose <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </motion.section>
      )}

      {/* ========================== STEP 2: COMPOSE ========================= */}
      {step === "compose" && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h2 className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/50">
            Compose
            <button
              onClick={() => setLang(lang === "english" ? "pidgin" : "english")}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-colors ${
                lang === "pidgin"
                  ? "bg-[#25D366]/10 text-[#25D366]"
                  : "bg-[#1A1A2E]/[0.05] text-[#1A1A2E]/55"
              }`}
            >
              <Languages className="h-3 w-3" />
              {lang === "english" ? "English" : "Pidgin"}
            </button>
          </h2>

          {/* Templates */}
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t.id)}
                className="rounded-full border border-[#1A1A2E]/10 bg-white/60 px-3 py-1 text-[11px] font-medium text-[#1A1A2E]/70 transition-colors hover:bg-white/80"
              >
                {t.label}
              </button>
            ))}
          </div>

          <textarea
            rows={6}
            placeholder={`Hi {{first_name}}!  …\n\nUse {{name}} or {{first_name}} to personalise.`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="glass-input w-full resize-none rounded-xl px-4 py-3 text-sm focus-visible:outline-none"
          />
          <div className="flex items-center justify-between text-[11px] text-[#1A1A2E]/45">
            <span>Variables: <code>{"{{name}}"}</code> · <code>{"{{first_name}}"}</code></span>
            <span className={message.length > 480 ? "text-red-600" : ""}>
              {message.length} / 480
            </span>
          </div>

          {/* Live preview */}
          {message && recipients[0] && (
            <div className="rounded-xl border border-[#1A1A2E]/8 bg-[#1A1A2E]/[0.03] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#1A1A2E]/45">
                Preview · sample for {recipients[0].name}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-[#1A1A2E]/85">
                {personalise(message, recipients[0].name)}
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("segment")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setStep("channel")} disabled={!messageValid}>
              Choose channel <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.section>
      )}

      {/* ========================== STEP 3: CHANNEL ========================= */}
      {step === "channel" && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/50">
            How do you want to send?
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* WhatsApp */}
            <button
              onClick={() => setChannel("whatsapp")}
              className={`flex flex-col items-start gap-2 rounded-2xl border p-5 text-left transition-all ${
                channel === "whatsapp"
                  ? "border-[#25D366] bg-[#25D366]/[0.06] shadow-sm"
                  : "border-[#1A1A2E]/8 bg-white/40 hover:border-[#25D366]/40"
              }`}
            >
              <MessageCircle className="h-7 w-7 text-[#25D366]" />
              <p className="text-base font-semibold text-[#1A1A2E]">WhatsApp queue</p>
              <p className="text-xs text-[#1A1A2E]/60">
                Stitcha opens each message in your own WhatsApp. You tap Send → Next →
                Send → Next.
              </p>
              <p className="mt-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                FREE · {recipients.length} recipients · ~{Math.ceil(recipients.length * 5 / 60)} min
              </p>
            </button>

            {/* SMS */}
            <button
              onClick={() => setChannel("sms")}
              className={`flex flex-col items-start gap-2 rounded-2xl border p-5 text-left transition-all ${
                channel === "sms"
                  ? "border-[#C75B39] bg-[#C75B39]/[0.06] shadow-sm"
                  : "border-[#1A1A2E]/8 bg-white/40 hover:border-[#C75B39]/40"
              }`}
            >
              <Send className="h-7 w-7 text-[#C75B39]" />
              <p className="text-base font-semibold text-[#1A1A2E]">SMS broadcast</p>
              <p className="text-xs text-[#1A1A2E]/60">
                Sent automatically via Termii. Works for clients without WhatsApp.
                Costs 1 SMS credit per recipient.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-full bg-[#C75B39]/10 px-2 py-0.5 text-[10px] font-bold text-[#C75B39]">
                  COSTS · {recipients.length} credits
                </span>
                {smsBalance != null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      smsBalance >= recipients.length
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    Balance: {smsBalance}
                  </span>
                )}
              </div>
            </button>
          </div>

          {channel === "sms" && smsBalance != null && smsBalance < recipients.length && timing === "now" && (
            <div className="rounded-xl border border-amber-300/50 bg-amber-50/60 p-3 text-xs text-amber-700">
              You need {recipients.length - smsBalance} more credit{recipients.length - smsBalance === 1 ? "" : "s"}.{" "}
              <Link href="/billing" className="font-semibold underline">Buy a pack</Link>
              {" "}to continue.
            </div>
          )}

          {/* When-to-send toggle */}
          <div className="rounded-2xl border border-[#1A1A2E]/8 bg-white/30 p-1">
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => setTiming("now")}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors ${
                  timing === "now"
                    ? "bg-white text-[#1A1A2E] shadow-sm"
                    : "text-[#1A1A2E]/55 hover:text-[#1A1A2E]"
                }`}
              >
                <Send className="h-3.5 w-3.5" />
                Send now
              </button>
              <button
                onClick={() => setTiming("later")}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors ${
                  timing === "later"
                    ? "bg-white text-[#1A1A2E] shadow-sm"
                    : "text-[#1A1A2E]/55 hover:text-[#1A1A2E]"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                Schedule for later
              </button>
            </div>
          </div>

          {timing === "later" && (
            <div className="rounded-xl border border-[#1A1A2E]/8 bg-white/40 p-4">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#1A1A2E]/50">
                When should this go out?
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={(() => {
                  const d = new Date(Date.now() + 6 * 60 * 1000);
                  // Strip seconds for datetime-local input
                  const pad = (n: number) => String(n).padStart(2, "0");
                  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                })()}
                className="glass-input flex h-11 w-full rounded-lg px-3 text-sm focus-visible:outline-none"
              />
              {channel === "whatsapp" ? (
                <p className="mt-2 text-[11px] text-[#1A1A2E]/50">
                  At that time you&apos;ll get a notification. Open it and walk through the WhatsApp queue.
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-[#1A1A2E]/50">
                  We&apos;ll send the SMS automatically. {recipients.length} credit{recipients.length === 1 ? "" : "s"} will be reserved at send time.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("compose")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {timing === "later" ? (
              <Button
                onClick={scheduleBroadcast}
                disabled={scheduling || !scheduledAt}
              >
                {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                Schedule
              </Button>
            ) : channel === "whatsapp" ? (
              <Button onClick={startWASend}>
                Open WhatsApp queue <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={startSMSSend}
                disabled={smsSending || (smsBalance != null && smsBalance < recipients.length)}
              >
                {smsSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send SMS to {recipients.length}
              </Button>
            )}
          </div>
        </motion.section>
      )}

      {/* ========================== STEP: SCHEDULED ========================= */}
      {step === "scheduled" && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard padding="lg">
            <div className="flex flex-col items-center text-center">
              <Calendar className="h-10 w-10 text-[#C75B39]" />
              <h2 className="mt-3 text-lg font-bold text-[#1A1A2E]">Broadcast scheduled</h2>
              {scheduledFor && (
                <p className="mt-1 text-sm text-[#1A1A2E]/60">
                  {recipients.length} recipient{recipients.length === 1 ? "" : "s"} ·
                  {" "}{channel === "whatsapp" ? "WhatsApp queue" : "SMS"} ·
                  {" "}{new Date(scheduledFor).toLocaleString("en-NG", {
                    weekday: "short", day: "numeric", month: "short",
                    hour: "numeric", minute: "2-digit",
                  })}
                </p>
              )}
              <p className="mt-3 text-xs text-[#1A1A2E]/45">
                {channel === "whatsapp"
                  ? "We'll notify you when it's time to walk through the queue."
                  : "We'll send the SMS automatically at the scheduled time."}
              </p>
              <div className="mt-5 flex gap-2">
                <Link
                  href="/broadcast/history"
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#1A1A2E]/10 bg-white/60 px-4 text-sm font-medium text-[#1A1A2E]/70"
                >
                  <HistoryIcon className="h-4 w-4" />
                  View scheduled
                </Link>
                <Button onClick={() => {
                  setStep("segment");
                  setMessage("");
                  setScheduledAt("");
                  setScheduledFor(null);
                  setTiming("now");
                }}>
                  New broadcast
                </Button>
              </div>
            </div>
          </GlassCard>
        </motion.section>
      )}

      {/* ====================== STEP 4a: WHATSAPP QUEUE ===================== */}
      {step === "send-wa" && recipients.length > 0 && (
        <WASendQueue
          recipients={recipients}
          message={message}
          waIdx={waIdx}
          sentIds={waSentIds}
          onMarkSent={markWASent}
          onNext={nextWA}
          onCancel={() => setStep("channel")}
        />
      )}

      {/* ============================ STEP DONE ============================= */}
      {step === "done" && (
        <DoneCard
          channel={channel}
          waSentCount={waSentIds.size}
          waTotal={recipients.length}
          smsResult={smsResult}
          onStartOver={() => {
            setStep("segment");
            setMessage("");
            setWaIdx(0);
            setWaSentIds(new Set());
            setSmsResult(null);
          }}
        />
      )}
    </PageTransition>
  );
}

/* -------------------------------------------------------------------------- */
/*  WASendQueue — open wa.me one at a time                                    */
/* -------------------------------------------------------------------------- */

function WASendQueue({
  recipients,
  message,
  waIdx,
  sentIds,
  onMarkSent,
  onNext,
  onCancel,
}: {
  recipients: Recipient[];
  message: string;
  waIdx: number;
  sentIds: Set<string>;
  onMarkSent: (r: Recipient) => void;
  onNext: () => void;
  onCancel: () => void;
}) {
  const cur = recipients[waIdx];
  // Hooks must run in the same order on every render — safe placeholders when
  // we briefly have no current recipient (e.g. between increments).
  const personal = useMemo(
    () => (cur ? personalise(message, cur.name) : ""),
    [message, cur],
  );
  const link = useMemo(
    () => (cur ? waLink(cur.phone, personal) : ""),
    [cur, personal],
  );
  if (!cur) return null;
  const progress = Math.round((sentIds.size / recipients.length) * 100);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div>
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/50">
          <span>Sending {waIdx + 1} of {recipients.length}</span>
          <span>{sentIds.size} sent</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#1A1A2E]/8">
          <div
            className="h-full bg-gradient-to-r from-[#25D366] to-[#128C7E] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <GlassCard padding="lg">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] text-base font-bold text-white">
            {cur.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-[#1A1A2E]">{cur.name}</p>
            <p className="text-xs text-[#1A1A2E]/55">{cur.phone}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-[#25D366]/[0.06] p-4">
          <p className="whitespace-pre-wrap text-sm text-[#1A1A2E]/85">{personal}</p>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onMarkSent(cur)}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-semibold text-white shadow-md active:scale-[0.98]"
          >
            <ExternalLink className="h-4 w-4" />
            Open in WhatsApp
          </a>
          <button
            onClick={onNext}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-[#1A1A2E]/10 bg-white/60 text-sm font-semibold text-[#1A1A2E]/70 active:bg-white/80"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-center text-[11px] text-[#1A1A2E]/40">
          Tap Open → tap Send in WhatsApp → come back → Next.
        </p>
      </GlassCard>

      <div className="flex justify-center">
        <button
          onClick={onCancel}
          className="text-xs font-medium text-[#1A1A2E]/45 underline"
        >
          Stop the broadcast
        </button>
      </div>
    </motion.section>
  );
}

/* -------------------------------------------------------------------------- */
/*  DoneCard                                                                    */
/* -------------------------------------------------------------------------- */

function DoneCard({
  channel,
  waSentCount,
  waTotal,
  smsResult,
  onStartOver,
}: {
  channel: Channel;
  waSentCount: number;
  waTotal: number;
  smsResult: { sent: number; failed: number; remaining: number } | null;
  onStartOver: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <GlassCard padding="lg">
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          <h2 className="mt-3 text-lg font-bold text-[#1A1A2E]">
            {channel === "whatsapp" ? "WhatsApp broadcast finished" : "SMS broadcast complete"}
          </h2>

          {channel === "whatsapp" && (
            <p className="mt-1 text-sm text-[#1A1A2E]/55">
              You sent <span className="font-semibold text-[#1A1A2E]">{waSentCount}</span>
              {" "}out of <span className="font-semibold">{waTotal}</span> messages.
            </p>
          )}
          {channel === "sms" && smsResult && (
            <>
              <p className="mt-1 text-sm text-[#1A1A2E]/55">
                <span className="font-semibold text-emerald-600">{smsResult.sent}</span> sent
                {smsResult.failed > 0 && (
                  <>
                    {" · "}
                    <span className="font-semibold text-red-600">{smsResult.failed}</span> failed (refunded)
                  </>
                )}
              </p>
              <p className="mt-1 text-xs text-[#1A1A2E]/45">
                {smsResult.remaining.toLocaleString("en-NG")} SMS credits remaining
              </p>
            </>
          )}

          <div className="mt-5 flex gap-2">
            <Button variant="outline" onClick={onStartOver}>
              New broadcast
            </Button>
            <Link
              href="/heartbeat"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#1A1A2E]/10 bg-white/60 px-4 text-sm font-medium text-[#1A1A2E]/70"
            >
              View engagement
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </GlassCard>
    </motion.section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Progress dots                                                               */
/* -------------------------------------------------------------------------- */

function Progress({ step }: { step: Step }) {
  const order: Step[] = ["segment", "compose", "channel"];
  const inFlight = step === "send-wa" || step === "send-sms";
  const idx = order.indexOf(step);
  return (
    <div className="mb-6 flex items-center gap-2">
      {order.map((s, i) => (
        <div
          key={s}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            i <= idx || inFlight || step === "done"
              ? "bg-gradient-to-r from-[#C75B39] to-[#D4A853]"
              : "bg-[#1A1A2E]/8"
          }`}
        />
      ))}
    </div>
  );
}

function BackHomeButton({
  step,
  setStep,
}: {
  step: Step;
  setStep: (s: Step) => void;
}) {
  if (step === "segment" || step === "done") return null;
  return (
    <button
      onClick={() => setStep("segment")}
      className="flex h-9 items-center gap-1.5 rounded-lg text-xs font-medium text-[#1A1A2E]/50 hover:text-[#1A1A2E]"
    >
      <X className="h-4 w-4" /> Cancel
    </button>
  );
}
