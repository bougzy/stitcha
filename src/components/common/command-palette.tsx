"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Users,
  Package,
  ScanLine,
  Settings,
  Wallet,
  Plus,
  Calendar,
  Heart,
  Trophy,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  action?: () => void;
  section: string;
  keywords?: string[];
}

const commands: CommandItem[] = [
  // Navigation
  { id: "dashboard", label: "Go to Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, href: "/dashboard", section: "Navigation", keywords: ["home"] },
  { id: "clients", label: "Go to Clients", icon: <Users className="h-4 w-4" />, href: "/clients", section: "Navigation" },
  { id: "orders", label: "Go to Orders", icon: <Package className="h-4 w-4" />, href: "/orders", section: "Navigation" },
  { id: "finances", label: "Go to Finances", icon: <Wallet className="h-4 w-4" />, href: "/finances", section: "Navigation", keywords: ["money", "payment", "revenue"] },
  { id: "scan", label: "Go to Scan", icon: <ScanLine className="h-4 w-4" />, href: "/scan", section: "Navigation", keywords: ["measure"] },
  { id: "calendar", label: "Go to Calendar", icon: <Calendar className="h-4 w-4" />, href: "/calendar", section: "Navigation" },
  { id: "heartbeat", label: "Go to Heartbeat", icon: <Heart className="h-4 w-4" />, href: "/heartbeat", section: "Navigation" },
  { id: "rank", label: "Go to Rank", icon: <Trophy className="h-4 w-4" />, href: "/rank", section: "Navigation" },
  { id: "vault", label: "Go to Style Vault", icon: <Sparkles className="h-4 w-4" />, href: "/style-vault", section: "Navigation" },
  { id: "settings", label: "Go to Settings", icon: <Settings className="h-4 w-4" />, href: "/settings", section: "Navigation" },
  // Actions
  { id: "new-client", label: "Add New Client", icon: <Plus className="h-4 w-4" />, href: "/clients/new", section: "Actions", keywords: ["create", "add"] },
  { id: "new-order", label: "Create New Order", icon: <Plus className="h-4 w-4" />, href: "/orders/new", section: "Actions", keywords: ["create", "add"] },
  { id: "new-scan", label: "Generate Scan Link", icon: <ScanLine className="h-4 w-4" />, href: "/scan", section: "Actions", keywords: ["measure", "link"] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filteredCommands = query.length === 0
    ? commands
    : commands.filter((cmd) => {
        const search = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(search) ||
          cmd.keywords?.some((k) => k.includes(search))
        );
      });

  const sections = [...new Set(filteredCommands.map((c) => c.section))];

  const handleSelect = useCallback(
    (cmd: CommandItem) => {
      haptics.light();
      setOpen(false);
      setQuery("");
      if (cmd.href) {
        router.push(cmd.href);
      } else if (cmd.action) {
        cmd.action();
      }
    },
    [router]
  );

  // Keyboard shortcut to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      setQuery("");
    }
  }, [open]);

  // Arrow key navigation
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
        e.preventDefault();
        handleSelect(filteredCommands[selectedIndex]);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedIndex, filteredCommands, handleSelect]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-[#1A1A2E]/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="fixed inset-x-4 top-[15vh] z-[101] mx-auto max-w-lg overflow-hidden rounded-2xl border border-white/20 bg-white/95 shadow-2xl backdrop-blur-xl">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-[#1A1A2E]/5 px-4 py-3">
          <Search className="h-5 w-5 text-[#1A1A2E]/30" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search commands..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-sm text-[#1A1A2E] placeholder:text-[#1A1A2E]/30 focus:outline-none"
          />
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1 text-[#1A1A2E]/30 transition-colors hover:text-[#1A1A2E]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#1A1A2E]/40">
              No results found
            </div>
          ) : (
            sections.map((section) => (
              <div key={section}>
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#1A1A2E]/30">
                  {section}
                </p>
                {filteredCommands
                  .filter((cmd) => cmd.section === section)
                  .map((cmd) => {
                    const index = filteredCommands.indexOf(cmd);
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => handleSelect(cmd)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                          index === selectedIndex
                            ? "bg-[#C75B39]/8 text-[#C75B39]"
                            : "text-[#1A1A2E]/70 hover:bg-[#1A1A2E]/5"
                        )}
                      >
                        <span className={index === selectedIndex ? "text-[#C75B39]" : "text-[#1A1A2E]/40"}>
                          {cmd.icon}
                        </span>
                        {cmd.label}
                      </button>
                    );
                  })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-[#1A1A2E]/5 px-4 py-2">
          <p className="text-[10px] text-[#1A1A2E]/30">
            <kbd className="rounded border border-[#1A1A2E]/10 bg-[#1A1A2E]/5 px-1 py-0.5 text-[9px] font-medium">
              ↑↓
            </kbd>{" "}
            navigate{" "}
            <kbd className="rounded border border-[#1A1A2E]/10 bg-[#1A1A2E]/5 px-1 py-0.5 text-[9px] font-medium">
              ↵
            </kbd>{" "}
            select{" "}
            <kbd className="rounded border border-[#1A1A2E]/10 bg-[#1A1A2E]/5 px-1 py-0.5 text-[9px] font-medium">
              esc
            </kbd>{" "}
            close
          </p>
        </div>
      </div>
    </>
  );
}
