"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---- Context ---- */
interface SheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheetContext() {
  const ctx = React.useContext(SheetContext);
  if (!ctx) throw new Error("Sheet compound components must be used within <Sheet>");
  return ctx;
}

/* ---- Root ---- */
interface SheetProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Sheet({ open: controlledOpen, defaultOpen = false, onOpenChange, children }: SheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
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
    <SheetContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
}

/* ---- Trigger ---- */
const SheetTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, children, ...props }, ref) => {
  const { onOpenChange } = useSheetContext();
  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => {
        onClick?.(e);
        onOpenChange(true);
      }}
      {...props}
    >
      {children}
    </button>
  );
});
SheetTrigger.displayName = "SheetTrigger";

/* ---- Content ---- */
type SheetSide = "left" | "right" | "bottom";

const slideClasses: Record<SheetSide, { base: string; open: string; closed: string }> = {
  left: {
    base: "fixed inset-y-0 left-0 h-full w-3/4 max-w-sm",
    open: "translate-x-0",
    closed: "-translate-x-full",
  },
  right: {
    base: "fixed inset-y-0 right-0 h-full w-3/4 max-w-sm",
    open: "translate-x-0",
    closed: "translate-x-full",
  },
  bottom: {
    base: "fixed inset-x-0 bottom-0 w-full max-h-[85vh]",
    open: "translate-y-0",
    closed: "translate-y-full",
  },
};

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: SheetSide;
  onClose?: () => void;
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ className, children, side = "right", onClose, ...props }, ref) => {
    const { open, onOpenChange } = useSheetContext();
    const [mounted, setMounted] = React.useState(false);
    const [visible, setVisible] = React.useState(false);

    React.useEffect(() => {
      setMounted(true);
    }, []);

    // Animate in/out with a slight delay
    React.useEffect(() => {
      if (open) {
        // Small timeout so the DOM renders with "closed" state first, then transitions to "open"
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
      } else {
        setVisible(false);
      }
    }, [open]);

    // Lock body scroll
    React.useEffect(() => {
      if (open) {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
          document.body.style.overflow = prev;
        };
      }
    }, [open]);

    // Escape key
    React.useEffect(() => {
      if (!open) return;
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onOpenChange(false);
          onClose?.();
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [open, onOpenChange, onClose]);

    if (!mounted || !open) return null;

    const { base, open: openClass, closed } = slideClasses[side];

    return createPortal(
      <div className="fixed inset-0 z-50">
        {/* Overlay */}
        <div
          className={cn(
            "fixed inset-0 bg-charcoal-950/40 backdrop-blur-sm transition-opacity duration-300",
            visible ? "opacity-100" : "opacity-0"
          )}
          aria-hidden="true"
          onClick={() => {
            onOpenChange(false);
            onClose?.();
          }}
        />
        {/* Panel */}
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          className={cn(
            base,
            "glass z-50 p-6 shadow-[var(--shadow-glass-lg)]",
            "transition-transform duration-300 ease-out",
            side === "bottom" && "rounded-t-2xl",
            visible ? openClass : closed,
            className
          )}
          {...props}
        >
          <button
            type="button"
            className={cn(
              "absolute right-4 top-4 rounded-md p-1",
              "text-muted-foreground hover:text-foreground",
              "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            aria-label="Close"
            onClick={() => {
              onOpenChange(false);
              onClose?.();
            }}
          >
            <X className="h-4 w-4" />
          </button>
          {children}
        </div>
      </div>,
      document.body
    );
  }
);
SheetContent.displayName = "SheetContent";

/* ---- Header ---- */
const SheetHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-2 mb-4", className)}
    {...props}
  />
));
SheetHeader.displayName = "SheetHeader";

/* ---- Title ---- */
const SheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

/* ---- Description ---- */
const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";

/* ---- Footer ---- */
const SheetFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end",
      className
    )}
    {...props}
  />
));
SheetFooter.displayName = "SheetFooter";

export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
};
