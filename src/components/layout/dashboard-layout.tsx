"use client";

import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { useState, type ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="relative min-h-screen bg-[#FAFAF8]">
      {/* Background mesh gradient */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-[#C75B39]/[0.04] blur-[120px]" />
        <div className="absolute top-1/3 -left-24 h-[400px] w-[400px] rounded-full bg-[#D4A853]/[0.05] blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-[350px] w-[350px] rounded-full bg-[#F5E6D3]/[0.08] blur-[100px]" />
      </div>

      {/* Sidebar (desktop + mobile drawer) */}
      <Sidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* Header */}
      <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} sidebarCollapsed={sidebarCollapsed} />

      {/* Main content */}
      <main
        className={cn(
          "relative z-10 min-h-screen pt-16 transition-all duration-300",
          /* Desktop sidebar offset */
          sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-64",
          /* Bottom padding for mobile nav */
          "pb-24 lg:pb-8"
        )}
      >
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <MobileNav />
    </div>
  );
}
