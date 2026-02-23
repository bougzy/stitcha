"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ScanLine,
  Link2,
  Copy,
  Check,
  Clock,
  Send,
  History,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  MessageCircle,
  Share2,
  Smartphone,
} from "lucide-react";
import { PageTransition } from "@/components/common/page-transition";
import { GlassCard } from "@/components/common/glass-card";
import { EmptyState } from "@/components/common/empty-state";
import { SectionLoader } from "@/components/common/loading";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Client } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface ScanSessionData {
  _id: string;
  designerId: string;
  clientId: string | null;
  client?: { name: string; phone?: string; email?: string; gender?: string } | null;
  isQuickScan?: boolean;
  guestName?: string | null;
  guestPhone?: string | null;
  linkCode: string;
  status: "pending" | "processing" | "completed" | "failed" | "expired";
  measurements?: Record<string, number> | null;
  scanUrl: string;
  expiresAt: string;
  createdAt: string;
}

interface GeneratedSession {
  _id: string;
  linkCode: string;
  scanUrl: string;
  clientName: string;
  businessName: string;
  expiresAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Animation variants                                                         */
/* -------------------------------------------------------------------------- */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  },
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "pending":
      return "warning";
    case "processing":
      return "secondary";
    case "completed":
      return "success";
    case "failed":
      return "destructive";
    case "expired":
      return "outline";
    default:
      return "outline";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Waiting";
    case "processing":
      return "Processing";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}

function formatTimeLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatDate(dateStr);
}

/* -------------------------------------------------------------------------- */
/*  Scan Management Page                                                       */
/* -------------------------------------------------------------------------- */

export default function ScanManagementPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<ScanSessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [generatedSession, setGeneratedSession] = useState<GeneratedSession | null>(null);
  const [copied, setCopied] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  /* ---- Fetch clients ---- */
  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch("/api/clients?limit=50");
        const json = await res.json();
        if (json.success) {
          setClients(json.data.clients);
        }
      } catch {
        toast.error("Failed to load clients");
      } finally {
        setLoadingClients(false);
      }
    }
    fetchClients();
  }, []);

  /* ---- Fetch sessions ---- */
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/scan/sessions?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setSessions(json.data);
      } else {
        throw new Error(json.error || "Failed to fetch scan sessions");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load scan sessions");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  /* ---- Generate scan link ---- */
  const handleGenerate = async (quickScan = false) => {
    if (!quickScan && !selectedClientId) {
      toast.error("Please select a client first");
      return;
    }

    try {
      setGenerating(true);
      const payload: Record<string, string> = {};
      if (!quickScan && selectedClientId) {
        payload.clientId = selectedClientId;
      }

      const res = await fetch("/api/scan/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to generate scan link");
      }

      setGeneratedSession(json.data);
      toast.success(quickScan ? "Quick scan link generated!" : "Scan link generated!");
      fetchSessions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate scan link");
    } finally {
      setGenerating(false);
    }
  };

  /* ---- Copy link ---- */
  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  /* ---- Share via WhatsApp (with client phone pre-filled if available) ---- */
  const handleWhatsAppShare = (url: string, clientName: string, clientPhone?: string) => {
    const message = encodeURIComponent(
      `Hello ${clientName}! Please use this link to take your body measurement photos for your fitting:\n\n${url}\n\nThe AI will guide you through 2 quick photos. This link expires in 24 hours. Thank you!`
    );

    // If we have the client's phone, pre-fill it
    if (clientPhone) {
      let formatted = clientPhone.replace(/\s+/g, "").replace(/^0/, "234");
      if (!formatted.startsWith("+") && !formatted.startsWith("234")) {
        formatted = "234" + formatted;
      }
      window.open(`https://wa.me/${formatted}?text=${message}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${message}`, "_blank");
    }
  };

  /* ---- Native share API ---- */
  const handleNativeShare = async (url: string, clientName: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Body Scan for ${clientName}`,
          text: `Hi ${clientName}! Use this link to take your measurement photos:`,
          url,
        });
      } catch {
        // User cancelled or share failed — fall back to copy
        handleCopy(url);
      }
    } else {
      handleCopy(url);
    }
  };

  /* ---- Split sessions ---- */
  const activeSessions = sessions.filter(
    (s) => s.status === "pending" || s.status === "processing"
  );
  const completedSessions = sessions.filter(
    (s) => s.status === "completed" || s.status === "failed" || s.status === "expired"
  );

  /* ---- Get selected client info ---- */
  const selectedClient = clients.find((c) => c._id === selectedClientId);

  return (
    <PageTransition>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6"
      >
        {/* ---- Header ---- */}
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">AI Body Scan</h1>
          <p className="mt-1 text-sm text-[#1A1A2E]/55">
            Generate scan links for clients to capture their body measurements with AI
          </p>
        </motion.div>

        {/* ---- Generate Scan Link Section ---- */}
        <motion.div variants={itemVariants}>
          <GlassCard gradientBorder padding="lg">
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#C75B39]/15 to-[#D4A853]/15">
                  <Link2 className="h-5 w-5 text-[#C75B39]" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#1A1A2E]">
                    Generate Scan Link
                  </h2>
                  <p className="text-xs text-[#1A1A2E]/50">
                    Create a link for your client to take AI measurement photos
                  </p>
                </div>
              </div>

              {/* Quick Scan */}
              <div className="rounded-xl border border-[#D4A853]/15 bg-gradient-to-r from-[#D4A853]/[0.04] to-[#C75B39]/[0.04] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A2E]">
                      Quick Scan
                    </p>
                    <p className="mt-0.5 text-xs text-[#1A1A2E]/50">
                      No client needed. They&apos;ll enter their details when they open the link.
                    </p>
                  </div>
                  <Button
                    onClick={() => handleGenerate(true)}
                    loading={generating}
                    disabled={generating}
                    size="lg"
                    className="w-full shrink-0 sm:w-auto"
                  >
                    <ScanLine className="h-4 w-4" />
                    Quick Scan Link
                  </Button>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[#1A1A2E]/8" />
                <span className="text-xs font-medium text-[#1A1A2E]/30">OR</span>
                <div className="h-px flex-1 bg-[#1A1A2E]/8" />
              </div>

              {/* Client selection + Generate */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Select
                    label="Select Existing Client"
                    placeholder="Choose a client..."
                    value={selectedClientId}
                    onChange={(e) => {
                      setSelectedClientId(e.target.value);
                      setGeneratedSession(null);
                    }}
                    disabled={loadingClients}
                    options={clients.map((c) => ({
                      value: c._id,
                      label: `${c.name} (${c.phone})`,
                    }))}
                  />
                </div>
                <Button
                  onClick={() => handleGenerate(false)}
                  loading={generating}
                  disabled={!selectedClientId || generating}
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <ScanLine className="h-4 w-4" />
                  Generate for Client
                </Button>
              </div>

              {/* Generated link result */}
              {generatedSession && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4 rounded-xl border border-[#C75B39]/10 bg-[#C75B39]/[0.03] p-4"
                >
                  {/* Success header */}
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">
                      Scan link ready for {generatedSession.clientName}
                    </span>
                  </div>

                  {/* Link URL */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#1A1A2E]/60">
                      Scan Link
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 truncate rounded-lg border border-[#1A1A2E]/10 bg-white/60 px-3 py-2.5 font-mono text-sm text-[#1A1A2E]">
                        {generatedSession.scanUrl}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(generatedSession.scanUrl)}
                        aria-label="Copy link"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Session info */}
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-[#D4A853]" />
                      <span className="text-[#1A1A2E]/70">
                        Expires:{" "}
                        <span className="font-medium text-[#1A1A2E]">
                          {formatTimeLeft(generatedSession.expiresAt)}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Link2 className="h-4 w-4 text-[#C75B39]" />
                      <span className="text-[#1A1A2E]/70">
                        Code:{" "}
                        <span className="font-mono font-medium text-[#1A1A2E]">
                          {generatedSession.linkCode}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Smartphone className="h-4 w-4 text-[#1A1A2E]/40" />
                      <span className="text-xs text-[#1A1A2E]/50">
                        Client opens on their phone
                      </span>
                    </div>
                  </div>

                  {/* Share buttons */}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="default"
                      className="flex-1 gap-2 bg-[#25D366] hover:bg-[#20BD5A]"
                      onClick={() =>
                        handleWhatsAppShare(
                          generatedSession.scanUrl,
                          generatedSession.clientName,
                          selectedClient?.phone
                        )
                      }
                    >
                      <MessageCircle className="h-4 w-4" />
                      Send via WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() =>
                        handleNativeShare(
                          generatedSession.scanUrl,
                          generatedSession.clientName
                        )
                      }
                    >
                      <Share2 className="h-4 w-4" />
                      Share Link
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 sm:flex-none"
                      onClick={() => handleCopy(generatedSession.scanUrl)}
                    >
                      <Copy className="h-4 w-4" />
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>

                  {/* How it works note */}
                  <div className="rounded-lg bg-[#D4A853]/5 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#D4A853]">
                      How it works
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#1A1A2E]/50">
                      Your client opens the link, enters their height, and takes
                      2 photos (front + side). Our AI processes the photos on
                      their phone and sends you the measurements. Photos are
                      never uploaded.
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* ---- Filter tabs ---- */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-1 rounded-xl bg-white/30 p-1 backdrop-blur-sm">
            {[
              { key: "all", label: "All" },
              { key: "pending", label: "Active" },
              { key: "completed", label: "Completed" },
              { key: "expired", label: "Expired" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  statusFilter === tab.key
                    ? "bg-white/80 text-[#1A1A2E] shadow-sm"
                    : "text-[#1A1A2E]/50 hover:text-[#1A1A2E]/70"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ---- Loading state ---- */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SectionLoader key={i} lines={2} />
            ))}
          </div>
        )}

        {/* ---- Active Sessions ---- */}
        {!loading && statusFilter !== "completed" && statusFilter !== "expired" && activeSessions.length > 0 && (
          <motion.div variants={itemVariants}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1A1A2E]">
                <Send className="h-4.5 w-4.5 text-[#C75B39]" />
                Active Scan Links
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchSessions}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
            <div className="space-y-2.5">
              {activeSessions.map((session, index) => (
                <motion.div
                  key={session._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: index * 0.05,
                    duration: 0.3,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                >
                  <GlassCard hover padding="sm">
                    <div className="flex items-center gap-3 px-1">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#C75B39]/12 to-[#D4A853]/12">
                        {session.status === "processing" ? (
                          <Loader2 className="h-5 w-5 animate-spin text-[#D4A853]" />
                        ) : (
                          <ScanLine className="h-5 w-5 text-[#C75B39]" strokeWidth={1.5} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-[#1A1A2E]">
                            {session.client?.name || "Unknown Client"}
                          </p>
                          {session.isQuickScan && (
                            <span className="shrink-0 rounded-full bg-[#D4A853]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#D4A853]">
                              QUICK
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#1A1A2E]/45">
                          <span className="font-mono">{session.linkCode}</span>
                          <span className="text-[#1A1A2E]/20">|</span>
                          <span>{formatRelativeTime(session.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                        <Badge variant={getStatusBadgeVariant(session.status)}>
                          {getStatusLabel(session.status)}
                        </Badge>
                        {session.status === "pending" && (
                          <span className="text-[10px] font-medium text-[#D4A853]">
                            {formatTimeLeft(session.expiresAt)}
                          </span>
                        )}
                      </div>

                      {/* Quick actions */}
                      {session.status === "pending" && (
                        <div className="flex gap-1">
                          <button
                            onClick={() =>
                              handleWhatsAppShare(
                                session.scanUrl,
                                session.client?.name || "there",
                                session.client?.phone
                              )
                            }
                            className="rounded-lg p-2 text-[#25D366] transition-colors hover:bg-[#25D366]/10"
                            aria-label="Share via WhatsApp"
                            title="Send via WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleCopy(session.scanUrl)}
                            className="rounded-lg p-2 text-[#1A1A2E]/40 transition-colors hover:bg-[#1A1A2E]/5 hover:text-[#1A1A2E]/70"
                            aria-label="Copy link"
                            title="Copy link"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ---- Completed / History ---- */}
        {!loading && statusFilter !== "pending" && completedSessions.length > 0 && (
          <motion.div variants={itemVariants}>
            <div className="mb-3 flex items-center gap-2">
              <History className="h-4.5 w-4.5 text-[#1A1A2E]/40" />
              <h2 className="text-lg font-semibold text-[#1A1A2E]">
                History
              </h2>
            </div>
            <div className="space-y-2.5">
              {completedSessions.map((session, index) => (
                <motion.div
                  key={session._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: index * 0.04,
                    duration: 0.3,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                >
                  <GlassCard padding="sm" className="opacity-80">
                    <div className="flex items-center gap-3 px-1">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#1A1A2E]/5">
                        <ScanLine className="h-5 w-5 text-[#1A1A2E]/30" strokeWidth={1.5} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-[#1A1A2E]/80">
                            {session.client?.name || session.guestName || "Unknown Client"}
                          </p>
                          {session.isQuickScan && (
                            <span className="shrink-0 rounded-full bg-[#D4A853]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#D4A853]">
                              QUICK
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#1A1A2E]/40">
                          <span className="font-mono">{session.linkCode}</span>
                          <span className="text-[#1A1A2E]/15">|</span>
                          <span>{formatRelativeTime(session.createdAt)}</span>
                          {session.status === "completed" && session.measurements && (
                            <>
                              <span className="text-[#1A1A2E]/15">|</span>
                              <span className="text-green-600">
                                {Object.keys(session.measurements).length} measurements
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <Badge variant={getStatusBadgeVariant(session.status)}>
                        {getStatusLabel(session.status)}
                      </Badge>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ---- Empty State ---- */}
        {!loading && sessions.length === 0 && (
          <motion.div variants={itemVariants}>
            <EmptyState
              icon={ScanLine}
              title="No scan sessions yet"
              description="Generate a scan link above to get started. Your client will open the link on their phone to take 2 photos and our AI will extract their body measurements."
            />
          </motion.div>
        )}
      </motion.div>
    </PageTransition>
  );
}
