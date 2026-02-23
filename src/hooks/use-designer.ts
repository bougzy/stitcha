"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import type { Designer } from "@/types";

interface UseDesignerReturn {
  designer: Designer | null;
  isLoading: boolean;
  error: string | null;
  mutate: () => Promise<void>;
}

export function useDesigner(): UseDesignerReturn {
  const { data: session, status } = useSession();
  const [designer, setDesigner] = useState<Designer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDesigner = useCallback(async () => {
    if (status === "loading") return;

    if (!session?.user) {
      setDesigner(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/designer/profile");

      if (!response.ok) {
        throw new Error("Failed to fetch designer profile");
      }

      const data = await response.json();

      if (data.success) {
        setDesigner(data.data);
      } else {
        throw new Error(data.error || "Failed to fetch designer profile");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setDesigner(null);
    } finally {
      setIsLoading(false);
    }
  }, [session, status]);

  useEffect(() => {
    fetchDesigner();
  }, [fetchDesigner]);

  const mutate = useCallback(async () => {
    await fetchDesigner();
  }, [fetchDesigner]);

  return { designer, isLoading, error, mutate };
}
