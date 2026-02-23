"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/common/page-transition";

function BillingCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"verifying" | "success" | "failed">(
    "verifying"
  );
  const [planName, setPlanName] = useState("");

  useEffect(() => {
    const reference = searchParams.get("reference");
    if (!reference) {
      setStatus("failed");
      return;
    }

    async function verify() {
      try {
        const res = await fetch(
          `/api/billing/verify?reference=${encodeURIComponent(reference!)}`
        );
        const json = await res.json();
        if (json.success) {
          setStatus("success");
          setPlanName(json.data.planId);
        } else {
          setStatus("failed");
        }
      } catch {
        setStatus("failed");
      }
    }

    verify();
  }, [searchParams]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5">
      {status === "verifying" && (
        <>
          <Loader2 className="h-12 w-12 animate-spin text-[#C75B39]" />
          <p className="text-lg font-semibold text-[#1A1A2E]">
            Verifying your payment...
          </p>
        </>
      )}
      {status === "success" && (
        <>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring" }}
          >
            <CheckCircle2 className="h-16 w-16 text-emerald-500" />
          </motion.div>
          <h2 className="text-2xl font-bold text-[#1A1A2E]">
            Upgrade Successful!
          </h2>
          <p className="text-sm text-[#1A1A2E]/60">
            You are now on the{" "}
            {planName === "pro" ? "Professional" : "Business"} plan.
          </p>
          <Button onClick={() => router.push("/settings")}>
            Go to Settings
          </Button>
        </>
      )}
      {status === "failed" && (
        <>
          <XCircle className="h-16 w-16 text-red-400" />
          <h2 className="text-2xl font-bold text-[#1A1A2E]">
            Payment Failed
          </h2>
          <p className="text-sm text-[#1A1A2E]/60">
            Something went wrong with your payment. Please try again.
          </p>
          <Button onClick={() => router.push("/settings")}>
            Back to Settings
          </Button>
        </>
      )}
    </div>
  );
}

export default function BillingCallbackPage() {
  return (
    <PageTransition>
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#C75B39]" />
          </div>
        }
      >
        <BillingCallbackContent />
      </Suspense>
    </PageTransition>
  );
}
