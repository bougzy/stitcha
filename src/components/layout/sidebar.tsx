"use client";

import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  LayoutDashboard,
  Package,
  ScanLine,
  Settings,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* -------------------------------------------------------------------------- */
/*  Navigation items                                                          */
/* -------------------------------------------------------------------------- */

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Orders", href: "/orders", icon: Package },
  { label: "Scan", href: "/scan", icon: ScanLine },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

/* -------------------------------------------------------------------------- */
/*  Sidebar component                                                         */
/* -------------------------------------------------------------------------- */

interface SidebarProps {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

export function Sidebar({
  open,
  collapsed,
  onClose,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-[#1A1A2E]/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 flex h-full flex-col",
          "border-r border-white/15 bg-white/70 backdrop-blur-xl",
          "shadow-[4px_0_24px_rgba(26,26,46,0.04)]",
          "transition-all duration-300 ease-in-out",
          /* Desktop */
          "lg:z-30",
          collapsed ? "lg:w-[72px]" : "lg:w-64",
          /* Mobile */
          "w-72 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* ---- Header area ---- */}
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-[#1A1A2E]/5",
            collapsed ? "justify-center px-3" : "justify-between px-5"
          )}
        >
          {/* Logo */}
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2.5",
              collapsed && "lg:justify-center"
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#C75B39] to-[#D4A853] shadow-md shadow-[#C75B39]/15">
              <span className="text-sm font-bold text-white">S</span>
            </div>
            {!collapsed && (
              <span className="text-lg font-semibold text-[#1A1A2E] tracking-tight">
                Stitcha
              </span>
            )}
          </Link>

          {/* Close button (mobile) */}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#1A1A2E]/50 transition-colors hover:bg-[#1A1A2E]/5 hover:text-[#1A1A2E] lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Collapse toggle (desktop) */}
          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              className="hidden h-8 w-8 items-center justify-center rounded-lg text-[#1A1A2E]/40 transition-colors hover:bg-[#1A1A2E]/5 hover:text-[#1A1A2E] lg:flex"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ---- Navigation ---- */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems.map(({ label, href, icon: Icon }) => {
              const isActive =
                href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(href);

              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      collapsed && "lg:justify-center lg:px-0",
                      isActive
                        ? "bg-[#C75B39]/8 text-[#C75B39]"
                        : "text-[#1A1A2E]/60 hover:bg-[#1A1A2E]/5 hover:text-[#1A1A2E]"
                    )}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[#C75B39]" />
                    )}

                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        isActive
                          ? "text-[#C75B39]"
                          : "text-[#1A1A2E]/45 group-hover:text-[#1A1A2E]/70"
                      )}
                      strokeWidth={isActive ? 2 : 1.5}
                    />

                    {!collapsed && <span>{label}</span>}

                    {/* Tooltip for collapsed state */}
                    {collapsed && (
                      <span className="pointer-events-none absolute left-full ml-3 hidden rounded-lg bg-[#1A1A2E] px-2.5 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 lg:block">
                        {label}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ---- Footer / expand button (collapsed) ---- */}
        {collapsed && (
          <div className="hidden shrink-0 border-t border-[#1A1A2E]/5 p-3 lg:block">
            <button
              onClick={onToggleCollapse}
              className="flex h-9 w-full items-center justify-center rounded-xl text-[#1A1A2E]/40 transition-colors hover:bg-[#1A1A2E]/5 hover:text-[#1A1A2E]"
              aria-label="Expand sidebar"
            >
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
