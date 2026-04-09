"use client";

import { useCallback, useEffect, useState } from "react";

export type MeasurementUnit = "in" | "cm";

const STORAGE_KEY = "stitcha_unit_pref";

/**
 * Persists the user's unit preference (inches or cm) in localStorage.
 * Defaults to "in" (inches) — Nigerian fashion designers work in inches.
 */
export function useUnitPreference() {
  const [unit, setUnitState] = useState<MeasurementUnit>("in");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as MeasurementUnit | null;
      if (stored === "cm" || stored === "in") {
        setUnitState(stored);
      }
    } catch {
      // localStorage not available (SSR / private mode) — keep default
    }
  }, []);

  const setUnit = useCallback((u: MeasurementUnit) => {
    setUnitState(u);
    try {
      localStorage.setItem(STORAGE_KEY, u);
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    setUnit(unit === "in" ? "cm" : "in");
  }, [unit, setUnit]);

  return { unit, setUnit, toggle };
}
