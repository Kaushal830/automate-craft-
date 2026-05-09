"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
} from "@/lib/supabase-browser";

/* LOGIC EXPLAINED:
The app needed one Supabase client available globally without changing the UI.
This provider creates the shared browser client once, exposes it through
context, and refreshes the app when Supabase auth state changes so login/logout
status stays in sync across server and client components.
*/

const SupabaseContext = createContext<SupabaseClient | null>(null);
const DEBUG_ENABLED = process.env.NEXT_PUBLIC_ENABLE_RUNTIME_DEBUG === "true";
const DEBUG_ENDPOINT = "http://127.0.0.1:7855/ingest/35f1ca99-d0a5-471f-8d2e-699878613661";
const DEBUG_SESSION_ID = "76d521";

function postDebugLog(payload: {
  runId: string;
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
}) {
  if (!DEBUG_ENABLED) {
    return;
  }

  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": DEBUG_SESSION_ID,
    },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      ...payload,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [client] = useState<SupabaseClient | null>(() =>
    getSupabaseBrowserClient(),
  );

  useEffect(() => {
    postDebugLog({
      runId: "baseline",
      hypothesisId: "H1",
      location: "src/components/providers/SupabaseProvider.tsx:58",
      message: "Supabase provider effect started",
      data: {
        hasClient: Boolean(client),
        isConfigured: isSupabaseBrowserConfigured(),
      },
    });

    if (!client || !isSupabaseBrowserConfigured()) {
      return;
    }

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        return;
      }

      postDebugLog({
        runId: "baseline",
        hypothesisId: "H1",
        location: "src/components/providers/SupabaseProvider.tsx:76",
        message: "Supabase auth state changed",
        data: { event },
      });
      router.refresh();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [client, router]);

  return (
    <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>
  );
}

export function useSupabaseClient() {
  return useContext(SupabaseContext);
}
