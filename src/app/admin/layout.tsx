"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  Activity,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Designers", href: "/admin/designers", icon: Users },
  { label: "Activity", href: "/admin/activity", icon: Activity },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const checkAuth = useCallback(async () => {
    // Skip auth check for login page
    if (pathname === "/admin/login") {
      setAuthenticated(true);
      return;
    }

    try {
      const res = await fetch("/api/admin/auth");
      if (!res.ok) {
        router.replace("/admin/login");
        return;
      }
      setAuthenticated(true);
    } catch {
      router.replace("/admin/login");
    }
  }, [pathname, router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  }

  // Login page renders without the admin shell
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // Loading state while checking auth
  if (authenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f1a]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#C75B39]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0f0f1a]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r border-white/5 bg-[#12121f] transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar header */}
        <div className="flex h-16 items-center justify-between border-b border-white/5 px-5">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#C75B39] to-[#D4A853]">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white">Stitcha</span>
              <span className="ml-1 rounded bg-[#C75B39]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#C75B39]">
                ADMIN
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-white/40 hover:text-white/70 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {adminNavItems.map(({ label, href, icon: Icon }) => {
              const isActive =
                href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(href);

              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                      isActive
                        ? "bg-[#C75B39]/10 text-[#C75B39]"
                        : "text-white/50 hover:bg-white/5 hover:text-white/80"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[#C75B39]" />
                    )}
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-white/5 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
          <Link
            href="/dashboard"
            className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/30 transition-colors hover:bg-white/5 hover:text-white/50"
          >
            <ChevronLeft className="h-5 w-5" />
            <span>Back to App</span>
          </Link>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/5 bg-[#0f0f1a]/80 px-4 backdrop-blur-xl lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white/50 hover:text-white lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-sm font-medium text-white/60">
              {adminNavItems.find(
                (n) =>
                  n.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(n.href)
              )?.label || "Admin"}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/30">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            Admin Session Active
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
