"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const forgotPasswordSchema = z.object({
  email: z.email("Please enter a valid email"),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: ForgotPasswordInput) {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Something went wrong");
        return;
      }

      setIsSubmitted(true);
      toast.success("Reset instructions sent!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  /* ---- Success State ---- */
  if (isSubmitted) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#16a34a]/10">
          <CheckCircle2 className="h-8 w-8 text-[#16a34a]" />
        </div>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">Check Your Email</h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-[#1A1A2E]/55">
          If an account exists with that email, we&apos;ve sent password reset
          instructions. Please check your inbox and spam folder.
        </p>
        <div className="mt-8">
          <Link href="/login">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  /* ---- Form State ---- */
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">Reset Password</h1>
        <p className="mt-1.5 text-sm text-[#1A1A2E]/55">
          Enter your email and we&apos;ll send you instructions to reset your
          password.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          icon={<Mail />}
          error={errors.email?.message}
          {...register("email")}
        />

        <Button type="submit" className="w-full" size="lg" loading={isLoading}>
          Send Reset Instructions
        </Button>
      </form>

      {/* Back to login */}
      <p className="mt-6 text-center text-sm text-[#1A1A2E]/55">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-semibold text-[#C75B39] transition-colors hover:text-[#933a22]"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
