"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, Send, MessageCircle } from "lucide-react";
import { GlassCard } from "@/components/common/glass-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

interface SatisfactionSurveyProps {
  /** What we're rating (e.g. "order", "measurement") */
  context: string;
  /** Order/measurement ID for tracking */
  contextId: string;
  /** Client name for personalization */
  clientName?: string;
  /** Callback when survey is submitted */
  onSubmit?: (data: { rating: number; feedback: string }) => void;
  /** Callback to dismiss */
  onDismiss?: () => void;
}

export function SatisfactionSurvey({
  context,
  contextId,
  clientName,
  onSubmit,
  onDismiss,
}: SatisfactionSurveyProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating === 0) return;
    haptics.success();
    onSubmit?.({ rating, feedback });
    setSubmitted(true);
    // Auto-dismiss after 2 seconds
    setTimeout(() => onDismiss?.(), 2000);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl bg-emerald-50/80 px-4 py-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100"
        >
          <Star className="h-6 w-6 text-emerald-600" fill="currentColor" />
        </motion.div>
        <p className="text-sm font-semibold text-emerald-700">Thank you for your feedback!</p>
        <p className="mt-1 text-xs text-emerald-600/70">
          This helps us improve Stitcha for you
        </p>
      </motion.div>
    );
  }

  return (
    <GlassCard padding="md" className="relative">
      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute right-3 top-3 rounded-lg p-1 text-[#1A1A2E]/20 transition-colors hover:text-[#1A1A2E]/50"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="flex items-center gap-2 text-[#1A1A2E]">
        <MessageCircle className="h-4 w-4 text-[#C75B39]" />
        <h3 className="text-sm font-semibold">
          How was this {context}?
        </h3>
      </div>

      {clientName && (
        <p className="mt-1 text-xs text-[#1A1A2E]/45">
          Rate your experience with {clientName}&apos;s {context}
        </p>
      )}

      {/* Star rating */}
      <div className="mt-4 flex items-center justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            onClick={() => {
              haptics.light();
              setRating(value);
            }}
            onMouseEnter={() => setHoveredRating(value)}
            onMouseLeave={() => setHoveredRating(0)}
            className="rounded-lg p-1 transition-transform hover:scale-110 active:scale-95"
          >
            <Star
              className={cn(
                "h-8 w-8 transition-colors",
                value <= (hoveredRating || rating)
                  ? "text-[#D4A853]"
                  : "text-[#1A1A2E]/10"
              )}
              fill={value <= (hoveredRating || rating) ? "currentColor" : "none"}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>

      {/* Rating label */}
      <AnimatePresence>
        {rating > 0 && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-1 text-center text-xs font-medium text-[#D4A853]"
          >
            {rating === 1
              ? "Needs improvement"
              : rating === 2
              ? "Could be better"
              : rating === 3
              ? "It was okay"
              : rating === 4
              ? "Very good!"
              : "Excellent!"}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Feedback textarea (shows after rating) */}
      <AnimatePresence>
        {rating > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-3"
          >
            <textarea
              placeholder="Any additional feedback? (optional)"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={2}
              className={cn(
                "glass-input flex w-full rounded-lg px-3 py-2",
                "text-xs text-foreground placeholder:text-muted-foreground",
                "focus-visible:outline-none resize-none"
              )}
            />
            <Button
              size="sm"
              onClick={handleSubmit}
              className="w-full gap-1.5"
            >
              <Send className="h-3 w-3" />
              Submit Feedback
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
