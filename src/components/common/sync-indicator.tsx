"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CloudOff, Loader2, AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type SyncStatus,
  onSyncStatusChange,
  initAutoSync,
} from "@/lib/offline-store";

export function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>("synced");
  const [pendingCount, setPendingCount] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    initAutoSync();

    const unsub = onSyncStatusChange((newStatus, count) => {
      setStatus(newStatus);
      setPendingCount(count);
    });

    return unsub;
  }, []);

  // Show indicator when not synced, hide after 3s when synced
  useEffect(() => {
    if (status !== "synced") {
      setVisible(true);
    } else if (visible) {
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [status, visible]);

  const config = {
    synced: {
      icon: Check,
      label: "Synced",
      bg: "bg-emerald-500/90",
      text: "text-white",
    },
    pending: {
      icon: Loader2,
      label: `Syncing${pendingCount > 0 ? ` (${pendingCount})` : ""}`,
      bg: "bg-amber-500/90",
      text: "text-white",
    },
    offline: {
      icon: CloudOff,
      label: "Offline",
      bg: "bg-slate-600/90",
      text: "text-white",
    },
    failed: {
      icon: AlertTriangle,
      label: `${pendingCount} unsaved`,
      bg: "bg-red-500/90",
      text: "text-white",
    },
  };

  const c = config[status];
  const Icon = c.icon;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-20 left-4 z-50 lg:bottom-6"
        >
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-lg backdrop-blur-sm",
              c.bg,
              c.text
            )}
          >
            <Icon
              className={cn(
                "h-3.5 w-3.5",
                status === "pending" && "animate-spin"
              )}
            />
            <span className="text-xs font-medium">{c.label}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
