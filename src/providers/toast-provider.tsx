"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 4000,
        style: {
          background: "rgba(250, 250, 248, 0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(199, 91, 57, 0.15)",
          color: "#1A1A2E",
          fontSize: "14px",
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(26, 26, 46, 0.08)",
        },
        classNames: {
          success: "stitcha-toast-success",
          error: "stitcha-toast-error",
        },
      }}
      theme="light"
      richColors={false}
      closeButton
      offset={16}
      gap={8}
    />
  );
}
