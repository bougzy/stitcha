"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { triggerInstallPrompt } from "@/components/common/install-prompt";

const quickRegisterSchema = z.object({
  email:    z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type QuickRegisterInput = z.infer<typeof quickRegisterSchema>;

const FREE_PERKS = [
  "Unlimited clients & orders",
  "WhatsApp measurement sharing",
  "Automated payment reminders",
  "PDF invoices",
  "Offline mode",
];

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<QuickRegisterInput>({ resolver: zodResolver(quickRegisterSchema) });

  async function onSubmit(data: QuickRegisterInput) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:        data.email,
          password:     data.password,
          name:         data.email.split("@")[0],
          phone:        "0000000000",
          businessName: "My Fashion Business",
        }),
      });
      const result = await response.json();
      if (!response.ok) { toast.error(result.error || "Registration failed"); return; }
      toast.success("Account created! Let's set up your profile.");
      // Nudge new users to install the PWA right after signup.
      setTimeout(() => triggerInstallPrompt(), 1200);
      router.push("/login?onboarding=1");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">Start for free</h1>
        <p className="mt-1.5 text-sm text-[#1A1A2E]/55">No credit card. No time limit. Genuinely free.</p>
      </div>

      <div className="mb-6 rounded-xl bg-emerald-50/60 px-4 py-3">
        <p className="mb-2 text-xs font-semibold text-emerald-700">Free plan includes:</p>
        <div className="space-y-1">
          {FREE_PERKS.map((perk) => (
            <div key={perk} className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span className="text-xs text-emerald-800">{perk}</span>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          icon={<Mail />}
          error={errors.email?.message}
          {...register("email")}
        />
        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Min. 6 characters"
            autoComplete="new-password"
            icon={<Lock />}
            error={errors.password?.message}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-9 text-[#1A1A2E]/40 hover:text-[#1A1A2E]/70"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Button type="submit" className="w-full" loading={isLoading}>
          Create free account
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-[#1A1A2E]/40">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-[#C75B39] hover:underline">Sign in</Link>
      </p>
      <p className="mt-3 text-center text-[10px] text-[#1A1A2E]/30">
        We will never spam you or sell your data.
      </p>
    </div>
  );
}
