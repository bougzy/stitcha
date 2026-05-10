"use client";

/* -------------------------------------------------------------------------- */
/*  AdminNotificationBell                                                       */
/*                                                                              */
/*  Lives in the admin topbar. Polls /api/admin/notifications every 20s to    */
/*  detect new admin-scoped notifications. Shows:                              */
/*    • A red dot for any unread items                                         */
/*    • A bigger red badge with the action-required count                     */
/*    • A toast each time a NEW item lands while the admin is on a page      */
/*    • A click-through dropdown listing the latest 12 items, with deep      */
/*      links to the relevant admin surface                                   */
/* -------------------------------------------------------------------------- */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Bell, BellRing, CheckCheck, AlertTriangle, Banknote, CreditCard, ExternalLink } from "lucide-react";

interface AdminNotif {
  id: string;
  kind: string;
  severity: "action_required" | "info" | "warning";
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

const POLL_INTERVAL_MS = 20_000;
const SEEN_KEY = "stitcha:admin-notif-seen";

function getSeen(): string {
  if (typeof window === "undefined") return new Date(0).toISOString();
  try {
    return localStorage.getItem(SEEN_KEY) || new Date(0).toISOString();
  } catch {
    return new Date(0).toISOString();
  }
}
function setSeen(iso: string) {
  try { localStorage.setItem(SEEN_KEY, iso); } catch { /* ignore */ }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function severityClass(s: AdminNotif["severity"]) {
  if (s === "action_required") return "border-amber-500/30 bg-amber-500/[0.08]";
  if (s === "warning") return "border-red-500/30 bg-red-500/[0.08]";
  return "border-white/8 bg-white/[0.02]";
}

function iconFor(kind: string) {
  if (kind === "manual_payment_submitted") return <Banknote className="h-3.5 w-3.5" />;
  if (kind === "paystack_payment_succeeded") return <CreditCard className="h-3.5 w-3.5" />;
  if (kind === "broadcast_failed") return <AlertTriangle className="h-3.5 w-3.5" />;
  return <Bell className="h-3.5 w-3.5" />;
}

export function AdminNotificationBell() {
  const [items, setItems] = useState<AdminNotif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [actionCount, setActionCount] = useState(0);
  const [open, setOpen] = useState(false);
  const lastToastedRef = useRef<string>(getSeen());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications?limit=12");
      const json = await res.json();
      if (!json.success) return;
      const data = json.data;
      setItems(data.items);
      setUnreadCount(data.unreadCount);
      setActionCount(data.actionRequiredCount);

      // Toast for any new items since the last seen marker
      const lastSeen = lastToastedRef.current;
      const fresh = (data.items as AdminNotif[]).filter(
        (it) => it.createdAt > lastSeen,
      );
      if (fresh.length > 0) {
        // Only the newest one becomes a toast — avoid spamming
        const newest = fresh[0];
        toast(newest.title, {
          description: newest.message,
          action: newest.link
            ? {
                label: "Open",
                onClick: () => {
                  window.location.href = newest.link!;
                },
              }
            : undefined,
        });
        lastToastedRef.current = newest.createdAt;
        setSeen(newest.createdAt);
      }
    } catch {
      /* swallow — bell is best-effort */
    }
  }, []);

  /* Initial load + poll */
  useEffect(() => {
    refresh();
    const t = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [refresh]);

  /* Refresh on tab focus */
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  async function markRead(id: string) {
    try {
      await fetch(`/api/admin/notifications/${id}/read`, { method: "POST" });
      setItems((prev) => prev.map((p) => (p.id === id ? { ...p, read: true } : p)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  }

  async function markAllRead() {
    try {
      await fetch(`/api/admin/notifications/all/read?all=1`, { method: "POST" });
      setItems((prev) => prev.map((p) => ({ ...p, read: true })));
      setUnreadCount(0);
      setActionCount(0);
    } catch { /* ignore */ }
  }

  const hasAction = actionCount > 0;
  const hasUnread = unreadCount > 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/8 transition-colors ${
          hasAction
            ? "bg-amber-500/10 text-amber-300 hover:bg-amber-500/15"
            : hasUnread
            ? "bg-white/[0.06] text-white/85 hover:bg-white/[0.10]"
            : "bg-white/[0.02] text-white/55 hover:bg-white/[0.06]"
        }`}
        aria-label="Notifications"
      >
        {hasUnread ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {hasAction && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {actionCount > 9 ? "9+" : actionCount}
          </span>
        )}
        {!hasAction && hasUnread && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-400" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 z-50 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-white/8 bg-[#0f0f1a]/95 shadow-[0_24px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-white">Notifications</p>
                  <p className="text-[10px] text-white/45">
                    {unreadCount} unread
                    {actionCount > 0 && ` · ${actionCount} need action`}
                  </p>
                </div>
                {hasUnread && (
                  <button
                    onClick={markAllRead}
                    className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-white/65 hover:bg-white/[0.08]"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Mark all read
                  </button>
                )}
              </div>

              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <Bell className="h-8 w-8 text-white/20" />
                  <p className="text-xs text-white/45">All caught up.</p>
                </div>
              ) : (
                <ul className="max-h-[60vh] divide-y divide-white/5 overflow-y-auto">
                  {items.map((it) => (
                    <li key={it.id}>
                      <NotifRow item={it} onMarkRead={() => markRead(it.id)} closeBell={() => setOpen(false)} />
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotifRow({
  item,
  onMarkRead,
  closeBell,
}: {
  item: AdminNotif;
  onMarkRead: () => void;
  closeBell: () => void;
}) {
  const inner = (
    <div
      className={`relative flex gap-3 p-4 transition-colors hover:bg-white/[0.04] ${
        !item.read ? severityClass(item.severity) : "bg-transparent"
      }`}
    >
      {!item.read && (
        <span className="absolute right-3 top-4 h-1.5 w-1.5 rounded-full bg-amber-400" />
      )}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          item.severity === "action_required"
            ? "bg-amber-500/15 text-amber-300"
            : item.severity === "warning"
            ? "bg-red-500/15 text-red-300"
            : "bg-white/[0.06] text-white/65"
        }`}
      >
        {iconFor(item.kind)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-white">{item.title}</p>
        <p className="mt-0.5 line-clamp-2 text-[11px] text-white/55">{item.message}</p>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-[10px] text-white/35">{timeAgo(item.createdAt)}</p>
          {item.link && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-white/45">
              <ExternalLink className="h-2.5 w-2.5" />
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (item.link) {
    return (
      <Link
        href={item.link}
        onClick={() => {
          if (!item.read) onMarkRead();
          closeBell();
        }}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        if (!item.read) onMarkRead();
      }}
      className="block w-full text-left"
    >
      {inner}
    </button>
  );
}
