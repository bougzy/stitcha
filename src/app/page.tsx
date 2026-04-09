// "use client";

// import { useState } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import Link from "next/link";
// import { Button } from "@/components/ui/button";
// import { SUBSCRIPTION_PLANS, CREDIT_PACKS } from "@/lib/constants";
// import { formatCurrency } from "@/lib/utils";
// import {
//   Scan,
//   Users,
//   ClipboardList,
//   ArrowRight,
//   CheckCircle2,
//   Sparkles,
//   ChevronDown,
//   MessageCircle,
//   Wallet,
//   WifiOff,
//   Shield,
//   Star,
//   Calendar,
//   Heart,
//   Trophy,
//   Smartphone,
//   Camera,
//   Share2,
//   FileText,
//   Globe,
//   Zap,
//   BarChart3,
//   CreditCard,
//   Bell,
//   Search,
//   Ruler,
//   Package,
//   TrendingUp,
//   Menu,
//   X,
// } from "lucide-react";

// /* -------------------------------------------------------------------------- */
// /*  Animation Variants                                                        */
// /* -------------------------------------------------------------------------- */

// const fadeInUp = {
//   initial: { opacity: 0, y: 24 },
//   animate: { opacity: 1, y: 0 },
// };

// const staggerContainer = {
//   animate: {
//     transition: {
//       staggerChildren: 0.1,
//     },
//   },
// };

// const scaleIn = {
//   initial: { opacity: 0, scale: 0.92 },
//   animate: { opacity: 1, scale: 1 },
// };

// /* -------------------------------------------------------------------------- */
// /*  Features Data                                                             */
// /* -------------------------------------------------------------------------- */

// const coreFeatures = [
//   {
//     icon: Camera,
//     title: "AI Body Scanning",
//     description:
//       "Get 16+ precise body measurements using just a phone camera. No tape measure needed. Works with African body types using calibrated ML models.",
//     color: "from-[#C75B39] to-[#933a22]",
//   },
//   {
//     icon: Users,
//     title: "Client Management",
//     description:
//       "Organize clients with tier tracking (New, Returning, Loyal, VIP). View measurement history, order history, and engagement insights all in one place.",
//     color: "from-[#D4A853] to-[#b8893a]",
//   },
//   {
//     icon: Package,
//     title: "Order Tracking",
//     description:
//       "Track every order through 9 stages: Pending → Confirmed → Cutting → Sewing → Fitting → Finishing → Ready → Delivered. Full status timeline included.",
//     color: "from-[#1A1A2E] to-[#2d2d4e]",
//   },
//   {
//     icon: MessageCircle,
//     title: "WhatsApp Integration",
//     description:
//       "Pre-built message templates in English and Pidgin. Send payment reminders, status updates, fitting invites, receipts, and scan links — one tap.",
//     color: "from-[#25D366] to-[#128C7E]",
//   },
//   {
//     icon: Wallet,
//     title: "Financial Dashboard",
//     description:
//       "Track revenue, collection rate, outstanding balances, and overdue payments. See payment method breakdowns and monthly trends at a glance.",
//     color: "from-emerald-500 to-emerald-700",
//   },
//   {
//     icon: Globe,
//     title: "Client Portal & Sharing",
//     description:
//       "Give each client a shareable portal link — no app install needed. They can view their measurements, order status, and progress in real time.",
//     color: "from-blue-500 to-blue-700",
//   },
// ];

// const moreFeatures = [
//   {
//     icon: WifiOff,
//     title: "Offline Mode",
//     description: "Works without internet. Data syncs automatically when you reconnect.",
//   },
//   {
//     icon: FileText,
//     title: "PDF Exports",
//     description: "Generate professional invoices and payment receipts with your branding.",
//   },
//   {
//     icon: Heart,
//     title: "Client Heartbeat",
//     description: "CRM that flags hot, warm, cold, and dormant clients with suggested actions.",
//   },
//   {
//     icon: Calendar,
//     title: "Event Calendar",
//     description: "Nigerian events and seasonal demand planner for Owambe, weddings, and more.",
//   },
//   {
//     icon: Trophy,
//     title: "Designer Rank",
//     description: "Earn XP for completed orders, on-time deliveries, and grow from Apprentice to Legend.",
//   },
//   {
//     icon: Sparkles,
//     title: "Style Vault",
//     description: "Fashion tips, fabric guides, and technique library curated for Nigerian designers.",
//   },
//   {
//     icon: Shield,
//     title: "Privacy First",
//     description: "Client photos are processed on-device only. Never uploaded. Only measurements are saved.",
//   },
//   {
//     icon: Search,
//     title: "Command Palette",
//     description: "Press Cmd+K to instantly navigate anywhere in the app. Power user productivity.",
//   },
// ];

// /* -------------------------------------------------------------------------- */
// /*  How It Works Steps                                                        */
// /* -------------------------------------------------------------------------- */

// const howItWorks = [
//   {
//     number: "01",
//     title: "Sign Up & Set Up",
//     description:
//       "Create your free account in under a minute. Complete the guided onboarding — add your business details, specialties, and bio.",
//     icon: "🚀",
//   },
//   {
//     number: "02",
//     title: "Add Clients & Measure",
//     description:
//       "Import existing clients or add new ones. Generate an AI scan link and share it via WhatsApp — your client takes two photos and measurements appear in your dashboard.",
//     icon: "📱",
//   },
//   {
//     number: "03",
//     title: "Create & Track Orders",
//     description:
//       "Create orders linked to client measurements. Track progress through 9 stages from cutting to delivery. Record payments and send updates via WhatsApp.",
//     icon: "✂️",
//   },
//   {
//     number: "04",
//     title: "Grow Your Business",
//     description:
//       "Use the financial dashboard to track revenue. Monitor client engagement with Heartbeat. Plan for events with the calendar. Earn rank as you deliver more orders.",
//     icon: "📈",
//   },
// ];

// /* -------------------------------------------------------------------------- */
// /*  Scan Flow Steps                                                           */
// /* -------------------------------------------------------------------------- */

// const scanFlow = [
//   { step: "Send Link", desc: "Share a scan link via WhatsApp or SMS", icon: Share2 },
//   { step: "Client Photos", desc: "Client takes front & side photos", icon: Camera },
//   { step: "AI Analysis", desc: "On-device AI calculates 16+ measurements", icon: Zap },
//   { step: "Results", desc: "Measurements saved to client profile instantly", icon: Ruler },
// ];

// /* -------------------------------------------------------------------------- */
// /*  Testimonial Quotes                                                        */
// /* -------------------------------------------------------------------------- */

// const stats = [
//   { value: "16+", label: "Body measurements per scan" },
//   { value: "< 2min", label: "Average scan time" },
//   { value: "9", label: "Order tracking stages" },
//   { value: "100%", label: "On-device privacy" },
// ];

// /* -------------------------------------------------------------------------- */
// /*  Landing Page                                                              */
// /* -------------------------------------------------------------------------- */

// export default function LandingPage() {
//   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

//   return (
//     <div className="relative min-h-screen overflow-hidden bg-[#FAFAF8]">
//       {/* ---- Background Mesh Gradient ---- */}
//       <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
//         <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-[#C75B39]/[0.07] blur-[140px]" />
//         <div className="absolute top-1/4 -left-32 h-[500px] w-[500px] rounded-full bg-[#D4A853]/[0.06] blur-[120px]" />
//         <div className="absolute bottom-0 right-1/3 h-[400px] w-[400px] rounded-full bg-[#F5E6D3]/[0.1] blur-[100px]" />
//         <div className="absolute top-2/3 left-1/3 h-[300px] w-[300px] rounded-full bg-[#C75B39]/[0.04] blur-[80px]" />
//       </div>

//       {/* ================================================================== */}
//       {/*  HEADER / NAV                                                      */}
//       {/* ================================================================== */}
//       <motion.header
//         initial={{ opacity: 0, y: -16 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.5, ease: "easeOut" }}
//         className="relative z-20"
//       >
//         <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
//           <Link href="/" className="flex items-center gap-2.5">
//             <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#C75B39] to-[#D4A853] shadow-md">
//               <span className="text-sm font-bold text-white">S</span>
//             </div>
//             <span className="text-xl font-bold tracking-tight text-[#1A1A2E]">
//               Stitcha
//             </span>
//           </Link>

//           <div className="hidden items-center gap-6 text-sm text-[#1A1A2E]/60 md:flex">
//             <a href="#features" className="transition-colors hover:text-[#C75B39]">Features</a>
//             <a href="#how-it-works" className="transition-colors hover:text-[#C75B39]">How It Works</a>
//             <a href="#scanning" className="transition-colors hover:text-[#C75B39]">AI Scanning</a>
//             <a href="#pricing" className="transition-colors hover:text-[#C75B39]">Pricing</a>
//           </div>

//           <div className="flex items-center gap-2 sm:gap-3">
//             <Link href="/login" className="hidden sm:block">
//               <Button variant="ghost" size="sm">Sign In</Button>
//             </Link>
//             <Link href="/register" className="hidden sm:block">
//               <Button size="sm">
//                 Get Started Free
//                 <ArrowRight className="ml-1 h-3.5 w-3.5" />
//               </Button>
//             </Link>
//             {/* Mobile hamburger */}
//             <button
//               onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
//               className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1A1A2E]/10 bg-white/60 backdrop-blur-sm md:hidden"
//               aria-label="Toggle menu"
//             >
//               {mobileMenuOpen ? (
//                 <X className="h-5 w-5 text-[#1A1A2E]" />
//               ) : (
//                 <Menu className="h-5 w-5 text-[#1A1A2E]" />
//               )}
//             </button>
//           </div>
//         </nav>

//         {/* Mobile menu dropdown */}
//         <AnimatePresence>
//           {mobileMenuOpen && (
//             <motion.div
//               initial={{ opacity: 0, height: 0 }}
//               animate={{ opacity: 1, height: "auto" }}
//               exit={{ opacity: 0, height: 0 }}
//               transition={{ duration: 0.25 }}
//               className="overflow-hidden border-b border-[#1A1A2E]/5 bg-white/90 backdrop-blur-xl md:hidden"
//             >
//               <div className="mx-auto max-w-7xl space-y-1 px-4 pb-5 pt-2">
//                 {[
//                   { label: "Features", href: "#features" },
//                   { label: "How It Works", href: "#how-it-works" },
//                   { label: "AI Scanning", href: "#scanning" },
//                   { label: "Pricing", href: "#pricing" },
//                 ].map((link) => (
//                   <a
//                     key={link.href}
//                     href={link.href}
//                     onClick={() => setMobileMenuOpen(false)}
//                     className="block rounded-lg px-3 py-2.5 text-sm font-medium text-[#1A1A2E]/70 transition-colors active:bg-[#C75B39]/5"
//                   >
//                     {link.label}
//                   </a>
//                 ))}
//                 <div className="mt-3 flex gap-3 border-t border-[#1A1A2E]/5 pt-4">
//                   <Link href="/login" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
//                     <Button variant="outline" size="sm" className="w-full">Sign In</Button>
//                   </Link>
//                   <Link href="/register" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
//                     <Button size="sm" className="w-full">
//                       Get Started
//                       <ArrowRight className="ml-1 h-3.5 w-3.5" />
//                     </Button>
//                   </Link>
//                 </div>
//               </div>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </motion.header>

//       {/* ================================================================== */}
//       {/*  HERO SECTION                                                      */}
//       {/* ================================================================== */}
//       <section className="relative z-10 pb-16 pt-12 sm:pb-24 sm:pt-20 lg:pt-28">
//         <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//           <motion.div
//             variants={staggerContainer}
//             initial="initial"
//             animate="animate"
//             className="mx-auto max-w-3xl text-center"
//           >
//             <motion.div
//               variants={fadeInUp}
//               transition={{ duration: 0.5 }}
//               className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#C75B39]/15 bg-white/60 px-4 py-1.5 shadow-sm backdrop-blur-sm"
//             >
//               <Sparkles className="h-3.5 w-3.5 text-[#C75B39]" />
//               <span className="text-xs font-medium text-[#1A1A2E]/70">
//                 Built for Nigerian Fashion Designers
//               </span>
//             </motion.div>

//             <motion.h1
//               variants={fadeInUp}
//               transition={{ duration: 0.6 }}
//               className="text-4xl font-extrabold leading-tight tracking-tight text-[#1A1A2E] sm:text-5xl lg:text-6xl"
//             >
//               AI Measurements,{" "}
//               <span className="bg-gradient-to-r from-[#C75B39] to-[#D4A853] bg-clip-text text-transparent">
//                 Perfect Fits
//               </span>
//               ,{" "}
//               <br className="hidden sm:block" />
//               Happy Clients
//             </motion.h1>

//             <motion.p
//               variants={fadeInUp}
//               transition={{ duration: 0.6 }}
//               className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#1A1A2E]/60 sm:text-xl"
//             >
//               The complete fashion business platform. Take AI body measurements
//               with just a phone camera, manage orders from cutting to delivery,
//               track payments, and keep clients updated via WhatsApp — all from one app.
//             </motion.p>

//             <motion.div
//               variants={fadeInUp}
//               transition={{ duration: 0.6 }}
//               className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
//             >
//               <Link href="/register">
//                 <Button size="lg" className="w-full sm:w-auto">
//                   Start Free — 3 AI Scans Included
//                   <ArrowRight className="ml-2 h-4 w-4" />
//                 </Button>
//               </Link>
//               <a href="#scanning">
//                 <Button variant="outline" size="lg" className="w-full sm:w-auto">
//                   See AI Scanning in Action
//                   <ChevronDown className="ml-2 h-4 w-4" />
//                 </Button>
//               </a>
//             </motion.div>

//             {/* Trust indicators */}
//             <motion.div
//               variants={fadeInUp}
//               transition={{ duration: 0.6 }}
//               className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#1A1A2E]/40"
//             >
//               <span className="flex items-center gap-1.5">
//                 <Shield className="h-3.5 w-3.5" />
//                 Photos never leave your device
//               </span>
//               <span className="flex items-center gap-1.5">
//                 <Smartphone className="h-3.5 w-3.5" />
//                 Works on any phone
//               </span>
//               <span className="flex items-center gap-1.5">
//                 <WifiOff className="h-3.5 w-3.5" />
//                 Works offline
//               </span>
//             </motion.div>
//           </motion.div>
//         </div>
//       </section>

//       {/* ================================================================== */}
//       {/*  STATS BAR                                                         */}
//       {/* ================================================================== */}
//       <section className="relative z-10 py-12">
//         <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             whileInView={{ opacity: 1, y: 0 }}
//             viewport={{ once: true }}
//             transition={{ duration: 0.6 }}
//             className="grid grid-cols-2 gap-4 rounded-2xl border border-white/40 bg-white/65 p-6 shadow-lg backdrop-blur-xl sm:grid-cols-4 sm:gap-8 sm:p-8"
//           >
//             {stats.map((stat) => (
//               <div key={stat.label} className="text-center">
//                 <p className="text-2xl font-extrabold text-[#C75B39] sm:text-3xl">
//                   {stat.value}
//                 </p>
//                 <p className="mt-1 text-xs text-[#1A1A2E]/50 sm:text-sm">
//                   {stat.label}
//                 </p>
//               </div>
//             ))}
//           </motion.div>
//         </div>
//       </section>

//       {/* ================================================================== */}
//       {/*  CORE FEATURES                                                     */}
//       {/* ================================================================== */}
//       <section id="features" className="relative z-10 py-20 sm:py-28">
//         <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             whileInView={{ opacity: 1, y: 0 }}
//             viewport={{ once: true, margin: "-80px" }}
//             transition={{ duration: 0.6 }}
//             className="mb-16 text-center"
//           >
//             <h2 className="text-3xl font-bold tracking-tight text-[#1A1A2E] sm:text-4xl">
//               Everything You Need to{" "}
//               <span className="text-[#C75B39]">Run Your Fashion Business</span>
//             </h2>
//             <p className="mx-auto mt-4 max-w-2xl text-lg text-[#1A1A2E]/55">
//               From AI body scanning to financial tracking, Stitcha handles every
//               part of your workflow so you can focus on creating beautiful fashion.
//             </p>
//           </motion.div>

//           <motion.div
//             variants={staggerContainer}
//             initial="initial"
//             whileInView="animate"
//             viewport={{ once: true, margin: "-60px" }}
//             className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
//           >
//             {coreFeatures.map((feature) => (
//               <motion.div
//                 key={feature.title}
//                 variants={scaleIn}
//                 transition={{ duration: 0.5 }}
//                 className="group relative overflow-hidden rounded-2xl border border-white/40 bg-white/65 p-6 shadow-[0_8px_32px_rgba(26,26,46,0.06)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/80 hover:shadow-[0_16px_48px_rgba(26,26,46,0.1)] sm:p-8"
//               >
//                 <div
//                   className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} shadow-md`}
//                 >
//                   <feature.icon className="h-6 w-6 text-white" />
//                 </div>
//                 <h3 className="mb-2 text-lg font-semibold text-[#1A1A2E]">
//                   {feature.title}
//                 </h3>
//                 <p className="text-sm leading-relaxed text-[#1A1A2E]/55">
//                   {feature.description}
//                 </p>
//                 <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-[#C75B39]/[0.04] blur-2xl transition-all duration-500 group-hover:bg-[#C75B39]/[0.08]" />
//               </motion.div>
//             ))}
//           </motion.div>
//         </div>
//       </section>

//       {/* ================================================================== */}
//       {/*  AI SCANNING SHOWCASE                                              */}
//       {/* ================================================================== */}
//       <section id="scanning" className="relative z-10 py-20 sm:py-28">
//         <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             whileInView={{ opacity: 1, y: 0 }}
//             viewport={{ once: true, margin: "-80px" }}
//             transition={{ duration: 0.6 }}
//             className="mb-16 text-center"
//           >
//             <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#C75B39]/10 px-4 py-1.5">
//               <Scan className="h-4 w-4 text-[#C75B39]" />
//               <span className="text-xs font-semibold text-[#C75B39]">AI-Powered</span>
//             </div>
//             <h2 className="text-3xl font-bold tracking-tight text-[#1A1A2E] sm:text-4xl">
//               Body Scanning That{" "}
//               <span className="text-[#D4A853]">Actually Works</span>
//             </h2>
//             <p className="mx-auto mt-4 max-w-2xl text-lg text-[#1A1A2E]/55">
//               Your client takes two photos. Our AI delivers 16+ precise measurements in under 2 minutes.
//               Calibrated specifically for African body types. No tape measure required.
//             </p>
//           </motion.div>

//           {/* Scan Flow Steps */}
//           <motion.div
//             variants={staggerContainer}
//             initial="initial"
//             whileInView="animate"
//             viewport={{ once: true, margin: "-60px" }}
//             className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
//           >
//             {scanFlow.map((item, index) => (
//               <motion.div
//                 key={item.step}
//                 variants={fadeInUp}
//                 transition={{ duration: 0.5 }}
//                 className="relative"
//               >
//                 {index < scanFlow.length - 1 && (
//                   <div className="pointer-events-none absolute right-0 top-10 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-[#C75B39]/25 to-transparent lg:block" />
//                 )}
//                 <div className="rounded-2xl border border-white/40 bg-white/70 p-6 text-center backdrop-blur-xl">
//                   <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C75B39]/10 to-[#D4A853]/10">
//                     <item.icon className="h-6 w-6 text-[#C75B39]" />
//                   </div>
//                   <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#C75B39]/60">
//                     Step {index + 1}
//                   </div>
//                   <h3 className="text-sm font-semibold text-[#1A1A2E]">{item.step}</h3>
//                   <p className="mt-1 text-xs text-[#1A1A2E]/50">{item.desc}</p>
//                 </div>
//               </motion.div>
//             ))}
//           </motion.div>

//           {/* Scan Features Detail */}
//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             whileInView={{ opacity: 1, y: 0 }}
//             viewport={{ once: true }}
//             transition={{ duration: 0.6, delay: 0.3 }}
//             className="mt-12 rounded-2xl border border-[#C75B39]/15 bg-gradient-to-br from-[#C75B39]/[0.04] to-[#D4A853]/[0.03] p-6 sm:p-10"
//           >
//             <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
//               <div>
//                 <h4 className="mb-3 text-sm font-semibold text-[#1A1A2E]">
//                   Measurements Captured
//                 </h4>
//                 <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-[#1A1A2E]/60">
//                   {[
//                     "Bust", "Waist", "Hips", "Shoulder",
//                     "Chest", "Neck", "Arm Length", "Sleeve Length",
//                     "Back Length", "Front Length", "Inseam", "Thigh",
//                     "Knee", "Calf", "Wrist", "Ankle",
//                   ].map((m) => (
//                     <span key={m} className="flex items-center gap-1.5">
//                       <CheckCircle2 className="h-3 w-3 text-[#C75B39]/60" />
//                       {m}
//                     </span>
//                   ))}
//                 </div>
//               </div>
//               <div>
//                 <h4 className="mb-3 text-sm font-semibold text-[#1A1A2E]">
//                   Smart Features
//                 </h4>
//                 <ul className="space-y-2 text-xs text-[#1A1A2E]/60">
//                   <li className="flex items-start gap-2">
//                     <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
//                     Pre-scan checklist (lighting, clothing, background)
//                   </li>
//                   <li className="flex items-start gap-2">
//                     <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
//                     A4 paper calibration for pixel-to-cm accuracy
//                   </li>
//                   <li className="flex items-start gap-2">
//                     <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
//                     Confidence scoring with fallback options
//                   </li>
//                   <li className="flex items-start gap-2">
//                     <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
//                     Manual entry fallback if conditions aren&apos;t ideal
//                   </li>
//                   <li className="flex items-start gap-2">
//                     <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
//                     African body type calibration models
//                   </li>
//                   <li className="flex items-start gap-2">
//                     <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
//                     Gender-specific proportion calculations
//                   </li>
//                 </ul>
//               </div>
//               <div>
//                 <h4 className="mb-3 text-sm font-semibold text-[#1A1A2E]">
//                   Privacy Guaranteed
//                 </h4>
//                 <ul className="space-y-2 text-xs text-[#1A1A2E]/60">
//                   <li className="flex items-start gap-2">
//                     <Shield className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
//                     Photos processed entirely on the client&apos;s device
//                   </li>
//                   <li className="flex items-start gap-2">
//                     <Shield className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
//                     Images are never uploaded to any server
//                   </li>
//                   <li className="flex items-start gap-2">
//                     <Shield className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
//                     Only numerical measurements are stored
//                   </li>
//                   <li className="flex items-start gap-2">
//                     <Shield className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
//                     Client can close the page anytime
//                   </li>
//                 </ul>
//               </div>
//             </div>
//           </motion.div>
//         </div>
//       </section>

//       {/* ================================================================== */}
//       {/*  HOW IT WORKS                                                      */}
//       {/* ================================================================== */}
//       <section id="how-it-works" className="relative z-10 py-20 sm:py-28">
//         <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             whileInView={{ opacity: 1, y: 0 }}
//             viewport={{ once: true, margin: "-80px" }}
//             transition={{ duration: 0.6 }}
//             className="mb-16 text-center"
//           >
//             <h2 className="text-3xl font-bold tracking-tight text-[#1A1A2E] sm:text-4xl">
//               How Stitcha{" "}
//               <span className="text-[#D4A853]">Works</span>
//             </h2>
//             <p className="mx-auto mt-4 max-w-xl text-lg text-[#1A1A2E]/55">
//               From signup to your first delivery in four simple steps.
//             </p>
//           </motion.div>

//           <motion.div
//             variants={staggerContainer}
//             initial="initial"
//             whileInView="animate"
//             viewport={{ once: true, margin: "-60px" }}
//             className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
//           >
//             {howItWorks.map((step, index) => (
//               <motion.div
//                 key={step.number}
//                 variants={fadeInUp}
//                 transition={{ duration: 0.5 }}
//                 className="relative text-center"
//               >
//                 {index < howItWorks.length - 1 && (
//                   <div className="pointer-events-none absolute right-0 top-10 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-[#C75B39]/20 to-transparent lg:block" />
//                 )}
//                 <div className="mx-auto mb-4 text-4xl">{step.icon}</div>
//                 <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/40 bg-white/70 shadow-sm backdrop-blur-md">
//                   <span className="text-sm font-bold text-[#C75B39]">{step.number}</span>
//                 </div>
//                 <h3 className="mb-2 text-base font-semibold text-[#1A1A2E]">{step.title}</h3>
//                 <p className="mx-auto max-w-xs text-sm leading-relaxed text-[#1A1A2E]/55">
//                   {step.description}
//                 </p>
//               </motion.div>
//             ))}
//           </motion.div>
//         </div>
//       </section>

//       {/* ================================================================== */}
//       {/*  WHATSAPP + ORDER MANAGEMENT HIGHLIGHT                             */}
//       {/* ================================================================== */}
//       <section className="relative z-10 py-20 sm:py-28">
//         <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//           <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
//             {/* WhatsApp */}
//             <motion.div
//               initial={{ opacity: 0, x: -30 }}
//               whileInView={{ opacity: 1, x: 0 }}
//               viewport={{ once: true }}
//               transition={{ duration: 0.6 }}
//             >
//               <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#25D366]/10 px-4 py-1.5">
//                 <MessageCircle className="h-4 w-4 text-[#25D366]" />
//                 <span className="text-xs font-semibold text-[#25D366]">WhatsApp Native</span>
//               </div>
//               <h3 className="text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
//                 One-Tap WhatsApp Messages
//               </h3>
//               <p className="mt-3 text-[#1A1A2E]/55">
//                 Pre-built templates for every client interaction. Toggle between English and Pidgin with one click.
//               </p>
//               <div className="mt-6 space-y-3">
//                 {[
//                   { label: "Payment Reminders", desc: "Gentle nudges for outstanding balances" },
//                   { label: "Status Updates", desc: "\"Your Agbada is now in the sewing stage\"" },
//                   { label: "Fitting Invites", desc: "Schedule fitting appointments" },
//                   { label: "Ready for Pickup", desc: "Notify when order is complete" },
//                   { label: "Scan Invitations", desc: "Send AI measurement links to clients" },
//                   { label: "Payment Receipts", desc: "Send confirmation after payment" },
//                 ].map((item) => (
//                   <div key={item.label} className="flex items-start gap-3">
//                     <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#25D366]" />
//                     <div>
//                       <p className="text-sm font-medium text-[#1A1A2E]">{item.label}</p>
//                       <p className="text-xs text-[#1A1A2E]/45">{item.desc}</p>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </motion.div>

//             {/* Order Tracking */}
//             <motion.div
//               initial={{ opacity: 0, x: 30 }}
//               whileInView={{ opacity: 1, x: 0 }}
//               viewport={{ once: true }}
//               transition={{ duration: 0.6 }}
//             >
//               <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#D4A853]/10 px-4 py-1.5">
//                 <ClipboardList className="h-4 w-4 text-[#D4A853]" />
//                 <span className="text-xs font-semibold text-[#D4A853]">Order Management</span>
//               </div>
//               <h3 className="text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
//                 Track Every Stitch
//               </h3>
//               <p className="mt-3 text-[#1A1A2E]/55">
//                 From the moment a client places an order to the final delivery,
//                 every stage is tracked, timestamped, and visible to both you and your client.
//               </p>
//               <div className="mt-6">
//                 <div className="space-y-2.5">
//                   {[
//                     { status: "Pending", color: "bg-[#D4A853]" },
//                     { status: "Confirmed", color: "bg-blue-400" },
//                     { status: "Cutting", color: "bg-[#C75B39]" },
//                     { status: "Sewing", color: "bg-[#C75B39]" },
//                     { status: "Fitting", color: "bg-[#D4A853]" },
//                     { status: "Finishing", color: "bg-[#C75B39]" },
//                     { status: "Ready", color: "bg-emerald-500" },
//                     { status: "Delivered", color: "bg-emerald-500" },
//                   ].map((item, i) => (
//                     <div key={item.status} className="flex items-center gap-3">
//                       <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
//                       <div className="h-px flex-1 bg-[#1A1A2E]/5" />
//                       <span className="text-xs font-medium text-[#1A1A2E]/60">
//                         {item.status}
//                       </span>
//                     </div>
//                   ))}
//                 </div>
//                 <p className="mt-4 text-xs text-[#1A1A2E]/40">
//                   Full status timeline with notes, dates, and automatic client notifications
//                 </p>
//               </div>
//             </motion.div>
//           </div>
//         </div>
//       </section>

//       {/* ================================================================== */}
//       {/*  FINANCIAL + BUSINESS TOOLS                                        */}
//       {/* ================================================================== */}
//       <section className="relative z-10 py-20 sm:py-28">
//         <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             whileInView={{ opacity: 1, y: 0 }}
//             viewport={{ once: true, margin: "-80px" }}
//             transition={{ duration: 0.6 }}
//             className="mb-16 text-center"
//           >
//             <h2 className="text-3xl font-bold tracking-tight text-[#1A1A2E] sm:text-4xl">
//               Business Tools That{" "}
//               <span className="text-emerald-600">Make You Money</span>
//             </h2>
//             <p className="mx-auto mt-4 max-w-2xl text-lg text-[#1A1A2E]/55">
//               Track every naira. Know who owes you. Send reminders that get results.
//             </p>
//           </motion.div>

//           <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
//             {[
//               { icon: BarChart3, title: "Revenue Dashboard", desc: "Monthly trends, collection rate, and revenue vs. collected charts", color: "text-emerald-600 bg-emerald-50" },
//               { icon: Bell, title: "Overdue Alerts", desc: "Automatic flagging of past-due orders with one-tap WhatsApp chase", color: "text-red-500 bg-red-50" },
//               { icon: CreditCard, title: "Payment Tracking", desc: "Record cash, bank transfer, card, and mobile money payments per order", color: "text-blue-600 bg-blue-50" },
//               { icon: TrendingUp, title: "Client Intelligence", desc: "See top debtors, collection efficiency, and payment method preferences", color: "text-[#D4A853] bg-[#D4A853]/10" },
//             ].map((item) => (
//               <motion.div
//                 key={item.title}
//                 initial={{ opacity: 0, y: 16 }}
//                 whileInView={{ opacity: 1, y: 0 }}
//                 viewport={{ once: true }}
//                 transition={{ duration: 0.5 }}
//                 className="rounded-2xl border border-white/40 bg-white/65 p-6 backdrop-blur-xl"
//               >
//                 <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.color}`}>
//                   <item.icon className="h-5 w-5" />
//                 </div>
//                 <h3 className="text-sm font-semibold text-[#1A1A2E]">{item.title}</h3>
//                 <p className="mt-1 text-xs leading-relaxed text-[#1A1A2E]/50">{item.desc}</p>
//               </motion.div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* ================================================================== */}
//       {/*  MORE FEATURES GRID                                                */}
//       {/* ================================================================== */}
//       <section className="relative z-10 py-20 sm:py-28">
//         <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             whileInView={{ opacity: 1, y: 0 }}
//             viewport={{ once: true, margin: "-80px" }}
//             transition={{ duration: 0.6 }}
//             className="mb-12 text-center"
//           >
//             <h2 className="text-3xl font-bold tracking-tight text-[#1A1A2E] sm:text-4xl">
//               And So Much{" "}
//               <span className="text-[#C75B39]">More</span>
//             </h2>
//           </motion.div>

//           <motion.div
//             variants={staggerContainer}
//             initial="initial"
//             whileInView="animate"
//             viewport={{ once: true }}
//             className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
//           >
//             {moreFeatures.map((feature) => (
//               <motion.div
//                 key={feature.title}
//                 variants={fadeInUp}
//                 transition={{ duration: 0.4 }}
//                 className="rounded-xl border border-white/30 bg-white/50 p-5 backdrop-blur-sm transition-all hover:bg-white/70"
//               >
//                 <feature.icon className="mb-3 h-5 w-5 text-[#C75B39]" />
//                 <h3 className="text-sm font-semibold text-[#1A1A2E]">{feature.title}</h3>
//                 <p className="mt-1 text-xs leading-relaxed text-[#1A1A2E]/50">
//                   {feature.description}
//                 </p>
//               </motion.div>
//             ))}
//           </motion.div>
//         </div>
//       </section>

//       {/* ================================================================== */}
//       {/*  COMPLETE APP FLOW                                                 */}
//       {/* ================================================================== */}
//       <section className="relative z-10 py-20 sm:py-28">
//         <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             whileInView={{ opacity: 1, y: 0 }}
//             viewport={{ once: true, margin: "-80px" }}
//             transition={{ duration: 0.6 }}
//             className="mb-12 text-center"
//           >
//             <h2 className="text-3xl font-bold tracking-tight text-[#1A1A2E] sm:text-4xl">
//               The Complete{" "}
//               <span className="text-[#D4A853]">Designer Journey</span>
//             </h2>
//             <p className="mx-auto mt-4 max-w-xl text-[#1A1A2E]/55">
//               Here&apos;s exactly what happens from the moment you sign up
//             </p>
//           </motion.div>

//           <motion.div
//             initial={{ opacity: 0 }}
//             whileInView={{ opacity: 1 }}
//             viewport={{ once: true }}
//             transition={{ duration: 0.8 }}
//             className="space-y-4"
//           >
//             {[
//               { phase: "Onboarding", steps: ["Register with name, email, phone & business name", "Complete guided setup: business location, specialties, bio", "Get 3 free AI scans on your Starter plan"] },
//               { phase: "Client Setup", steps: ["Add clients manually or import via CSV", "Generate a unique AI scan link for each client", "Share the link via WhatsApp — client opens it on their phone"] },
//               { phase: "AI Measurement", steps: ["Client opens the scan link (no app install needed)", "Takes a front photo and a side photo following the guide", "AI processes photos on-device and calculates 16+ measurements", "Measurements sync to your dashboard immediately"] },
//               { phase: "Order Management", steps: ["Create orders linked to client measurements", "Set garment type, pricing, fabric details, and due date", "Track through 9 stages: Pending → Confirmed → Cutting → Sewing → Fitting → Finishing → Ready → Delivered", "Upload progress photos to the order gallery"] },
//               { phase: "Payments & Communication", steps: ["Record payments (cash, transfer, card, mobile money)", "Send payment reminders via WhatsApp (English or Pidgin)", "Generate PDF invoices and receipts", "Client receives status updates at every stage"] },
//               { phase: "Growth & Insights", steps: ["Financial dashboard tracks revenue, collection rate, and trends", "Heartbeat CRM flags cold/dormant clients for re-engagement", "Calendar shows upcoming Nigerian events for seasonal planning", "Earn XP and rank up from Apprentice to Legend"] },
//             ].map((section, i) => (
//               <motion.div
//                 key={section.phase}
//                 initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
//                 whileInView={{ opacity: 1, x: 0 }}
//                 viewport={{ once: true }}
//                 transition={{ duration: 0.5, delay: i * 0.05 }}
//                 className="rounded-2xl border border-white/40 bg-white/65 p-6 backdrop-blur-xl sm:p-8"
//               >
//                 <div className="flex items-center gap-3">
//                   <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#C75B39] to-[#D4A853] text-xs font-bold text-white shadow-sm">
//                     {i + 1}
//                   </span>
//                   <h3 className="text-lg font-semibold text-[#1A1A2E]">
//                     {section.phase}
//                   </h3>
//                 </div>
//                 <ul className="mt-4 grid gap-2 sm:grid-cols-2">
//                   {section.steps.map((step) => (
//                     <li key={step} className="flex items-start gap-2 text-sm text-[#1A1A2E]/60">
//                       <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#C75B39]/60" />
//                       {step}
//                     </li>
//                   ))}
//                 </ul>
//               </motion.div>
//             ))}
//           </motion.div>
//         </div>
//       </section>

//       {/* ================================================================== */}
//       {/*  PRICING SECTION                                                   */}
//       {/* ================================================================== */}
//       <section id="pricing" className="relative z-10 py-20 sm:py-28">
//         <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             whileInView={{ opacity: 1, y: 0 }}
//             viewport={{ once: true, margin: "-80px" }}
//             transition={{ duration: 0.6 }}
//             className="mb-16 text-center"
//           >
//             <h2 className="text-3xl font-bold tracking-tight text-[#1A1A2E] sm:text-4xl">
//               Simple, Transparent{" "}
//               <span className="text-[#C75B39]">Pricing</span>
//             </h2>
//             <p className="mx-auto mt-4 max-w-xl text-lg text-[#1A1A2E]/55">
//               Start free, upgrade as you grow. All paid plans include a 14-day free trial.
//               Nigerian Naira pricing — no currency conversion.
//             </p>
//           </motion.div>

//           <motion.div
//             variants={staggerContainer}
//             initial="initial"
//             whileInView="animate"
//             viewport={{ once: true, margin: "-60px" }}
//             className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
//           >
//             {SUBSCRIPTION_PLANS.map((plan, index) => {
//               const isPopular = plan.id === "pro";
//               return (
//                 <motion.div
//                   key={plan.id}
//                   variants={scaleIn}
//                   transition={{ duration: 0.5, delay: index * 0.1 }}
//                   className={`relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 sm:p-8 ${
//                     isPopular
//                       ? "border-[#C75B39]/30 bg-white/80 shadow-[0_16px_48px_rgba(199,91,57,0.12)] backdrop-blur-xl"
//                       : "border-white/40 bg-white/65 shadow-[0_8px_32px_rgba(26,26,46,0.06)] backdrop-blur-xl hover:shadow-[0_16px_48px_rgba(26,26,46,0.1)]"
//                   }`}
//                 >
//                   {plan.badge && (
//                     <div className="absolute right-4 top-4 rounded-full bg-gradient-to-r from-[#C75B39] to-[#D4A853] px-3 py-1 text-xs font-semibold text-white shadow-sm">
//                       {plan.badge}
//                     </div>
//                   )}

//                   <h3 className="text-sm font-semibold uppercase tracking-wider text-[#1A1A2E]/50">
//                     {plan.name}
//                   </h3>

//                   <div className="mt-4 flex items-baseline gap-1">
//                     <span className="text-4xl font-extrabold text-[#1A1A2E]">
//                       {plan.price === 0 ? "Free" : formatCurrency(plan.price)}
//                     </span>
//                     {plan.price > 0 && (
//                       <span className="text-sm text-[#1A1A2E]/50">/month</span>
//                     )}
//                   </div>

//                   {plan.trialDays > 0 && (
//                     <p className="mt-2 text-xs font-medium text-[#C75B39]">
//                       {plan.trialDays}-day free trial included
//                     </p>
//                   )}

//                   <ul className="mt-8 space-y-3">
//                     {plan.features.map((feature) => (
//                       <li
//                         key={feature}
//                         className="flex items-start gap-3 text-sm text-[#1A1A2E]/70"
//                       >
//                         <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16a34a]" />
//                         {feature}
//                       </li>
//                     ))}
//                   </ul>

//                   <div className="mt-8">
//                     <Link href="/register">
//                       <Button
//                         variant={isPopular ? "default" : "outline"}
//                         className="w-full"
//                       >
//                         {plan.price === 0 ? "Start Free" : "Start Free Trial"}
//                       </Button>
//                     </Link>
//                   </div>
//                 </motion.div>
//               );
//             })}
//           </motion.div>

//           {/* Credit Packs */}
//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             whileInView={{ opacity: 1, y: 0 }}
//             viewport={{ once: true }}
//             transition={{ duration: 0.6, delay: 0.3 }}
//             className="mt-12 text-center"
//           >
//             <h3 className="mb-4 text-lg font-semibold text-[#1A1A2E]">
//               Need extra scans? Buy credit packs
//             </h3>
//             <div className="mx-auto grid max-w-xl gap-3 sm:grid-cols-3">
//               {CREDIT_PACKS.map((pack) => (
//                 <div
//                   key={pack.id}
//                   className="relative rounded-xl border border-white/40 bg-white/60 px-4 py-3 text-center backdrop-blur-sm"
//                 >
//                   {pack.badge && (
//                     <span className="absolute -top-2 right-3 rounded-full bg-[#D4A853] px-2 py-0.5 text-[9px] font-bold text-white">
//                       {pack.badge}
//                     </span>
//                   )}
//                   <p className="text-lg font-bold text-[#1A1A2E]">{pack.scans} scans</p>
//                   <p className="text-sm font-medium text-[#C75B39]">{formatCurrency(pack.price)}</p>
//                   <p className="text-[10px] text-[#1A1A2E]/40">{pack.label}</p>
//                 </div>
//               ))}
//             </div>
//           </motion.div>
//         </div>
//       </section>

//       {/* ================================================================== */}
//       {/*  CTA SECTION                                                       */}
//       {/* ================================================================== */}
//       <section className="relative z-10 py-20 sm:py-28">
//         <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//           <motion.div
//             initial={{ opacity: 0, y: 24 }}
//             whileInView={{ opacity: 1, y: 0 }}
//             viewport={{ once: true, margin: "-80px" }}
//             transition={{ duration: 0.6 }}
//             className="relative overflow-hidden rounded-3xl border border-white/30 bg-gradient-to-br from-[#C75B39] to-[#933a22] p-8 text-center shadow-2xl sm:p-12 lg:p-16"
//           >
//             <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-white/10 blur-2xl sm:-top-16 sm:-right-16 sm:h-48 sm:w-48" />
//             <div className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-[#D4A853]/20 blur-2xl sm:-bottom-16 sm:-left-16 sm:h-48 sm:w-48" />

//             <h2 className="relative text-3xl font-bold text-white sm:text-4xl">
//               Ready to Deliver Perfect Fits?
//             </h2>
//             <p className="relative mx-auto mt-4 max-w-lg text-lg text-white/75">
//               Join fashion designers across Nigeria already using Stitcha to
//               take AI measurements, manage orders, track payments, and grow their businesses.
//             </p>
//             <div className="relative mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
//               <Link href="/register">
//                 <Button
//                   size="lg"
//                   className="bg-white text-[#C75B39] shadow-lg hover:bg-white/90 hover:text-[#933a22]"
//                 >
//                   Get Started Free
//                   <ArrowRight className="ml-2 h-4 w-4" />
//                 </Button>
//               </Link>
//               <p className="text-sm text-white/50">
//                 3 free AI scans included. No credit card required.
//               </p>
//             </div>
//           </motion.div>
//         </div>
//       </section>

//       {/* ================================================================== */}
//       {/*  FOOTER                                                            */}
//       {/* ================================================================== */}
//       <footer className="relative z-10 border-t border-[#1A1A2E]/5 py-12">
//         <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//           <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
//             {/* Brand */}
//             <div>
//               <div className="flex items-center gap-2.5">
//                 <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#C75B39] to-[#D4A853] shadow-sm">
//                   <span className="text-xs font-bold text-white">S</span>
//                 </div>
//                 <span className="text-lg font-bold tracking-tight text-[#1A1A2E]">
//                   Stitcha
//                 </span>
//               </div>
//               <p className="mt-3 text-xs leading-relaxed text-[#1A1A2E]/40">
//                 AI-powered body measurement and fashion business management platform.
//                 Built for African fashion designers.
//               </p>
//             </div>

//             {/* Product */}
//             <div>
//               <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/40">
//                 Product
//               </h4>
//               <ul className="mt-3 space-y-2 text-sm text-[#1A1A2E]/55">
//                 <li><a href="#features" className="transition-colors hover:text-[#C75B39]">Features</a></li>
//                 <li><a href="#scanning" className="transition-colors hover:text-[#C75B39]">AI Scanning</a></li>
//                 <li><a href="#pricing" className="transition-colors hover:text-[#C75B39]">Pricing</a></li>
//                 <li><a href="#how-it-works" className="transition-colors hover:text-[#C75B39]">How It Works</a></li>
//               </ul>
//             </div>

//             {/* Features */}
//             <div>
//               <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/40">
//                 Features
//               </h4>
//               <ul className="mt-3 space-y-2 text-sm text-[#1A1A2E]/55">
//                 <li>AI Body Scanning</li>
//                 <li>Order Tracking</li>
//                 <li>WhatsApp Integration</li>
//                 <li>Financial Dashboard</li>
//                 <li>Client Portal</li>
//                 <li>Offline Mode</li>
//               </ul>
//             </div>

//             {/* Get Started */}
//             <div>
//               <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1A1A2E]/40">
//                 Get Started
//               </h4>
//               <ul className="mt-3 space-y-2 text-sm text-[#1A1A2E]/55">
//                 <li><Link href="/register" className="transition-colors hover:text-[#C75B39]">Create Account</Link></li>
//                 <li><Link href="/login" className="transition-colors hover:text-[#C75B39]">Sign In</Link></li>
//               </ul>
//             </div>
//           </div>

//           <div className="mt-10 border-t border-[#1A1A2E]/5 pt-6">
//             <p className="text-center text-xs text-[#1A1A2E]/35">
//               &copy; {new Date().getFullYear()} Stitcha. All rights reserved. Made with love in Nigeria.
//             </p>
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// }



"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import {
  CheckCircle2,
  MessageCircle,
  Ruler,
  FileText,
  Bell,
  ArrowRight,
  ChevronDown,
  Menu,
  X,
  AlertTriangle,
  TrendingUp,
  Clock,
  Smartphone,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const PAINS = [
  {
    icon: AlertTriangle,
    pain: "Client comes for fitting. Measurements are wrong. Remake the whole thing.",
    fix: "Every measurement stored forever. Change alerts when measurements differ from last time.",
    color: "text-red-500",
    bg: "bg-red-50/60",
  },
  {
    icon: Clock,
    pain: "You finish the outfit. Client disappears. You are too polite to keep chasing.",
    fix: "Stitcha generates the WhatsApp reminder for you. One tap sends a professional message.",
    color: "text-amber-500",
    bg: "bg-amber-50/60",
  },
  {
    icon: MessageCircle,
    pain: "Client asks 'how far with my cloth?' You have to go search your notebook.",
    fix: "Client portal shows every order, every status, every measurement. You share the link.",
    color: "text-blue-500",
    bg: "bg-blue-50/60",
  },
  {
    icon: FileText,
    pain: "You send price on WhatsApp. Client claims you said a different amount.",
    fix: "PDF invoice generated in seconds. Amount, deposit, balance — all documented.",
    color: "text-purple-500",
    bg: "bg-purple-50/60",
  },
];

const FEATURES = [
  {
    icon: Ruler,
    title: "Guided measurement entry",
    desc: "Step-by-step guide for every measurement. Works on any phone. No AI needed. Just your tape measure.",
    free: true,
  },
  {
    icon: MessageCircle,
    title: "WhatsApp everything",
    desc: "Send measurements, invoices, order updates, and payment reminders directly to WhatsApp. One tap.",
    free: true,
  },
  {
    icon: Bell,
    title: "Payment chaser",
    desc: "See all unpaid balances grouped by how overdue they are. Generate a WhatsApp message in one tap.",
    free: true,
  },
  {
    icon: FileText,
    title: "PDF invoices",
    desc: "Professional invoice with your business name, itemised charges, deposit paid, and balance due.",
    free: true,
  },
  {
    icon: Smartphone,
    title: "Works offline",
    desc: "Load shedding? No data? The app still works. Everything syncs when you reconnect.",
    free: true,
  },
  {
    icon: TrendingUp,
    title: "AI body scanning",
    desc: "Client takes two photos on their phone. Our AI extracts 25+ measurements. No tape measure required.",
    free: false,
  },
];

const COMPARISON = [
  { item: "Store client measurements",        notebook: "✓ Paper notebook",          stitcha: "✓ Free" },
  { item: "Find a client's measurements",     notebook: "Search through pages",       stitcha: "✓ Search instantly" },
  { item: "Track order status",               notebook: "✗ Not possible",            stitcha: "✓ Free" },
  { item: "Send invoice",                     notebook: "✗ Not possible",            stitcha: "✓ Free" },
  { item: "Payment reminders",                notebook: "Manually write message",    stitcha: "✓ One tap — Free" },
  { item: "Measurement history",              notebook: "Old pages get lost",         stitcha: "✓ Free" },
  { item: "WhatsApp measurement card",        notebook: "✗ Not possible",            stitcha: "✓ Free" },
  { item: "AI body scanning from photo",      notebook: "✗ Not possible",            stitcha: "✓ Plus (₦1,500/mo)" },
];

const TESTIMONIALS = [
  {
    name: "Chidinma Okafor",
    city: "Aba",
    text: "Before Stitcha I was using notebook and WhatsApp. I lost ₦67,000 to remakes in one year because of wrong measurements. Now every measurement is saved. I have not done a remake in 4 months.",
    specialty: "Aso Oke & Bridal",
  },
  {
    name: "Fatima Bello",
    city: "Kano",
    text: "The payment reminder feature alone is worth it. I used to be afraid to chase my clients. Now I just tap one button and a polite message goes. I have collected 3 payments I thought were gone.",
    specialty: "Corporate & Suits",
  },
  {
    name: "Emmanuel Adeyemi",
    city: "Lagos",
    text: "I started with the free plan to test it. Within two weeks I was already converted. My clients are impressed that I send them a proper measurement card on WhatsApp.",
    specialty: "Agbada & Kaftan",
  },
];

const FAQ = [
  {
    q: "Is the free plan really free forever?",
    a: "Yes. Unlimited clients, unlimited orders, measurements, invoices, WhatsApp reminders — all free, no expiry, no credit card. We make money from the Plus and Pro tiers for designers who want AI scanning.",
  },
  {
    q: "What if I have no internet?",
    a: "The app works offline. All actions are queued and sync automatically when you reconnect. Load shedding cannot stop your work.",
  },
  {
    q: "Do I need a smartphone for the AI scanning?",
    a: "The AI scan requires a reasonably good camera phone — most smartphones from 2020 onwards work fine. The guided tape measure entry works on any phone, including older ones.",
  },
  {
    q: "Can I use the WhatsApp bot from my phone?",
    a: "Yes. Once set up, you can send commands directly from WhatsApp — add clients, create orders, check unpaid balances, view measurements — without opening the app.",
  },
  {
    q: "What happens to my data if I stop using Stitcha?",
    a: "You can export all your client and measurement data as a CSV or PDF at any time from Settings. Your data is yours.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#1A1A2E]/8 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="pr-4 text-sm font-medium text-[#1A1A2E]">{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#1A1A2E]/40 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="pb-4 text-sm leading-relaxed text-[#1A1A2E]/60">{a}</p>
      )}
    </div>
  );
}

export default function HomePage() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-[#1A1A2E]/6 bg-[#FAFAF8]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#C75B39] to-[#D4A853]">
              <span className="text-xs font-black text-white">S</span>
            </div>
            <span className="text-base font-bold text-[#1A1A2E]">Stitcha</span>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-[#1A1A2E]/60 hover:text-[#1A1A2E]">Features</a>
            <a href="#pricing" className="text-sm text-[#1A1A2E]/60 hover:text-[#1A1A2E]">Pricing</a>
            <a href="#testimonials" className="text-sm text-[#1A1A2E]/60 hover:text-[#1A1A2E]">Stories</a>
            <Link href="/login" className="text-sm text-[#1A1A2E]/60 hover:text-[#1A1A2E]">Sign in</Link>
            <Link href="/register">
              <Button size="sm">Start free</Button>
            </Link>
          </div>
          <button className="md:hidden" onClick={() => setNavOpen(!navOpen)}>
            {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {navOpen && (
          <div className="space-y-3 border-t border-[#1A1A2E]/6 bg-[#FAFAF8] px-4 py-4 md:hidden">
            <a href="#features" className="block text-sm text-[#1A1A2E]/70" onClick={() => setNavOpen(false)}>Features</a>
            <a href="#pricing" className="block text-sm text-[#1A1A2E]/70" onClick={() => setNavOpen(false)}>Pricing</a>
            <a href="#testimonials" className="block text-sm text-[#1A1A2E]/70" onClick={() => setNavOpen(false)}>Stories</a>
            <Link href="/login" className="block text-sm text-[#1A1A2E]/70" onClick={() => setNavOpen(false)}>Sign in</Link>
            <Link href="/register" onClick={() => setNavOpen(false)}>
              <Button className="w-full">Start free</Button>
            </Link>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="mx-auto max-w-5xl px-4 pb-12 pt-16 text-center">
        <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">
              Free forever — no credit card needed
            </span>
          </div>
          <h1 className="text-4xl font-black leading-tight text-[#1A1A2E] sm:text-5xl lg:text-6xl">
            Stop losing money
            <br />
            <span className="bg-gradient-to-r from-[#C75B39] to-[#D4A853] bg-clip-text text-transparent">
              to wrong measurements
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[#1A1A2E]/60">
            Stitcha helps Nigerian fashion designers store measurements, track orders,
            send invoices, and chase payments — all from their phone. It replaces your
            notebook and your WhatsApp drafts folder.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/register">
              <Button size="lg" className="w-full px-8 sm:w-auto">
                Start for free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#pains">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                See the problems it solves
              </Button>
            </a>
          </div>
          <p className="mt-4 text-sm text-[#1A1A2E]/35">
            Unlimited clients · Unlimited orders · Free forever
          </p>
        </motion.div>
      </section>

      {/* PAIN POINTS */}
      <section id="pains" className="bg-white/60 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="mb-10 text-center">
            <h2 className="text-2xl font-black text-[#1A1A2E] sm:text-3xl">
              Every designer in Nigeria knows these problems
            </h2>
            <p className="mt-3 text-[#1A1A2E]/55">
              Stitcha was built to fix them. Not to impress investors. To fix them.
            </p>
          </motion.div>
          <div className="grid gap-4 sm:grid-cols-2">
            {PAINS.map(({ icon: Icon, pain, fix, color, bg }, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-2xl border border-[#1A1A2E]/6 bg-white p-5"
              >
                <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <p className="text-sm font-semibold leading-snug text-[#1A1A2E]">
                  😤 {pain}
                </p>
                <div className="mt-3 flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <p className="text-sm text-[#1A1A2E]/60">{fix}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-black text-[#1A1A2E] sm:text-3xl">
              What Stitcha does
            </h2>
            <p className="mt-2 text-[#1A1A2E]/55">
              The free plan has everything you need to run your business professionally.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc, free }, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl border border-[#1A1A2E]/6 bg-white/60 p-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#C75B39]/10">
                    <Icon className="h-5 w-5 text-[#C75B39]" />
                  </div>
                  {free ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                      FREE
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#D4A853]/10 px-2 py-0.5 text-[10px] font-bold text-[#D4A853]">
                      PLUS
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-[#1A1A2E]">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#1A1A2E]/55">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="bg-white/60 py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-black text-[#1A1A2E]">
              Stitcha vs your notebook
            </h2>
            <p className="mt-2 text-sm text-[#1A1A2E]/50">
              We are not comparing ourselves to other apps. We are comparing to what you use today.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#1A1A2E]/8">
            <div className="grid grid-cols-3 border-b border-[#1A1A2E]/8 bg-[#1A1A2E]/4 px-4 py-3">
              <span className="text-xs font-bold text-[#1A1A2E]/50">Feature</span>
              <span className="text-center text-xs font-bold text-[#1A1A2E]/50">Notebook + WhatsApp</span>
              <span className="text-center text-xs font-bold text-[#C75B39]">Stitcha</span>
            </div>
            {COMPARISON.map(({ item, notebook, stitcha }, i) => (
              <div
                key={i}
                className={`grid grid-cols-3 border-b border-[#1A1A2E]/6 px-4 py-3 last:border-0 ${
                  i % 2 === 0 ? "bg-white" : "bg-[#FAFAF8]"
                }`}
              >
                <span className="pr-2 text-xs text-[#1A1A2E]/70">{item}</span>
                <span className="text-center text-xs text-[#1A1A2E]/45">{notebook}</span>
                <span className="text-center text-xs font-medium text-emerald-600">{stitcha}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-black text-[#1A1A2E]">
              Real designers. Real results.
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {TESTIMONIALS.map(({ name, city, text, specialty }, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-[#1A1A2E]/6 bg-white p-5"
              >
                <p className="text-sm leading-relaxed text-[#1A1A2E]/70">
                  &ldquo;{text}&rdquo;
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#C75B39] to-[#D4A853] text-xs font-bold text-white">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A2E]">{name}</p>
                    <p className="text-xs text-[#1A1A2E]/45">{specialty} · {city}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-white/60 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-black text-[#1A1A2E]">Simple, honest pricing</h2>
            <p className="mt-2 text-[#1A1A2E]/55">
              The free plan has no limits. Upgrade only if you want AI scanning.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-6 ${
                  plan.badge === "Most Popular"
                    ? "border-[#C75B39]/40 bg-[#C75B39]/[0.03] shadow-lg"
                    : "border-[#1A1A2E]/8 bg-white"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-[#C75B39] px-3 py-1 text-[10px] font-bold text-white">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <h3 className="text-lg font-black text-[#1A1A2E]">{plan.name}</h3>
                <p className="mt-1 text-xs text-[#1A1A2E]/50">
                  {(plan as { description?: string }).description}
                </p>
                <div className="mt-4 flex items-baseline gap-1">
                  {plan.price === 0 ? (
                    <span className="text-4xl font-black text-[#1A1A2E]">Free</span>
                  ) : (
                    <>
                      <span className="text-4xl font-black text-[#1A1A2E]">
                        {formatCurrency(plan.price)}
                      </span>
                      <span className="text-sm text-[#1A1A2E]/40">/mo</span>
                    </>
                  )}
                </div>
                <div className="mt-5 space-y-2.5">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span className="text-xs text-[#1A1A2E]/65">{f}</span>
                    </div>
                  ))}
                </div>
                <Link href="/register" className="mt-6 block">
                  <Button
                    className="w-full"
                    variant={plan.badge === "Most Popular" ? "default" : "outline"}
                  >
                    {plan.price === 0
                      ? "Start free"
                      : `Try ${plan.name} — 14 days free`}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-[#1A1A2E]/40">
            Need just a few AI scans? Buy credits for ₦150 per scan — no subscription needed.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="mx-auto max-w-2xl px-4">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-black text-[#1A1A2E]">Common questions</h2>
          </div>
          <div className="rounded-2xl border border-[#1A1A2E]/8 bg-white px-5">
            {FAQ.map(({ q, a }) => (
              <FaqItem key={q} q={q} a={a} />
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-gradient-to-br from-[#1A1A2E] to-[#2d2d4e] py-16">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-3xl font-black text-white">
            Start today. It&apos;s free.
          </h2>
          <p className="mt-3 text-white/60">
            No credit card. No trial that expires. Just a better way to run your fashion business.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/register">
              <Button
                size="lg"
                className="w-full bg-[#C75B39] px-8 text-white hover:bg-[#b14a2b] sm:w-auto"
              >
                Create free account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                size="lg"
                className="w-full border-white/20 text-white hover:bg-white/10 sm:w-auto"
              >
                Sign in
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/30">
            Stitcha is built specifically for Nigerian and African fashion designers.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#1A1A2E]/8 bg-[#FAFAF8] py-8">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#C75B39] to-[#D4A853]">
                <span className="text-[9px] font-black text-white">S</span>
              </div>
              <span className="text-sm font-bold text-[#1A1A2E]">Stitcha</span>
            </div>
            <div className="flex gap-6">
              <Link href="/login" className="text-xs text-[#1A1A2E]/40 hover:text-[#1A1A2E]">Sign in</Link>
              <Link href="/register" className="text-xs text-[#1A1A2E]/40 hover:text-[#1A1A2E]">Register</Link>
            </div>
            <p className="text-xs text-[#1A1A2E]/30">
              Built for Nigeria and Africa. © 2025 Stitcha.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}