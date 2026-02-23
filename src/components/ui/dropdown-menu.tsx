"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ---- Context ---- */
interface DropdownMenuContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext() {
  const ctx = React.useContext(DropdownMenuContext);
  if (!ctx) throw new Error("DropdownMenu compound components must be used within <DropdownMenu>");
  return ctx;
}

/* ---- Root ---- */
interface DropdownMenuProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function DropdownMenu({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: DropdownMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  return (
    <DropdownMenuContext.Provider value={{ open, onOpenChange: handleOpenChange, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

/* ---- Trigger ---- */
const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, children, ...props }, ref) => {
  const { open, onOpenChange, triggerRef } = useDropdownMenuContext();

  return (
    <button
      ref={(node) => {
        (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={(e) => {
        onClick?.(e);
        onOpenChange(!open);
      }}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

/* ---- Content ---- */
interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, align = "end", children, ...props }, ref) => {
    const { open, onOpenChange } = useDropdownMenuContext();
    const menuRef = React.useRef<HTMLDivElement>(null);

    // Close on outside click
    React.useEffect(() => {
      if (!open) return;

      const handleClick = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.closest(".relative")?.contains(e.target as Node)) {
          onOpenChange(false);
        }
      };

      // Delay to avoid immediate close from trigger click
      const timeout = setTimeout(() => {
        document.addEventListener("mousedown", handleClick);
      }, 0);

      return () => {
        clearTimeout(timeout);
        document.removeEventListener("mousedown", handleClick);
      };
    }, [open, onOpenChange]);

    // Close on Escape
    React.useEffect(() => {
      if (!open) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onOpenChange(false);
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [open, onOpenChange]);

    // Arrow key navigation
    React.useEffect(() => {
      if (!open || !menuRef.current) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        const items = menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not([disabled])");
        if (!items?.length) return;

        const activeIdx = Array.from(items).indexOf(document.activeElement as HTMLElement);

        if (e.key === "ArrowDown") {
          e.preventDefault();
          const next = activeIdx < items.length - 1 ? activeIdx + 1 : 0;
          items[next].focus();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const prev = activeIdx > 0 ? activeIdx - 1 : items.length - 1;
          items[prev].focus();
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [open]);

    if (!open) return null;

    return (
      <div
        ref={(node) => {
          (menuRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        role="menu"
        aria-orientation="vertical"
        className={cn(
          "glass absolute z-50 mt-1 min-w-[8rem] overflow-hidden rounded-xl p-1",
          "shadow-[var(--shadow-glass-lg)]",
          "animate-scale-in origin-top",
          align === "start" && "left-0",
          align === "center" && "left-1/2 -translate-x-1/2",
          align === "end" && "right-0",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
DropdownMenuContent.displayName = "DropdownMenuContent";

/* ---- Item ---- */
interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  destructive?: boolean;
}

const DropdownMenuItem = React.forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  ({ className, destructive, onClick, children, ...props }, ref) => {
    const { onOpenChange } = useDropdownMenuContext();

    return (
      <button
        ref={ref}
        role="menuitem"
        type="button"
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm",
          "text-left transition-colors",
          "focus:bg-charcoal-50 focus:outline-none",
          "disabled:pointer-events-none disabled:opacity-50",
          destructive
            ? "text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
            : "text-foreground hover:bg-charcoal-50",
          className
        )}
        onClick={(e) => {
          onClick?.(e);
          onOpenChange(false);
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);
DropdownMenuItem.displayName = "DropdownMenuItem";

/* ---- Separator ---- */
const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

/* ---- Label ---- */
const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-3 py-1.5 text-xs font-semibold text-muted-foreground", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
};
