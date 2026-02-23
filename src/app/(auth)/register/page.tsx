"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { User, Mail, Phone, Building2, Lock, Eye, EyeOff } from "lucide-react";
import { registerSchema, type RegisterInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      businessName: "",
      password: "",
    },
  });

  async function onSubmit(data: RegisterInput) {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Registration failed");
        return;
      }

      toast.success("Account created successfully! Please sign in.");
      router.push("/login");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">Create Account</h1>
        <p className="mt-1.5 text-sm text-[#1A1A2E]/55">
          Start your fashion journey with Stitcha
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          placeholder="Enter your full name"
          autoComplete="name"
          icon={<User />}
          error={errors.name?.message}
          {...register("name")}
        />

        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          icon={<Mail />}
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label="Phone Number"
          type="tel"
          placeholder="08012345678"
          autoComplete="tel"
          icon={<Phone />}
          error={errors.phone?.message}
          {...register("phone")}
        />

        <Input
          label="Business Name"
          type="text"
          placeholder="Your fashion brand or studio"
          autoComplete="organization"
          icon={<Building2 />}
          error={errors.businessName?.message}
          {...register("businessName")}
        />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Minimum 8 characters"
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

        {/* Submit */}
        <Button type="submit" className="w-full" size="lg" loading={isLoading}>
          Create Account
        </Button>
      </form>

      {/* Terms */}
      <p className="mt-4 text-center text-xs text-[#1A1A2E]/40">
        By creating an account, you agree to our Terms of Service and Privacy
        Policy.
      </p>

      {/* Login link */}
      <p className="mt-4 text-center text-sm text-[#1A1A2E]/55">
        Already have an account?{" "}
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
