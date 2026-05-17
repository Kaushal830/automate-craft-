"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

/* LOGIC EXPLAINED:
This provider keeps one shared credits state for the whole app. Before this,
the button fetched its own credits locally, so different pages could get out of
sync and the value would not update immediately after a run. The fix moves the
credits fetch, fallback handling, and realtime updates into one global place so
every consumer reads the same value and can refresh it after credit-changing
actions.
*/

export type CreditsState = {
  planCredits: number;
  extraCredits: number;
  totalCredits: number;
  monthlyUsage: number;
  hasSubscription: boolean;
};

type CreditsContextValue = {
  credits: CreditsState;
  loading: boolean;
  refreshCredits: () => Promise<void>;
};

const DEFAULT_CREDITS: CreditsState = {
  planCredits: 0,
  extraCredits: 0,
  totalCredits: 0,
  monthlyUsage: 0,
  hasSubscription: false,
};

const CreditsContext = createContext<CreditsContextValue>({
  credits: DEFAULT_CREDITS,
  loading: true,
  refreshCredits: async () => {},
});

export function dispatchCreditsRefresh() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event("credits:refresh"));
}

function normalizeCredits(data: Partial<CreditsState> | null | undefined): CreditsState {
  return {
    planCredits: data?.planCredits ?? 0,
    extraCredits: data?.extraCredits ?? 0,
    totalCredits: data?.totalCredits ?? 0,
    monthlyUsage: data?.monthlyUsage ?? 0,
    hasSubscription: data?.hasSubscription ?? false,
  };
}

export function CreditsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [credits, setCredits] = useState<CreditsState>(DEFAULT_CREDITS);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const creditsEnabled =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/setup") ||
    pathname.startsWith("/onboarding");

  const refreshCredits = useCallback(async () => {
    if (!creditsEnabled) {
      setCredits(DEFAULT_CREDITS);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/credits", {
        cache: "no-store",
        credentials: "include",
      });

      if (!response.ok) {
        setCredits(DEFAULT_CREDITS);
        return;
      }

      const data = (await response.json()) as Partial<CreditsState>;
      setCredits(normalizeCredits(data));
    } catch (error) {
      console.error("Failed to fetch credits.", error);
      setCredits(DEFAULT_CREDITS);
    } finally {
      setLoading(false);
    }
  }, [creditsEnabled]);

  useEffect(() => {
    if (!creditsEnabled) {
      setCredits(DEFAULT_CREDITS);
      setCurrentUserId(null);
      setLoading(false);
      return;
    }

    void refreshCredits();
  }, [creditsEnabled, refreshCredits]);

  useEffect(() => {
    if (!creditsEnabled) {
      return;
    }

    const handleRefresh = () => {
      void refreshCredits();
    };

    window.addEventListener("credits:refresh", handleRefresh);

    return () => {
      window.removeEventListener("credits:refresh", handleRefresh);
    };
  }, [creditsEnabled, refreshCredits]);

  useEffect(() => {
    if (!creditsEnabled) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    let isMounted = true;

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!isMounted) {
        return;
      }

      setCurrentUserId(user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        return;
      }

      setCurrentUserId(session?.user?.id ?? null);
      void refreshCredits();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [creditsEnabled, refreshCredits]);

  useEffect(() => {
    if (!creditsEnabled || !currentUserId) {
      return;
    }

    let channel: RealtimeChannel | null = null;
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    channel = supabase
        .channel(`credits-realtime-${currentUserId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${currentUserId}`,
          },
          (payload) => {
            const row = payload.new as {
              plan_credits?: number;
              extra_credits?: number;
              credits?: number;
            };

            const planCredits = row.plan_credits ?? row.credits ?? 0;
            const extraCredits = row.extra_credits ?? 0;

            setCredits((current) => ({
              ...current,
              planCredits,
              extraCredits,
              totalCredits: planCredits + extraCredits,
            }));
          },
        )
        .subscribe();

    return () => {
      if (supabase && channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [creditsEnabled, currentUserId]);

  const value = useMemo(
    () => ({
      credits,
      loading,
      refreshCredits,
    }),
    [credits, loading, refreshCredits],
  );

  return <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>;
}

export function useCredits() {
  return useContext(CreditsContext);
}
