"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Sparkles,
  Users,
  Menu,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* -------------------------------------------------------------------------- */
/*  Navigation items                                                          */
/* -------------------------------------------------------------------------- */

const navItems = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Orders", href: "/orders", icon: Package },
  { label: "Vault", href: "/style-vault", icon: Sparkles },
  { label: "More", href: "/settings", icon: Menu },
] as const;

/* -------------------------------------------------------------------------- */
/*  MobileNav component                                                       */
/* -------------------------------------------------------------------------- */

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 lg:hidden",
        "border-t border-white/15 bg-white/75 backdrop-blur-2xl",
        "shadow-[0_-4px_24px_rgba(26,26,46,0.06)]",
        "pb-[env(safe-area-inset-bottom)]"
      )}
    >
      <ul className="flex items-center justify-around px-2 pt-1.5 pb-1.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "group flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors",
                  isActive
                    ? "text-[#C75B39]"
                    : "text-[#1A1A2E]/40 hover:text-[#1A1A2E]/60"
                )}
              >
                <div className="relative flex items-center justify-center">
                  {/* Active background pill */}
                  {isActive && (
                    <span className="absolute -inset-x-2 -inset-y-0.5 rounded-lg bg-[#C75B39]/10" />
                  )}
                  <Icon
                    className="relative h-5 w-5"
                    strokeWidth={isActive ? 2 : 1.5}
                    fill={isActive ? "currentColor" : "none"}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] leading-tight",
                    isActive ? "font-semibold" : "font-medium"
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
