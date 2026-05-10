"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Megaphone, Send, CheckCircle2, Loader2, Users } from "lucide-react";

const SEGMENTS: { id: "all" | "free" | "plus" | "pro"; label: string; description: string }[] = [
  { id: "all",  label: "All designers",      description: "Everyone — Free, Plus, Pro" },
  { id: "free", label: "Free plan only",     description: "Best for upgrade nudges" },
  { id: "plus", label: "Plus plan only",     description: "Existing paid users" },
  { id: "pro",  label: "Pro plan only",      description: "Top tier" },
];

export default function AdminAnnouncePage() {
  const [segment, setSegment] = useState<"all" | "free" | "plus" | "pro">("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("/dashboard");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ recipientCount: number; segment: string } | null>(null);

  async function send() {
    if (title.trim().length < 3) {
      toast.error("Title is too short.");
      return;
    }
    if (message.trim().length < 5) {
      toast.error("Message is too short.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          link: link.trim() || "/dashboard",
          segment,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed");
      setResult(json.data);
      setTitle("");
      setMessage("");
      setLink("/dashboard");
      toast.success(`Sent to ${json.data.recipientCount} designer${json.data.recipientCount === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-[#C75B39]" />
          <h1 className="text-2xl font-bold text-white">Announce</h1>
        </div>
        <p className="mt-1 text-sm text-white/55">
          Push an in-app notification to every designer (or a plan segment). Free, instant.
        </p>
      </header>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
          <div>
            <p className="text-sm font-semibold text-white">Announcement sent</p>
            <p className="text-xs text-white/65">
              Delivered to {result.recipientCount} designer{result.recipientCount === 1 ? "" : "s"} on the {result.segment} segment.
            </p>
          </div>
        </motion.div>
      )}

      {/* Segment */}
      <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/45">
          Who gets this?
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {SEGMENTS.map((s) => {
            const active = segment === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSegment(s.id)}
                className={`flex items-start gap-2 rounded-xl border p-3 text-left transition-colors ${
                  active
                    ? "border-[#C75B39]/60 bg-[#C75B39]/[0.10]"
                    : "border-white/8 bg-white/[0.02] hover:border-white/15"
                }`}
              >
                <Users className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-[#C75B39]" : "text-white/45"}`} />
                <div>
                  <p className="text-sm font-semibold text-white">{s.label}</p>
                  <p className="mt-0.5 text-[11px] text-white/55">{s.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Compose */}
      <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/45">
          Message
        </h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/45">
              Title
            </label>
            <input
              type="text"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="📢 New Discover boost feature"
              className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#C75B39]/50 focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-white/40">{title.length} / 120</p>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/45">
              Message
            </label>
            <textarea
              rows={4}
              value={message}
              maxLength={1000}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What's the news?"
              className="w-full resize-none rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#C75B39]/50 focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-white/40">{message.length} / 1000</p>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/45">
              Link (optional)
            </label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/dashboard or /billing"
              className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#C75B39]/50 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Send */}
      <div className="flex justify-end">
        <button
          onClick={send}
          disabled={busy || title.trim().length < 3 || message.trim().length < 5}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-5 text-sm font-semibold text-white shadow-md disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send announcement
        </button>
      </div>
    </div>
  );
}
