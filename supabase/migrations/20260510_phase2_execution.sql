-- =============================================================================
-- Phase 2 — Execution + Connections + Vault
-- -----------------------------------------------------------------------------
-- Adds the storage substrate for:
--   - connections (new — coexists with legacy connected_integrations)
--   - credentials_vault (new — encrypted secrets)
--   - deployments (new — adapter-specific deploy lifecycle)
--   - step_executions (new — granular per-step run logs)
--   - runtime_events (new — append-only event stream)
--
-- Backward compatibility:
--   - public.connected_integrations is preserved untouched.
--   - automation_runs gets new nullable columns (deployment_id, version_id,
--     trigger_kind) — existing rows unaffected.
--
-- All new tables use RLS with `auth.uid() = user_id` policies. Service-role
-- has unrestricted access via the supabase admin client.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. connections (new normalized table)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.connections (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  integration   TEXT         NOT NULL,
  status        TEXT         NOT NULL CHECK (status IN ('pending','connected','expired','revoked')),
  display_name  TEXT,
  scopes        TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  metadata      JSONB        NOT NULL DEFAULT '{}'::jsonb,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- One row per (user, integration) — multiple credentials per integration are
  -- distinguished by `credentials_vault.name`, not by additional connection rows.
  UNIQUE (user_id, integration)
);

CREATE INDEX IF NOT EXISTS idx_connections_user
  ON public.connections (user_id);

CREATE INDEX IF NOT EXISTS idx_connections_user_status
  ON public.connections (user_id, status)
  WHERE status = 'connected';

DROP TRIGGER IF EXISTS set_connections_updated_at ON public.connections;
CREATE TRIGGER set_connections_updated_at
  BEFORE UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. credentials_vault (encrypted secret storage)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.credentials_vault (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  integration     TEXT         NOT NULL,
  name            TEXT         NOT NULL,
  encrypted_blob  BYTEA        NOT NULL,
  key_id          TEXT         NOT NULL DEFAULT 'v1',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Each credential addressed by (user, integration, name).
  UNIQUE (user_id, integration, name)
);

CREATE INDEX IF NOT EXISTS idx_credentials_vault_user
  ON public.credentials_vault (user_id);

CREATE INDEX IF NOT EXISTS idx_credentials_vault_integration
  ON public.credentials_vault (user_id, integration);

DROP TRIGGER IF EXISTS set_credentials_vault_updated_at ON public.credentials_vault;
CREATE TRIGGER set_credentials_vault_updated_at
  BEFORE UPDATE ON public.credentials_vault
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. deployments (adapter deployment records)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.deployments (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id  UUID         NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  user_id        UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  version_id     UUID         NOT NULL REFERENCES public.workflow_versions(id) ON DELETE RESTRICT,
  adapter        TEXT         NOT NULL,            -- "n8n" | "temporal" | ...
  state          TEXT         NOT NULL CHECK (state IN ('draft','validated','deployable','deployed','active','paused','failed')),
  external_ref   JSONB,                            -- adapter-opaque deployment handle
  last_error     TEXT,
  deployed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- At most one ACTIVE deployment per (automation, adapter). Multiple historical
-- failed/replaced rows are allowed.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_deployments_one_active
  ON public.deployments (automation_id, adapter)
  WHERE state IN ('deployed','active','paused');

CREATE INDEX IF NOT EXISTS idx_deployments_user
  ON public.deployments (user_id);

CREATE INDEX IF NOT EXISTS idx_deployments_automation
  ON public.deployments (automation_id, created_at DESC);

DROP TRIGGER IF EXISTS set_deployments_updated_at ON public.deployments;
CREATE TRIGGER set_deployments_updated_at
  BEFORE UPDATE ON public.deployments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. step_executions (granular per-step run records)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.step_executions (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id       UUID         NOT NULL REFERENCES public.automation_runs(id) ON DELETE CASCADE,
  step_id      TEXT         NOT NULL,                       -- stable IR step.id
  status       TEXT         NOT NULL CHECK (status IN ('pending','running','success','error','skipped')),
  started_at   TIMESTAMPTZ,
  finished_at  TIMESTAMPTZ,
  output       JSONB,
  error        TEXT,
  duration_ms  INTEGER,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_step_executions_run
  ON public.step_executions (run_id);

CREATE INDEX IF NOT EXISTS idx_step_executions_run_step
  ON public.step_executions (run_id, step_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. runtime_events (append-only event stream)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.runtime_events (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      UUID         NOT NULL REFERENCES public.automation_runs(id) ON DELETE CASCADE,
  step_id     TEXT,
  kind        TEXT         NOT NULL,                          -- step.started, run.failed, ...
  level       TEXT         NOT NULL CHECK (level IN ('debug','info','warn','error')),
  message     TEXT         NOT NULL,
  details     JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runtime_events_run_time
  ON public.runtime_events (run_id, created_at);

CREATE INDEX IF NOT EXISTS idx_runtime_events_kind
  ON public.runtime_events (kind);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. automation_runs — extend with execution linkage
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.automation_runs
  ADD COLUMN IF NOT EXISTS deployment_id UUID
    REFERENCES public.deployments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version_id UUID
    REFERENCES public.workflow_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trigger_kind TEXT;

CREATE INDEX IF NOT EXISTS idx_automation_runs_deployment
  ON public.automation_runs (deployment_id);

CREATE INDEX IF NOT EXISTS idx_automation_runs_version
  ON public.automation_runs (version_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RLS — enable + policies
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.connections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials_vault  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_executions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_events     ENABLE ROW LEVEL SECURITY;

-- connections — users see + manage their own.
DROP POLICY IF EXISTS connections_select_own ON public.connections;
CREATE POLICY connections_select_own ON public.connections
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS connections_modify_own ON public.connections;
CREATE POLICY connections_modify_own ON public.connections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- credentials_vault — read denied to authenticated; service-role only.
-- (Decryption requires the server-side key; raw blobs leak nothing useful
--  but defense-in-depth.)
DROP POLICY IF EXISTS credentials_vault_no_user_select ON public.credentials_vault;
CREATE POLICY credentials_vault_no_user_select ON public.credentials_vault
  FOR SELECT USING (FALSE);

-- deployments — users see their own.
DROP POLICY IF EXISTS deployments_select_own ON public.deployments;
CREATE POLICY deployments_select_own ON public.deployments
  FOR SELECT USING (auth.uid() = user_id);

-- step_executions / runtime_events — users see rows for runs they own.
DROP POLICY IF EXISTS step_executions_select_own ON public.step_executions;
CREATE POLICY step_executions_select_own ON public.step_executions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.automation_runs r
       WHERE r.id = step_executions.run_id
         AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS runtime_events_select_own ON public.runtime_events;
CREATE POLICY runtime_events_select_own ON public.runtime_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.automation_runs r
       WHERE r.id = runtime_events.run_id
         AND r.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Helper RPCs
-- ─────────────────────────────────────────────────────────────────────────────

-- transition_deployment_state: atomic state transition with optimistic lock.
CREATE OR REPLACE FUNCTION public.transition_deployment_state(
  p_deployment_id UUID,
  p_from_states TEXT[],
  p_to_state TEXT,
  p_external_ref JSONB DEFAULT NULL,
  p_last_error TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INT;
BEGIN
  UPDATE public.deployments
     SET state = p_to_state,
         external_ref = COALESCE(p_external_ref, external_ref),
         last_error = p_last_error,
         deployed_at = CASE
           WHEN p_to_state IN ('deployed','active') AND deployed_at IS NULL THEN NOW()
           ELSE deployed_at
         END,
         updated_at = NOW()
   WHERE id = p_deployment_id
     AND state = ANY (p_from_states);

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_deployment_state(UUID, TEXT[], TEXT, JSONB, TEXT)
  TO authenticated, service_role;
