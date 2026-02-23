"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import {
  Scan,
  Users,
  ClipboardList,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ChevronDown,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Animation Variants                                                        */
/* -------------------------------------------------------------------------- */

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
};

/* -------------------------------------------------------------------------- */
/*  Features Data                                                             */
/* -------------------------------------------------------------------------- */

const features = [
  {
    icon: Scan,
    title: "AI Body Scanning",
    description:
      "Get precise body measurements using our AI-powered scanning technology. Just a phone camera -- no tape measure needed.",
    gradient: "from-terracotta-400 to-terracotta-600",
  },
  {
    icon: Users,
    title: "Client Management",
    description:
      "Organize all your clients, their measurements, and history in one beautifully designed dashboard.",
    gradient: "from-gold-400 to-gold-600",
  },
  {
    icon: ClipboardList,
    title: "Order Tracking",
    description:
      "Track every order from fabric cutting to delivery. Keep your clients updated at every stage.",
    gradient: "from-charcoal-400 to-charcoal-600",
  },
];

/* -------------------------------------------------------------------------- */
/*  Steps Data                                                                */
/* -------------------------------------------------------------------------- */

const steps = [
  {
    number: "01",
    title: "Create Your Account",
    description:
      "Sign up for free in under a minute. Set up your designer profile and business details.",
  },
  {
    number: "02",
    title: "Add Your Clients",
    description:
      "Import or manually add your clients. Send them a scan link or enter measurements yourself.",
  },
  {
    number: "03",
    title: "Start Creating",
    description:
      "Manage orders, track progress, and deliver beautiful fashion with precision measurements.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Landing Page                                                              */
/* -------------------------------------------------------------------------- */

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FAFAF8]">
      {/* ---- Background Mesh Gradient ---- */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-[#C75B39]/[0.07] blur-[140px]" />
        <div className="absolute top-1/4 -left-32 h-[500px] w-[500px] rounded-full bg-[#D4A853]/[0.06] blur-[120px]" />
        <div className="absolute bottom-0 right-1/3 h-[400px] w-[400px] rounded-full bg-[#F5E6D3]/[0.1] blur-[100px]" />
        <div className="absolute top-2/3 left-1/3 h-[300px] w-[300px] rounded-full bg-[#C75B39]/[0.04] blur-[80px]" />
      </div>

      {/* ================================================================== */}
      {/*  HEADER / NAV                                                      */}
      {/* ================================================================== */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-20"
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#C75B39] to-[#D4A853] shadow-md">
              <span className="text-sm font-bold text-white">S</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-[#1A1A2E]">
              Stitcha
            </span>
          </Link>

          {/* Nav Actions */}
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">
                Get Started
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </nav>
      </motion.header>

      {/* ================================================================== */}
      {/*  HERO SECTION                                                      */}
      {/* ================================================================== */}
      <section className="relative z-10 pb-16 pt-12 sm:pb-24 sm:pt-20 lg:pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="mx-auto max-w-3xl text-center"
          >
            {/* Badge */}
            <motion.div
              variants={fadeInUp}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#C75B39]/15 bg-white/60 px-4 py-1.5 shadow-sm backdrop-blur-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#C75B39]" />
              <span className="text-xs font-medium text-[#1A1A2E]/70">
                AI-Powered Fashion Technology
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
              className="text-4xl font-extrabold leading-tight tracking-tight text-[#1A1A2E] sm:text-5xl lg:text-6xl"
            >
              Precision Measurements,{" "}
              <span className="bg-gradient-to-r from-[#C75B39] to-[#D4A853] bg-clip-text text-transparent">
                Beautiful Fashion
              </span>
            </motion.h1>

            {/* Subtext */}
            <motion.p
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
              className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#1A1A2E]/60 sm:text-xl"
            >
              The AI body scanning platform built for fashion designers.
              Get accurate measurements, manage clients, and track orders
              -- all from your phone.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            >
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Learn More
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  FEATURES SECTION                                                  */}
      {/* ================================================================== */}
      <section id="features" className="relative z-10 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight text-[#1A1A2E] sm:text-4xl">
              Everything You Need to{" "}
              <span className="text-[#C75B39]">Create</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-[#1A1A2E]/55">
              From body scanning to order delivery, Stitcha handles every step
              of your fashion workflow.
            </p>
          </motion.div>

          {/* Feature Cards Grid */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-60px" }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={scaleIn}
                transition={{ duration: 0.5 }}
                className="group relative overflow-hidden rounded-2xl border border-white/40 bg-white/65 p-8 shadow-[0_8px_32px_rgba(26,26,46,0.06)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/80 hover:shadow-[0_16px_48px_rgba(26,26,46,0.1)]"
              >
                {/* Icon */}
                <div
                  className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-md`}
                >
                  <feature.icon className="h-6 w-6 text-white" />
                </div>

                {/* Content */}
                <h3 className="mb-2 text-lg font-semibold text-[#1A1A2E]">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#1A1A2E]/55">
                  {feature.description}
                </p>

                {/* Decorative gradient */}
                <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-[#C75B39]/[0.04] blur-2xl transition-all duration-500 group-hover:bg-[#C75B39]/[0.08]" />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  HOW IT WORKS                                                      */}
      {/* ================================================================== */}
      <section className="relative z-10 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight text-[#1A1A2E] sm:text-4xl">
              How It{" "}
              <span className="text-[#D4A853]">Works</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-[#1A1A2E]/55">
              Get started in three simple steps and transform how you
              manage your fashion business.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-60px" }}
            className="grid gap-8 sm:grid-cols-3"
          >
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                variants={fadeInUp}
                transition={{ duration: 0.5 }}
                className="relative text-center"
              >
                {/* Connector line (desktop) */}
                {index < steps.length - 1 && (
                  <div className="pointer-events-none absolute right-0 top-10 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-[#C75B39]/20 to-transparent sm:block" />
                )}

                {/* Step number */}
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/40 bg-white/70 shadow-lg backdrop-blur-md">
                  <span className="text-xl font-bold text-[#C75B39]">
                    {step.number}
                  </span>
                </div>

                <h3 className="mb-2 text-lg font-semibold text-[#1A1A2E]">
                  {step.title}
                </h3>
                <p className="mx-auto max-w-xs text-sm leading-relaxed text-[#1A1A2E]/55">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  PRICING SECTION                                                   */}
      {/* ================================================================== */}
      <section id="pricing" className="relative z-10 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight text-[#1A1A2E] sm:text-4xl">
              Simple, Transparent{" "}
              <span className="text-[#C75B39]">Pricing</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-[#1A1A2E]/55">
              Start free and scale as your business grows. No hidden fees,
              cancel anytime.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-60px" }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {SUBSCRIPTION_PLANS.map((plan, index) => {
              const isPopular = plan.id === "pro";
              return (
                <motion.div
                  key={plan.id}
                  variants={scaleIn}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`relative overflow-hidden rounded-2xl border p-8 transition-all duration-300 hover:-translate-y-1 ${
                    isPopular
                      ? "border-[#C75B39]/30 bg-white/80 shadow-[0_16px_48px_rgba(199,91,57,0.12)] backdrop-blur-xl"
                      : "border-white/40 bg-white/65 shadow-[0_8px_32px_rgba(26,26,46,0.06)] backdrop-blur-xl hover:shadow-[0_16px_48px_rgba(26,26,46,0.1)]"
                  }`}
                >
                  {/* Popular badge */}
                  {isPopular && (
                    <div className="absolute right-4 top-4 rounded-full bg-gradient-to-r from-[#C75B39] to-[#D4A853] px-3 py-1 text-xs font-semibold text-white shadow-sm">
                      Popular
                    </div>
                  )}

                  {/* Plan name */}
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[#1A1A2E]/50">
                    {plan.name}
                  </h3>

                  {/* Price */}
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-[#1A1A2E]">
                      {plan.price === 0 ? "Free" : formatCurrency(plan.price)}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-sm text-[#1A1A2E]/50">/month</span>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="mt-8 space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-sm text-[#1A1A2E]/70"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16a34a]" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="mt-8">
                    <Link href="/register">
                      <Button
                        variant={isPopular ? "default" : "outline"}
                        className="w-full"
                      >
                        {plan.price === 0 ? "Start Free" : "Get Started"}
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  CTA SECTION                                                       */}
      {/* ================================================================== */}
      <section className="relative z-10 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl border border-white/30 bg-gradient-to-br from-[#C75B39] to-[#933a22] p-12 text-center shadow-2xl sm:p-16"
          >
            {/* Decorative circles */}
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[#D4A853]/20 blur-2xl" />

            <h2 className="relative text-3xl font-bold text-white sm:text-4xl">
              Ready to Transform Your Workflow?
            </h2>
            <p className="relative mx-auto mt-4 max-w-lg text-lg text-white/75">
              Join hundreds of fashion designers already using Stitcha to
              deliver perfect fits, every time.
            </p>
            <div className="relative mt-8">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-white text-[#C75B39] shadow-lg hover:bg-white/90 hover:text-[#933a22]"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  FOOTER                                                            */}
      {/* ================================================================== */}
      <footer className="relative z-10 border-t border-[#1A1A2E]/5 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            {/* Brand */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#C75B39] to-[#D4A853] shadow-sm">
                <span className="text-xs font-bold text-white">S</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-[#1A1A2E]">
                Stitcha
              </span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-sm text-[#1A1A2E]/50">
              <a href="#features" className="transition-colors hover:text-[#C75B39]">
                Features
              </a>
              <a href="#pricing" className="transition-colors hover:text-[#C75B39]">
                Pricing
              </a>
              <Link href="/login" className="transition-colors hover:text-[#C75B39]">
                Sign In
              </Link>
            </div>

            {/* Copyright */}
            <p className="text-xs text-[#1A1A2E]/40">
              &copy; {new Date().getFullYear()} Stitcha. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
