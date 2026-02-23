"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  User,
  Building2,
  Shield,
  Mail,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  Lock,
  Check,
  Sparkles,
  Crown,
  Camera,
} from "lucide-react";
import { PageTransition } from "@/components/common/page-transition";
import { GlassCard } from "@/components/common/glass-card";
import { SectionLoader } from "@/components/common/loading";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { NIGERIAN_STATES, SUBSCRIPTION_PLANS } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/utils";
import type { Designer } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Validation Schemas                                                         */
/* -------------------------------------------------------------------------- */

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  businessAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  bio: z.string().max(500, "Bio must be under 500 characters").optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

/* -------------------------------------------------------------------------- */
/*  Specialties list                                                           */
/* -------------------------------------------------------------------------- */

const SPECIALTIES = [
  "Agbada",
  "Kaftan",
  "Aso Oke",
  "Ankara",
  "Bridal",
  "Corporate",
  "Casual",
  "Traditional",
  "Bespoke Suits",
  "Kids Wear",
  "Evening Wear",
  "Sportswear",
  "Uniform",
  "Accessories",
];

/* -------------------------------------------------------------------------- */
/*  Settings Page                                                              */
/* -------------------------------------------------------------------------- */

export default function SettingsPage() {
  const [designer, setDesigner] = useState<Designer | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

  // Fetch designer profile
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/designer/profile");
        const json = await res.json();
        if (json.success) {
          setDesigner(json.data);
        }
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E] lg:text-3xl">
            Settings
          </h1>
          <p className="mt-1 text-sm text-[#1A1A2E]/50">
            Manage your account and business preferences
          </p>
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            <SectionLoader lines={2} />
            <SectionLoader lines={5} />
          </div>
        ) : designer ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="profile" className="gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  <span>Profile</span>
                </TabsTrigger>
                <TabsTrigger value="business" className="gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Business</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Security</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <ProfileTab designer={designer} onUpdate={setDesigner} />
              </TabsContent>

              <TabsContent value="business">
                <BusinessTab designer={designer} onUpdate={setDesigner} />
              </TabsContent>

              <TabsContent value="security">
                <SecurityTab />
              </TabsContent>
            </Tabs>
          </motion.div>
        ) : (
          <GlassCard padding="lg">
            <p className="text-center text-sm text-[#1A1A2E]/50">
              Unable to load profile. Please refresh the page.
            </p>
          </GlassCard>
        )}
      </div>
    </PageTransition>
  );
}

/* -------------------------------------------------------------------------- */
/*  Profile Tab                                                                */
/* -------------------------------------------------------------------------- */

function ProfileTab({
  designer,
  onUpdate,
}: {
  designer: Designer;
  onUpdate: (d: Designer) => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>(designer.avatar || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: designer.name,
      email: designer.email,
      phone: designer.phone,
      businessName: designer.businessName,
      businessAddress: designer.businessAddress || "",
      city: designer.city || "",
      state: designer.state || "",
      bio: designer.bio || "",
    },
  });

  const stateOptions = NIGERIAN_STATES.map((s) => ({
    value: s,
    label: s,
  }));

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error("Photo must be under 1MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setAvatarPreview(base64);
      setUploadingAvatar(true);

      try {
        const res = await fetch("/api/designer/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar: base64 }),
        });
        const json = await res.json();
        if (json.success) {
          onUpdate(json.data);
          toast.success("Profile photo updated");
        } else {
          toast.error("Failed to upload photo");
        }
      } catch {
        toast.error("Upload failed. Try again.");
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(data: ProfileFormData) {
    setIsSaving(true);

    try {
      const res = await fetch("/api/designer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Failed to update profile");
        return;
      }

      onUpdate(json.data);
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <GlassCard gradientBorder padding="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Profile Photo */}
        <div className="flex items-center gap-5">
          <div className="relative">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Profile"
                className="h-20 w-20 rounded-2xl object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C75B39] to-[#D4A853] text-2xl font-bold text-white shadow-sm">
                {designer.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
            )}
            <label
              className={cn(
                "absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full",
                "bg-[#C75B39] text-white shadow-md transition-transform hover:scale-110",
                uploadingAvatar && "animate-pulse"
              )}
            >
              <Camera className="h-3.5 w-3.5" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={uploadingAvatar}
              />
            </label>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1A1A2E]">{designer.name}</p>
            <p className="text-xs text-[#1A1A2E]/45">
              {uploadingAvatar ? "Uploading..." : "Click the camera icon to change photo"}
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[#1A1A2E]">
            Personal Information
          </h2>
          <p className="mt-0.5 text-sm text-[#1A1A2E]/45">
            Update your personal and contact details
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Full Name"
            placeholder="Your full name"
            icon={<User />}
            error={errors.name?.message}
            {...register("name")}
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            icon={<Mail />}
            error={errors.email?.message}
            disabled
            {...register("email")}
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="+234 800 000 0000"
            icon={<Phone />}
            error={errors.phone?.message}
            {...register("phone")}
          />

          <Input
            label="Business Name"
            placeholder="Your fashion brand"
            icon={<Building2 />}
            error={errors.businessName?.message}
            {...register("businessName")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Business Address"
              placeholder="Street address"
              icon={<MapPin />}
              error={errors.businessAddress?.message}
              {...register("businessAddress")}
            />
          </div>

          <Input
            label="City"
            placeholder="e.g. Lagos"
            error={errors.city?.message}
            {...register("city")}
          />

          <Select
            label="State"
            placeholder="Select state"
            options={stateOptions}
            error={errors.state?.message}
            {...register("state")}
          />
        </div>

        {/* Bio */}
        <div className="w-full space-y-1.5">
          <label
            htmlFor="bio"
            className="block text-sm font-medium text-foreground"
          >
            Bio
          </label>
          <textarea
            id="bio"
            rows={3}
            placeholder="Tell clients about your experience and style..."
            className={cn(
              "glass-input flex w-full rounded-lg px-3 py-2.5",
              "text-sm text-foreground placeholder:text-muted-foreground",
              "focus-visible:outline-none",
              "resize-none",
              errors.bio && "border-destructive focus:border-destructive focus:ring-destructive/20"
            )}
            {...register("bio")}
          />
          {errors.bio && (
            <p className="text-xs text-destructive" role="alert">
              {errors.bio.message}
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            loading={isSaving}
            disabled={!isDirty}
            className="gap-1.5"
          >
            <Check className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </form>
    </GlassCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  Business Tab                                                               */
/* -------------------------------------------------------------------------- */

function BusinessTab({
  designer,
  onUpdate,
}: {
  designer: Designer;
  onUpdate: (d: Designer) => void;
}) {
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(
    designer.specialties || []
  );
  const [isSaving, setIsSaving] = useState(false);

  function toggleSpecialty(specialty: string) {
    setSelectedSpecialties((prev) =>
      prev.includes(specialty)
        ? prev.filter((s) => s !== specialty)
        : [...prev, specialty]
    );
  }

  async function handleSaveSpecialties() {
    if (selectedSpecialties.length === 0) {
      toast.error("Select at least one specialty");
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch("/api/designer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specialties: selectedSpecialties }),
      });

      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Failed to update specialties");
        return;
      }

      onUpdate(json.data);
      toast.success("Specialties updated successfully");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // Find current plan
  const currentPlan = SUBSCRIPTION_PLANS.find(
    (p) => p.id === designer.subscription
  ) || SUBSCRIPTION_PLANS[0];

  const hasSpecialtiesChanged =
    JSON.stringify([...selectedSpecialties].sort()) !==
    JSON.stringify([...(designer.specialties || [])].sort());

  return (
    <div className="space-y-6">
      {/* Specialties */}
      <GlassCard gradientBorder padding="lg">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1A1A2E]">
                Specialties
              </h2>
              <p className="mt-0.5 text-sm text-[#1A1A2E]/45">
                What types of garments do you create?
              </p>
            </div>
            {hasSpecialtiesChanged && (
              <Button
                size="sm"
                onClick={handleSaveSpecialties}
                loading={isSaving}
                className="gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                Save
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {SPECIALTIES.map((specialty) => {
              const isSelected = selectedSpecialties.includes(specialty);
              return (
                <motion.button
                  key={specialty}
                  type="button"
                  onClick={() => toggleSpecialty(specialty)}
                  className={cn(
                    "rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                    "border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C75B39]/30",
                    isSelected
                      ? "border-[#C75B39]/40 bg-gradient-to-br from-[#C75B39]/15 to-[#D4A853]/10 text-[#C75B39] shadow-sm"
                      : "border-white/30 bg-white/50 text-[#1A1A2E]/60 hover:border-white/50 hover:bg-white/70"
                  )}
                  whileTap={{ scale: 0.96 }}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    {isSelected && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </motion.span>
                    )}
                    {specialty}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {selectedSpecialties.length > 0 && (
            <p className="text-xs text-[#1A1A2E]/40">
              {selectedSpecialties.length} selected
            </p>
          )}
        </div>
      </GlassCard>

      {/* Subscription Plan */}
      <GlassCard padding="lg">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-[#D4A853]" strokeWidth={1.5} />
            <h2 className="text-lg font-semibold text-[#1A1A2E]">
              Subscription Plan
            </h2>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[#D4A853]/20 bg-gradient-to-r from-[#D4A853]/5 to-[#C75B39]/5 p-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[#1A1A2E]">
                  {currentPlan.name}
                </h3>
                <Badge variant="secondary">{designer.subscription}</Badge>
              </div>
              <p className="mt-1 text-sm text-[#1A1A2E]/50">
                {currentPlan.price === 0
                  ? "Free plan"
                  : `${formatCurrency(currentPlan.price)}/month`}
              </p>
            </div>
            <Button variant="outline" size="sm">
              {currentPlan.price === 0 ? "Upgrade" : "Manage"}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-[#1A1A2E]/50 uppercase tracking-wider">
              Plan Features
            </p>
            <ul className="space-y-1.5">
              {currentPlan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2 text-sm text-[#1A1A2E]/65"
                >
                  <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-[#D4A853]" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Security Tab                                                               */
/* -------------------------------------------------------------------------- */

function SecurityTab() {
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: PasswordFormData) {
    setIsSaving(true);

    try {
      const res = await fetch("/api/designer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Failed to update password");
        return;
      }

      toast.success("Password updated successfully");
      reset();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <GlassCard gradientBorder padding="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-[#1A1A2E]">
            Change Password
          </h2>
          <p className="mt-0.5 text-sm text-[#1A1A2E]/45">
            Update your password to keep your account secure
          </p>
        </div>

        <div className="space-y-4">
          {/* Current Password */}
          <div className="relative">
            <Input
              label="Current Password"
              type={showCurrentPassword ? "text" : "password"}
              placeholder="Enter current password"
              icon={<Lock />}
              error={errors.currentPassword?.message}
              {...register("currentPassword")}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-[38px] text-[#1A1A2E]/40 transition-colors hover:text-[#1A1A2E]/70"
              aria-label={showCurrentPassword ? "Hide password" : "Show password"}
            >
              {showCurrentPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* New Password */}
          <div className="relative">
            <Input
              label="New Password"
              type={showNewPassword ? "text" : "password"}
              placeholder="Enter new password (min 8 characters)"
              icon={<Lock />}
              error={errors.newPassword?.message}
              {...register("newPassword")}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-[38px] text-[#1A1A2E]/40 transition-colors hover:text-[#1A1A2E]/70"
              aria-label={showNewPassword ? "Hide password" : "Show password"}
            >
              {showNewPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <Input
              label="Confirm New Password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter new password"
              icon={<Lock />}
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-[38px] text-[#1A1A2E]/40 transition-colors hover:text-[#1A1A2E]/70"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            loading={isSaving}
            className="gap-1.5"
          >
            <Shield className="h-4 w-4" />
            Update Password
          </Button>
        </div>
      </form>
    </GlassCard>
  );
}
