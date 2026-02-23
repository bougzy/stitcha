"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#FAFAF8] px-4">
      {/* Background mesh */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-[#C75B39]/[0.05] blur-[120px]" />
        <div className="absolute bottom-0 -left-24 h-[400px] w-[400px] rounded-full bg-[#D4A853]/[0.05] blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/70 p-10 text-center shadow-[0_8px_32px_rgba(26,26,46,0.08)] backdrop-blur-xl">
          {/* Illustration */}
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#C75B39]/10 to-[#D4A853]/10">
            <span className="text-5xl font-extrabold text-[#C75B39]/80">
              404
            </span>
          </div>

          {/* Content */}
          <h1 className="mb-2 text-2xl font-bold text-[#1A1A2E]">
            Page Not Found
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-[#1A1A2E]/55">
            The page you are looking for does not exist or has been moved.
            Let&apos;s get you back on track.
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/">
              <Button className="w-full sm:w-auto">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
