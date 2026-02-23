"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, Loader2 } from "lucide-react";
import { syncQueue } from "@/lib/offline-store";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Auto-flush sync queue when we come back online
      syncQueue.flush().then(() => syncQueue.count().then(setPendingCount));
    };
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check pending sync count periodically
    const interval = setInterval(() => {
      syncQueue.count().then(setPendingCount);
    }, 10000);

    syncQueue.count().then(setPendingCount);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncQueue.flush();
      const count = await syncQueue.count();
      setPendingCount(count);
    } finally {
      setSyncing(false);
    }
  };

  if (!isOffline && pendingCount === 0) return null;

  return (
    <div
      className={`fixed left-0 right-0 top-16 z-40 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium shadow-sm ${
        isOffline
          ? "bg-amber-50 text-amber-800"
          : "bg-blue-50 text-blue-700"
      }`}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>You&apos;re offline — changes will sync automatically when you reconnect</span>
        </>
      ) : (
        <>
          <span>{pendingCount} change{pendingCount !== 1 ? "s" : ""} waiting to sync</span>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="ml-1 inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-blue-700 transition-colors hover:bg-blue-200"
          >
            {syncing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Sync now
          </button>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sync Status Dot — shows in header                                          */
/* -------------------------------------------------------------------------- */

export function SyncStatusDot() {
  const [status, setStatus] = useState<"synced" | "pending" | "offline">("synced");

  useEffect(() => {
    const update = async () => {
      if (!navigator.onLine) {
        setStatus("offline");
        return;
      }
      const { count } = await import("@/lib/offline-store").then((m) =>
        m.syncQueue.count().then((c) => ({ count: c }))
      );
      setStatus(count > 0 ? "pending" : "synced");
    };

    update();
    const interval = setInterval(update, 5000);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <div
      className={`h-2 w-2 rounded-full ${
        status === "synced"
          ? "bg-emerald-400"
          : status === "pending"
          ? "bg-amber-400 animate-pulse"
          : "bg-red-400"
      }`}
      title={
        status === "synced"
          ? "All changes synced"
          : status === "pending"
          ? "Changes pending sync"
          : "You're offline"
      }
    />
  );
}
