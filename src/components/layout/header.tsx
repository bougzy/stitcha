"use client";

import { cn } from "@/lib/utils";
import { useDesigner } from "@/hooks/use-designer";
import { getInitials } from "@/lib/utils";
import { Bell, ChevronRight, LogOut, Menu, Settings, User, CheckCheck } from "lucide-react";
import { SyncStatusDot } from "@/components/common/offline-banner";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface HeaderProps {
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Breadcrumb builder from pathname                                          */
/* -------------------------------------------------------------------------- */

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  let path = "";
  for (const segment of segments) {
    path += `/${segment}`;
    const label = segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    crumbs.push({ label, href: path });
  }

  return crumbs;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const TYPE_ICONS: Record<string, string> = {
  overdue_payment: "💰",
  deadline_approaching: "⏰",
  event_prep: "🎉",
  milestone: "🏆",
  system: "📢",
};

/* -------------------------------------------------------------------------- */
/*  Header component                                                          */
/* -------------------------------------------------------------------------- */

export function Header({ onToggleSidebar, sidebarCollapsed = false }: HeaderProps) {
  const pathname = usePathname();
  const { designer } = useDesigner();
  const breadcrumbs = getBreadcrumbs(pathname);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const initials = designer?.name ? getInitials(designer.name) : "S";

  /* Fetch notifications */
  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch("/api/notifications");
        const json = await res.json();
        if (json.success) {
          setNotifications(json.data.notifications);
          setUnreadCount(json.data.unreadCount);
        }
      } catch {
        // silent
      }
    }
    fetchNotifications();
    // Poll every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function markAllRead() {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  }

  async function markRead(id: string) {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silent
    }
  }

  /* Close dropdowns on outside click */
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target as Node)
    ) {
      setDropdownOpen(false);
    }
    if (
      notifRef.current &&
      !notifRef.current.contains(e.target as Node)
    ) {
      setNotifOpen(false);
    }
  }, []);

  useEffect(() => {
    if (dropdownOpen || notifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen, notifOpen, handleClickOutside]);

  return (
    <header
      className={cn(
        "fixed top-0 right-0 left-0 z-50 h-16",
        "border-b border-white/15 bg-white/60 backdrop-blur-xl",
        "shadow-[0_1px_12px_rgba(26,26,46,0.04)]",
        "pt-[env(safe-area-inset-top)]",
        sidebarCollapsed ? "lg:left-[72px]" : "lg:left-64"
      )}
    >
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        {/* Left section */}
        <div className="flex items-center gap-3">
          {/* Mobile: hamburger + logo */}
          <button
            onClick={onToggleSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#1A1A2E]/60 transition-colors hover:bg-[#1A1A2E]/5 hover:text-[#1A1A2E] lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Mobile logo */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 lg:hidden"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#C75B39] to-[#D4A853]">
              <span className="text-sm font-bold text-white">S</span>
            </div>
            <span className="text-lg font-semibold text-[#1A1A2E] tracking-tight">
              Stitcha
            </span>
          </Link>

          {/* Desktop: breadcrumbs */}
          <nav
            className="hidden items-center gap-1.5 text-sm lg:flex"
            aria-label="Breadcrumb"
          >
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.href} className="flex items-center gap-1.5">
                {index > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 text-[#1A1A2E]/30" />
                )}
                {index === breadcrumbs.length - 1 ? (
                  <span className="font-medium text-[#1A1A2E]">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-[#1A1A2E]/50 transition-colors hover:text-[#C75B39]"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Sync status */}
          <SyncStatusDot />

          {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setNotifOpen((prev) => !prev);
                setDropdownOpen(false);
              }}
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-xl text-[#1A1A2E]/60 transition-colors hover:bg-[#1A1A2E]/5 hover:text-[#1A1A2E]",
                notifOpen && "bg-[#1A1A2E]/5 text-[#1A1A2E]"
              )}
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C75B39] px-1 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {notifOpen && (
              <div
                className={cn(
                  "absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl",
                  "border border-white/20 bg-white/90 backdrop-blur-xl",
                  "shadow-[0_12px_40px_rgba(26,26,46,0.12)]",
                  "animate-in fade-in slide-in-from-top-2 duration-200"
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#1A1A2E]/5 px-4 py-3">
                  <p className="text-sm font-semibold text-[#1A1A2E]">
                    Notifications
                  </p>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="flex items-center gap-1 text-[10px] font-medium text-[#C75B39] hover:text-[#C75B39]/80"
                    >
                      <CheckCheck className="h-3 w-3" />
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notification list */}
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="mx-auto h-6 w-6 text-[#1A1A2E]/15" />
                      <p className="mt-2 text-xs text-[#1A1A2E]/40">
                        No notifications yet
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        className={cn(
                          "border-b border-[#1A1A2E]/3 px-4 py-3 transition-colors last:border-b-0",
                          !notif.read && "bg-[#C75B39]/3",
                          notif.link && "cursor-pointer hover:bg-[#1A1A2E]/3"
                        )}
                        onClick={() => {
                          if (!notif.read) markRead(notif._id);
                          if (notif.link) {
                            setNotifOpen(false);
                            window.location.href = notif.link;
                          }
                        }}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 text-base">
                            {TYPE_ICONS[notif.type] || "📢"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-[#1A1A2E]">
                                {notif.title}
                              </p>
                              {!notif.read && (
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#C75B39]" />
                              )}
                            </div>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-[#1A1A2E]/50">
                              {notif.message}
                            </p>
                            <p className="mt-1 text-[10px] text-[#1A1A2E]/30">
                              {timeAgo(notif.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Avatar dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => {
                setDropdownOpen((prev) => !prev);
                setNotifOpen(false);
              }}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold transition-all",
                "bg-gradient-to-br from-[#C75B39] to-[#D4A853] text-white",
                "hover:shadow-md hover:shadow-[#C75B39]/20",
                dropdownOpen && "ring-2 ring-[#C75B39]/30 ring-offset-2"
              )}
              aria-label="User menu"
            >
              {designer?.avatar ? (
                <img
                  src={designer.avatar}
                  alt={designer.name}
                  className="h-full w-full rounded-xl object-cover"
                />
              ) : (
                initials
              )}
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div
                className={cn(
                  "absolute right-0 top-full mt-2 w-52 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl",
                  "border border-white/20 bg-white/80 backdrop-blur-xl",
                  "shadow-[0_12px_40px_rgba(26,26,46,0.12)]",
                  "animate-in fade-in slide-in-from-top-2 duration-200"
                )}
              >
                {/* User info */}
                <div className="border-b border-[#1A1A2E]/5 px-4 py-3">
                  <p className="text-sm font-semibold text-[#1A1A2E] truncate">
                    {designer?.name || "Designer"}
                  </p>
                  <p className="text-xs text-[#1A1A2E]/50 truncate">
                    {designer?.email || ""}
                  </p>
                </div>

                {/* Menu items */}
                <div className="p-1.5">
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[#1A1A2E]/70 transition-colors hover:bg-[#1A1A2E]/5 hover:text-[#1A1A2E]"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[#1A1A2E]/70 transition-colors hover:bg-[#1A1A2E]/5 hover:text-[#1A1A2E]"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600/80 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
