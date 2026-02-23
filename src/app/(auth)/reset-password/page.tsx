"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Lock, Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: ResetPasswordInput) {
    if (!token) {
      toast.error("Invalid or missing reset token.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Something went wrong");
        return;
      }

      setIsSuccess(true);
      toast.success("Password reset successfully!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  /* ---- No token state ---- */
  if (!token) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
          <Lock className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">Invalid Link</h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-[#1A1A2E]/55">
          This password reset link is invalid or has expired. Please request a
          new one.
        </p>
        <div className="mt-8">
          <Link href="/forgot-password">
            <Button className="w-full">Request New Link</Button>
          </Link>
        </div>
        <p className="mt-4 text-center text-sm text-[#1A1A2E]/55">
          <Link
            href="/login"
            className="font-semibold text-[#C75B39] transition-colors hover:text-[#933a22]"
          >
            Back to Sign In
          </Link>
        </p>
      </div>
    );
  }

  /* ---- Success state ---- */
  if (isSuccess) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#16a34a]/10">
          <CheckCircle2 className="h-8 w-8 text-[#16a34a]" />
        </div>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">
          Password Reset Successfully
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-[#1A1A2E]/55">
          Your password has been updated. You can now sign in with your new
          password.
        </p>
        <div className="mt-8">
          <Link href="/login">
            <Button className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  /* ---- Form state ---- */
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">
          Set New Password
        </h1>
        <p className="mt-1.5 text-sm text-[#1A1A2E]/55">
          Enter your new password below.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="relative">
          <Input
            label="New Password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter new password"
            autoComplete="new-password"
            icon={<Lock />}
            error={errors.password?.message}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[38px] text-[#1A1A2E]/40 transition-colors hover:text-[#1A1A2E]/70"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="relative">
          <Input
            label="Confirm Password"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm new password"
            autoComplete="new-password"
            icon={<Lock />}
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-[38px] text-[#1A1A2E]/40 transition-colors hover:text-[#1A1A2E]/70"
            aria-label={
              showConfirmPassword ? "Hide password" : "Show password"
            }
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={isLoading}>
          Reset Password
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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
