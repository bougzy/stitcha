"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, icon, iconPosition = "left", id, ...props }, ref) => {
    const inputId = id || React.useId();
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && iconPosition === "left" && (
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4"
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
          <input
            type={type}
            id={inputId}
            className={cn(
              "glass-input flex h-10 w-full rounded-lg px-3 py-2",
              "text-sm text-foreground placeholder:text-muted-foreground",
              "focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              icon && iconPosition === "left" && "pl-10",
              icon && iconPosition === "right" && "pr-10",
              error && "border-destructive focus:border-destructive focus:ring-destructive/20",
              className
            )}
            ref={ref}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={errorId}
            {...props}
          />
          {icon && iconPosition === "right" && (
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4"
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
        </div>
        {error && (
          <p id={errorId} className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
