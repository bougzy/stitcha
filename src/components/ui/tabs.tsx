"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ---- Context ---- */
interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("Tabs compound components must be used within <Tabs>");
  return ctx;
}

/* ---- Root ---- */
interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ value: controlledValue, defaultValue = "", onValueChange, className, children, ...props }, ref) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;

    const handleValueChange = React.useCallback(
      (next: string) => {
        if (!isControlled) setUncontrolledValue(next);
        onValueChange?.(next);
      },
      [isControlled, onValueChange]
    );

    return (
      <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
        <div ref={ref} className={cn("w-full", className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);
Tabs.displayName = "Tabs";

/* ---- TabsList ---- */
const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={cn(
        "glass-subtle inline-flex items-center gap-1 rounded-xl p-1",
        className
      )}
      {...props}
    />
  )
);
TabsList.displayName = "TabsList";

/* ---- TabsTrigger ---- */
interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, children, ...props }, ref) => {
    const ctx = useTabsContext();
    const isActive = ctx.value === value;

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isActive}
        tabIndex={isActive ? 0 : -1}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-1.5",
          "text-sm font-medium transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          "disabled:pointer-events-none disabled:opacity-50",
          isActive
            ? "bg-white/80 text-foreground shadow-sm backdrop-blur-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-white/30",
          className
        )}
        onClick={() => ctx.onValueChange(value)}
        onKeyDown={(e) => {
          // Arrow key navigation between tabs
          const target = e.currentTarget;
          const tablist = target.closest("[role=tablist]");
          if (!tablist) return;
          const tabs = Array.from(tablist.querySelectorAll<HTMLButtonElement>("[role=tab]"));
          const idx = tabs.indexOf(target);

          let nextIdx: number | null = null;
          if (e.key === "ArrowRight") nextIdx = (idx + 1) % tabs.length;
          else if (e.key === "ArrowLeft") nextIdx = (idx - 1 + tabs.length) % tabs.length;
          else if (e.key === "Home") nextIdx = 0;
          else if (e.key === "End") nextIdx = tabs.length - 1;

          if (nextIdx !== null) {
            e.preventDefault();
            tabs[nextIdx].focus();
            tabs[nextIdx].click();
          }
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);
TabsTrigger.displayName = "TabsTrigger";

/* ---- TabsContent ---- */
interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, children, ...props }, ref) => {
    const ctx = useTabsContext();
    const isActive = ctx.value === value;

    if (!isActive) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        tabIndex={0}
        className={cn("mt-3 animate-fade-in focus-visible:outline-none", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
