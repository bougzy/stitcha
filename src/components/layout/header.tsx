"use client";

import { cn } from "@/lib/utils";
import { useDesigner } from "@/hooks/use-designer";
import { getInitials } from "@/lib/utils";
import { Bell, ChevronRight, LogOut, Menu, Settings, User } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface HeaderProps {
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
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

/* -------------------------------------------------------------------------- */
/*  Header component                                                          */
/* -------------------------------------------------------------------------- */

export function Header({ onToggleSidebar, sidebarCollapsed = false }: HeaderProps) {
  const pathname = usePathname();
  const { designer } = useDesigner();
  const breadcrumbs = getBreadcrumbs(pathname);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = designer?.name ? getInitials(designer.name) : "S";

  /* Close dropdown on outside click */
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target as Node)
    ) {
      setDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen, handleClickOutside]);

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
          {/* Notification bell */}
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[#1A1A2E]/60 transition-colors hover:bg-[#1A1A2E]/5 hover:text-[#1A1A2E]"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {/* Dot indicator */}
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#C75B39]" />
          </button>

          {/* Avatar dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
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
