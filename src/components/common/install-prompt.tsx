"use client";

/* -------------------------------------------------------------------------- */
/*  InstallPrompt — persistent, schedule-aware PWA install banner.             */
/*                                                                              */
/*  Behaviour (per requirements):                                              */
/*   • Pops up at least 3 separate visits if not installed.                    */
/*   • If the user dismisses the third time, sleeps 30 days, then re-asks.    */
/*   • If the user clicks "Don't show again" we honour it permanently.         */
/*   • Detects if the app is already installed (display-mode standalone, iOS  */
/*     standalone, or prior `appinstalled` event) and never shows in that     */
/*     case.                                                                    */
/*   • iOS Safari (no `beforeinstallprompt`) gets explicit Share→Add to Home   */
/*     Screen instructions.                                                     */
/*   • A custom event `stitcha:show-install-prompt` triggers an immediate     */
/*     prompt (used by signup/login success).                                  */
/* -------------------------------------------------------------------------- */

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, X, Share, Plus, Compass, MoreHorizontal } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE = {
  installed:        "pwa-installed",
  promptCount:      "pwa-prompt-count",
  lastShown:        "pwa-last-shown",
  lastDismissed:    "pwa-last-dismissed",
  permanentDecline: "pwa-permanent-decline",
};

const SCHEDULE = {
  /** Minimum number of times we want to surface the prompt. */
  minPromptsBeforeBackoff: 3,
  /** Don't reshow within this window of an earlier prompt (hours). */
  reshowCooldownHours: 4,
  /** After hitting the min count, sleep this many days before retry. */
  backoffDays: 30,
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/* -------------------------------------------------------------------------- */
/*  Detection helpers                                                           */
/* -------------------------------------------------------------------------- */

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS Safari home-screen
  // @ts-expect-error legacy iOS API
  if (typeof navigator !== "undefined" && navigator.standalone === true) return true;
  return false;
}

function isAlreadyInstalled(): boolean {
  if (isStandalone()) return true;
  return lsGet(STORAGE.installed) === "1";
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPad on iPadOS reports as Mac; check touch points
  const iPadOS =
    navigator.platform === "MacIntel" &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || iPadOS;
}

function isIOSSafari(): boolean {
  if (!isIOS()) return false;
  const ua = navigator.userAgent;
  // Exclude Chrome on iOS (CriOS), Firefox (FxiOS), Edge (EdgiOS), and in-app browsers
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|FBAN|FBAV|Instagram|Line|MicroMessenger/.test(ua);
}

function detectInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /FBAN|FBAV|Instagram|Line|MicroMessenger|Snapchat|Twitter/.test(navigator.userAgent);
}

/* -------------------------------------------------------------------------- */
/*  Schedule logic                                                              */
/* -------------------------------------------------------------------------- */

interface ScheduleState {
  shouldShow: boolean;
  reason: string;
}

function evaluateSchedule(): ScheduleState {
  if (isAlreadyInstalled()) return { shouldShow: false, reason: "installed" };
  if (lsGet(STORAGE.permanentDecline) === "1") return { shouldShow: false, reason: "declined" };

  const now = Date.now();
  const lastShown = parseInt(lsGet(STORAGE.lastShown) || "0", 10);
  const lastDismissed = parseInt(lsGet(STORAGE.lastDismissed) || "0", 10);
  const count = parseInt(lsGet(STORAGE.promptCount) || "0", 10);

  // Cooldown — don't show twice within 4 hours
  if (lastShown && now - lastShown < SCHEDULE.reshowCooldownHours * HOUR_MS) {
    return { shouldShow: false, reason: "cooldown" };
  }

  // Have we hit the minimum prompt count?
  if (count < SCHEDULE.minPromptsBeforeBackoff) {
    return { shouldShow: true, reason: "below-min" };
  }

  // After min, only reshow once back-off window has passed
  if (lastDismissed && now - lastDismissed > SCHEDULE.backoffDays * DAY_MS) {
    return { shouldShow: true, reason: "post-backoff" };
  }

  return { shouldShow: false, reason: "in-backoff" };
}

function recordShown() {
  const now = Date.now();
  lsSet(STORAGE.lastShown, String(now));
  const count = parseInt(lsGet(STORAGE.promptCount) || "0", 10) + 1;
  lsSet(STORAGE.promptCount, String(count));
}

function recordDismissed() {
  lsSet(STORAGE.lastDismissed, String(Date.now()));
}

function recordPermanentDecline() {
  lsSet(STORAGE.permanentDecline, "1");
}

function recordInstalled() {
  lsSet(STORAGE.installed, "1");
}

/* -------------------------------------------------------------------------- */
/*  Imperative trigger — call from anywhere (signup, etc.)                    */
/* -------------------------------------------------------------------------- */

export function triggerInstallPrompt() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("stitcha:show-install-prompt"));
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                   */
/* -------------------------------------------------------------------------- */

type IosMode = "safari" | "other-browser" | "in-app";
type Variant = "chromium" | "ios";

export function InstallPrompt() {
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState<Variant>("chromium");
  const [iosMode, setIosMode] = useState<IosMode>("safari");
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const shownThisMountRef = useRef(false);

  /* ---- Detect and evaluate ---- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isAlreadyInstalled()) return;

    // Capture beforeinstallprompt for Chromium browsers
    const onBIP = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      // Don't override variant if we already chose iOS; on non-iOS it's chromium
      if (!isIOS()) {
        setVariant("chromium");
        maybeShow();
      }
    };

    const onInstalled = () => {
      recordInstalled();
      setOpen(false);
    };

    const onForceShow = () => {
      forceShow();
    };

    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("stitcha:show-install-prompt", onForceShow);

    // iOS path — beforeinstallprompt never fires on ANY iOS browser.
    // Show the iOS instructions card for every iOS visitor (the copy adapts).
    if (isIOS()) {
      setVariant("ios");
      if (detectInAppBrowser()) setIosMode("in-app");
      else if (isIOSSafari()) setIosMode("safari");
      else setIosMode("other-browser");

      // Slight delay so the prompt doesn't compete with first paint
      const t = window.setTimeout(() => maybeShow(), 1500);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBIP);
        window.removeEventListener("appinstalled", onInstalled);
        window.removeEventListener("stitcha:show-install-prompt", onForceShow);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("stitcha:show-install-prompt", onForceShow);
    };

    function maybeShow() {
      if (shownThisMountRef.current) return;
      const { shouldShow } = evaluateSchedule();
      if (!shouldShow) return;
      shownThisMountRef.current = true;
      recordShown();
      setOpen(true);
    }

    function forceShow() {
      // Honour permanent decline + already-installed; otherwise bypass cooldown
      if (isAlreadyInstalled()) return;
      if (lsGet(STORAGE.permanentDecline) === "1") return;
      shownThisMountRef.current = true;
      recordShown();
      setOpen(true);
    }
    // Mount-only effect; effect deps remain stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Actions ---- */
  const handleInstall = useCallback(async () => {
    const dp = deferredRef.current;
    if (!dp) {
      setOpen(false);
      return;
    }
    try {
      await dp.prompt();
      const choice = await dp.userChoice;
      if (choice.outcome === "accepted") {
        recordInstalled();
      } else {
        recordDismissed();
      }
    } finally {
      deferredRef.current = null;
      setOpen(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    recordDismissed();
    setOpen(false);
  }, []);

  const handleNeverShow = useCallback(() => {
    recordPermanentDecline();
    setOpen(false);
  }, []);

  if (!open) return null;

  /* ---- Render ---- */
  if (variant === "ios") {
    return <IosInstallCard mode={iosMode} onDismiss={handleDismiss} onNeverShow={handleNeverShow} />;
  }

  // Chromium / Android
  return (
    <div
      role="dialog"
      aria-label="Install Stitcha"
      className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-sm animate-slide-up lg:bottom-6 lg:left-auto lg:right-6"
    >
      <div className="rounded-2xl border border-white/30 bg-white/85 p-4 shadow-[0_12px_40px_rgba(26,26,46,0.16)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#C75B39] to-[#D4A853]">
            <Download className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1A2E]">Install Stitcha</p>
            <p className="text-xs text-[#1A1A2E]/55">Add to home screen — works offline.</p>
          </div>
          <button
            onClick={handleInstall}
            className="shrink-0 rounded-xl bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-4 py-2 text-xs font-semibold text-white shadow-md transition-all active:scale-95"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-[#1A1A2E]/40 hover:bg-[#1A1A2E]/5"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={handleNeverShow}
          className="mt-2 block w-full text-center text-[10px] text-[#1A1A2E]/35 hover:text-[#1A1A2E]/60"
        >
          Don&apos;t show again
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  IosInstallCard — adapts copy to Safari / non-Safari iOS browser /         */
/*  in-app browser. Always renders large-format steps because iOS users can't */
/*  trigger a one-tap install — they need to tap Share → Add to Home Screen.  */
/* -------------------------------------------------------------------------- */

function IosInstallCard({
  mode,
  onDismiss,
  onNeverShow,
}: {
  mode: IosMode;
  onDismiss: () => void;
  onNeverShow: () => void;
}) {
  const copy =
    mode === "safari"
      ? {
          title: "Install Stitcha",
          subtitle: "Add to Home Screen — works offline, opens fast.",
          steps: [
            { icon: <Share className="h-4 w-4" />, text: "Tap Share at the bottom of Safari" },
            { icon: <Plus className="h-4 w-4" />, text: 'Choose "Add to Home Screen"' },
            { icon: null, text: 'Tap "Add" — done.' },
          ],
        }
      : mode === "other-browser"
      ? {
          title: "Install Stitcha (open in Safari)",
          subtitle: "iOS only lets Safari add apps to the Home Screen.",
          steps: [
            { icon: <MoreHorizontal className="h-4 w-4" />, text: "Tap the … menu in this browser" },
            { icon: <Compass className="h-4 w-4" />, text: 'Choose "Open in Safari"' },
            { icon: <Share className="h-4 w-4" />, text: "Then tap Share → Add to Home Screen" },
          ],
        }
      : {
          // in-app (Instagram, Facebook, TikTok, etc.)
          title: "Install Stitcha",
          subtitle: "First open this page in Safari — tap the … menu and choose 'Open in Safari'.",
          steps: [
            { icon: <MoreHorizontal className="h-4 w-4" />, text: "Tap the … menu (or Open in browser)" },
            { icon: <Compass className="h-4 w-4" />, text: "Open in Safari" },
            { icon: <Share className="h-4 w-4" />, text: "Tap Share → Add to Home Screen" },
          ],
        };

  return (
    <div
      role="dialog"
      aria-label="Install Stitcha"
      className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-sm animate-slide-up lg:bottom-6 lg:left-auto lg:right-6"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="rounded-2xl border border-white/40 bg-white/95 p-4 shadow-[0_16px_50px_rgba(26,26,46,0.22)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          {/* Use the actual app icon, not a generic download glyph */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#C75B39] to-[#D4A853] shadow-[0_4px_14px_rgba(199,91,57,0.35)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/apple-touch-icon.png"
              alt="Stitcha"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-[#1A1A2E]">{copy.title}</p>
            <p className="mt-0.5 text-xs leading-snug text-[#1A1A2E]/60">{copy.subtitle}</p>
          </div>
          <button
            onClick={onDismiss}
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-[#1A1A2E]/45 hover:bg-[#1A1A2E]/5"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ol className="mt-3 space-y-1.5 rounded-xl border border-[#1A1A2E]/8 bg-[#FAFAF8] p-3">
          {copy.steps.map((step, i) => (
            <li key={i} className="flex items-center gap-2.5 text-[12px] leading-tight text-[#1A1A2E]/80">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C75B39] to-[#D4A853] text-[10px] font-bold text-white">
                {i + 1}
              </span>
              {step.icon && (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-[#1A1A2E]/65 shadow-sm">
                  {step.icon}
                </span>
              )}
              <span className="min-w-0 flex-1">{step.text}</span>
            </li>
          ))}
        </ol>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            onClick={onNeverShow}
            className="text-[11px] text-[#1A1A2E]/40 hover:text-[#1A1A2E]/60"
          >
            Don&apos;t show again
          </button>
          <button
            onClick={onDismiss}
            className="rounded-lg bg-gradient-to-r from-[#C75B39] to-[#b14a2b] px-4 py-2 text-xs font-semibold text-white shadow-md active:scale-95"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
