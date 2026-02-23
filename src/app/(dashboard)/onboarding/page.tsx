"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  MapPin,
  Building2,
  Sparkles,
  User,
  Camera,
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";
import { PageTransition } from "@/components/common/page-transition";
import { GlassCard } from "@/components/common/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { NIGERIAN_STATES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
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

const TOTAL_STEPS = 3;

/* -------------------------------------------------------------------------- */
/*  Animation variants                                                         */
/* -------------------------------------------------------------------------- */

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  }),
};

/* -------------------------------------------------------------------------- */
/*  Onboarding Page                                                            */
/* -------------------------------------------------------------------------- */

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    businessAddress: "",
    city: "",
    state: "",
    specialties: [] as string[],
    bio: "",
  });

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ---- Handlers ---- */

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field changes
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function toggleSpecialty(specialty: string) {
    setFormData((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter((s) => s !== specialty)
        : [...prev.specialties, specialty],
    }));
    // Clear specialty error
    if (errors.specialties) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.specialties;
        return next;
      });
    }
  }

  function validateStep(step: number): boolean {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!formData.businessAddress || formData.businessAddress.length < 5) {
        newErrors.businessAddress = "Please enter your business address";
      }
      if (!formData.city || formData.city.length < 2) {
        newErrors.city = "Please enter your city";
      }
      if (!formData.state) {
        newErrors.state = "Please select your state";
      }
    }

    if (step === 1) {
      if (formData.specialties.length === 0) {
        newErrors.specialties = "Select at least one specialty";
      }
    }

    if (step === 2) {
      if (formData.bio && formData.bio.length > 500) {
        newErrors.bio = "Bio must be under 500 characters";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    if (!validateStep(currentStep)) return;
    setDirection(1);
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
  }

  function handleBack() {
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }

  async function handleSubmit() {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/designer/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Something went wrong");
        return;
      }

      toast.success("Welcome to Stitcha! Your profile is set up.");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ---- State options ---- */

  const stateOptions = NIGERIAN_STATES.map((s) => ({
    value: s,
    label: s,
  }));

  return (
    <PageTransition>
      <div className="mx-auto max-w-lg py-4 lg:py-8">
        {/* ---- Header ---- */}
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C75B39] to-[#D4A853] shadow-lg">
              <Sparkles className="h-7 w-7 text-white" strokeWidth={1.5} />
            </div>
          </motion.div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">
            Set up your profile
          </h1>
          <p className="mt-1.5 text-sm text-[#1A1A2E]/50">
            Tell us about your fashion business
          </p>
        </div>

        {/* ---- Progress Indicator ---- */}
        <div className="mb-8 flex items-center justify-center gap-0">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className="flex items-center">
              {/* Dot */}
              <motion.div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-300",
                  i < currentStep
                    ? "bg-[#C75B39] text-white"
                    : i === currentStep
                      ? "bg-gradient-to-br from-[#C75B39] to-[#D4A853] text-white shadow-md"
                      : "border border-[#1A1A2E]/15 bg-white/60 text-[#1A1A2E]/35"
                )}
                animate={{
                  scale: i === currentStep ? 1.1 : 1,
                }}
                transition={{ duration: 0.2 }}
              >
                {i < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </motion.div>

              {/* Connecting line */}
              {i < TOTAL_STEPS - 1 && (
                <div className="mx-1.5 h-0.5 w-12 rounded-full bg-[#1A1A2E]/10 sm:w-16">
                  <motion.div
                    className="h-full rounded-full bg-[#C75B39]"
                    initial={{ width: "0%" }}
                    animate={{
                      width: i < currentStep ? "100%" : "0%",
                    }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ---- Step Content ---- */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {/* Step 1: Business Details */}
            {currentStep === 0 && (
              <GlassCard gradientBorder padding="lg">
                <div className="space-y-5">
                  <div className="flex items-center gap-2.5 text-[#1A1A2E]">
                    <Building2 className="h-5 w-5 text-[#C75B39]" strokeWidth={1.5} />
                    <h2 className="text-lg font-semibold">Business Details</h2>
                  </div>
                  <p className="text-sm text-[#1A1A2E]/50">
                    Where is your fashion business located?
                  </p>

                  <Input
                    label="Business Address"
                    placeholder="e.g. 15 Balogun Street, Victoria Island"
                    icon={<MapPin />}
                    value={formData.businessAddress}
                    onChange={(e) => updateField("businessAddress", e.target.value)}
                    error={errors.businessAddress}
                  />

                  <Input
                    label="City"
                    placeholder="e.g. Lagos"
                    value={formData.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    error={errors.city}
                  />

                  <Select
                    label="State"
                    placeholder="Select your state"
                    options={stateOptions}
                    value={formData.state}
                    onChange={(e) => updateField("state", e.target.value)}
                    error={errors.state}
                  />
                </div>
              </GlassCard>
            )}

            {/* Step 2: Specialties */}
            {currentStep === 1 && (
              <GlassCard gradientBorder padding="lg">
                <div className="space-y-5">
                  <div className="flex items-center gap-2.5 text-[#1A1A2E]">
                    <Sparkles className="h-5 w-5 text-[#C75B39]" strokeWidth={1.5} />
                    <h2 className="text-lg font-semibold">Your Specialties</h2>
                  </div>
                  <p className="text-sm text-[#1A1A2E]/50">
                    Select the types of garments you specialize in
                  </p>

                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {SPECIALTIES.map((specialty) => {
                      const isSelected = formData.specialties.includes(specialty);
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

                  {errors.specialties && (
                    <p className="text-xs text-destructive" role="alert">
                      {errors.specialties}
                    </p>
                  )}

                  {formData.specialties.length > 0 && (
                    <p className="text-xs text-[#1A1A2E]/40">
                      {formData.specialties.length} selected
                    </p>
                  )}
                </div>
              </GlassCard>
            )}

            {/* Step 3: Bio & Photo */}
            {currentStep === 2 && (
              <GlassCard gradientBorder padding="lg">
                <div className="space-y-5">
                  <div className="flex items-center gap-2.5 text-[#1A1A2E]">
                    <User className="h-5 w-5 text-[#C75B39]" strokeWidth={1.5} />
                    <h2 className="text-lg font-semibold">About You</h2>
                  </div>
                  <p className="text-sm text-[#1A1A2E]/50">
                    Add a bio and profile photo (optional)
                  </p>

                  {/* Profile photo upload area */}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      className={cn(
                        "group relative flex h-24 w-24 items-center justify-center",
                        "rounded-full border-2 border-dashed border-[#C75B39]/25",
                        "bg-gradient-to-br from-[#C75B39]/5 to-[#D4A853]/5",
                        "transition-all duration-200 hover:border-[#C75B39]/40 hover:bg-[#C75B39]/10",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C75B39]/30"
                      )}
                      onClick={() => toast.info("Photo upload will be available soon!")}
                    >
                      <Camera className="h-7 w-7 text-[#C75B39]/40 transition-colors group-hover:text-[#C75B39]/60" strokeWidth={1.5} />
                      <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#C75B39] shadow-md">
                        <span className="text-xs font-bold text-white">+</span>
                      </div>
                    </button>
                  </div>
                  <p className="text-center text-xs text-[#1A1A2E]/40">
                    Tap to add a profile photo
                  </p>

                  {/* Bio textarea */}
                  <div className="w-full space-y-1.5">
                    <label
                      htmlFor="bio"
                      className="block text-sm font-medium text-foreground"
                    >
                      Bio
                    </label>
                    <textarea
                      id="bio"
                      rows={4}
                      placeholder="Tell your clients about your experience, style, and what makes your work unique..."
                      value={formData.bio}
                      onChange={(e) => updateField("bio", e.target.value)}
                      className={cn(
                        "glass-input flex w-full rounded-lg px-3 py-2.5",
                        "text-sm text-foreground placeholder:text-muted-foreground",
                        "focus-visible:outline-none",
                        "resize-none",
                        errors.bio && "border-destructive focus:border-destructive focus:ring-destructive/20"
                      )}
                    />
                    <div className="flex items-center justify-between">
                      {errors.bio ? (
                        <p className="text-xs text-destructive" role="alert">
                          {errors.bio}
                        </p>
                      ) : (
                        <span />
                      )}
                      <p className={cn(
                        "text-xs",
                        formData.bio.length > 450
                          ? "text-destructive"
                          : "text-[#1A1A2E]/35"
                      )}>
                        {formData.bio.length}/500
                      </p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ---- Navigation Buttons ---- */}
        <div className="mt-6 flex items-center justify-between gap-3">
          {currentStep > 0 ? (
            <Button
              variant="outline"
              onClick={handleBack}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {currentStep < TOTAL_STEPS - 1 ? (
            <Button
              onClick={handleNext}
              className="gap-1.5"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              loading={isSubmitting}
              className="gap-1.5"
            >
              <Check className="h-4 w-4" />
              Complete Setup
            </Button>
          )}
        </div>

        {/* ---- Skip option ---- */}
        {currentStep === 2 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 text-center text-xs text-[#1A1A2E]/40"
          >
            You can update these details later in{" "}
            <button
              type="button"
              onClick={handleSubmit}
              className="font-medium text-[#C75B39] transition-colors hover:text-[#933a22]"
            >
              Settings
            </button>
          </motion.p>
        )}
      </div>
    </PageTransition>
  );
}
