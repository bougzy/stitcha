"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-lg text-sm font-semibold",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.98]",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-md hover:bg-terracotta-600 hover:shadow-lg",
        secondary:
          "bg-secondary text-secondary-foreground shadow-md hover:bg-gold-500 hover:shadow-lg",
        outline:
          "border border-charcoal-200 bg-transparent text-foreground hover:bg-charcoal-50 hover:border-charcoal-300",
        ghost:
          "text-foreground hover:bg-charcoal-50",
        destructive:
          "bg-destructive text-destructive-foreground shadow-md hover:bg-red-700 hover:shadow-lg",
        link:
          "text-primary underline-offset-4 hover:underline p-0 h-auto",
        glass: [
          "glass text-foreground",
          "hover:bg-white/80 hover:shadow-[var(--shadow-glass-lg)]",
          "hover:-translate-y-0.5",
        ].join(" "),
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-md",
        default: "h-10 px-5 py-2",
        lg: "h-12 px-8 text-base rounded-xl",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <Loader2 className="animate-spin" aria-hidden="true" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
