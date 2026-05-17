-- =============================================================================
-- workflow_versions
-- -----------------------------------------------------------------------------
-- Stores immutable snapshots of every generated/saved workflow version for an
-- automation. The `automations` row is the denormalized "current" pointer; this
-- table is the canonical history.
--
-- Each successful generation, regeneration, or manual save creates one row.
-- Exactly one row per automation has activated=true at any time.
--
-- Phase 2 will read from this table to:
--   - Power version history UI (rollback / diff)
--   - Audit which prompt produced which workflow
--   - A/B test prompt strategies (compare across rows for the same automation)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.workflow_versions (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id   UUID         NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  user_id         UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  version_number  INTEGER      NOT NULL,
  workflow        JSONB        NOT NULL,            -- WorkflowIR snapshot
  prompt          TEXT         NULL,                -- Original user prompt
  source          TEXT         NOT NULL,            -- openai | claude | gemini | fallback | manual | import
  cost            INTEGER      NOT NULL DEFAULT 0,  -- Credits charged at generation
  activated       BOOLEAN      NOT NULL DEFAULT TRUE,
  metadata        JSONB        NOT NULL DEFAULT '{}'::jsonb,  -- model name, reasoning effort, ...
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Monotonic per-automation version counter (1, 2, 3, ...).
  CONSTRAINT workflow_versions_unique_per_automation
    UNIQUE (automation_id, version_number),

  -- Defensive guard against unknown source values.
  CONSTRAINT workflow_versions_source_check
    CHECK (source IN ('openai', 'claude', 'gemini', 'fallback', 'manual', 'import'))
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Fast lookup of versions for an automation, newest first.
CREATE INDEX IF NOT EXISTS idx_workflow_versions_automation_recent
  ON public.workflow_versions (automation_id, version_number DESC);

-- Lookup of all versions for a user (audit / metrics).
CREATE INDEX IF NOT EXISTS idx_workflow_versions_user
  ON public.workflow_versions (user_id, created_at DESC);

-- Find the active version for an automation cheaply.
CREATE INDEX IF NOT EXISTS idx_workflow_versions_activated
  ON public.workflow_versions (automation_id)
  WHERE activated = TRUE;

-- =============================================================================
-- Activated invariant
-- -----------------------------------------------------------------------------
-- At most one activated version per automation. Enforced by partial unique
-- index over (automation_id) where activated=true.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uniq_workflow_versions_one_active
  ON public.workflow_versions (automation_id)
  WHERE activated = TRUE;

-- =============================================================================
-- automations columns for dual-write (Phase 1)
-- -----------------------------------------------------------------------------
-- The existing `automations.workflow` column holds the legacy AutomationWorkflow
-- shape. We add two new columns alongside:
--
--   - `ir`                 : the canonical WorkflowIR (Phase 1+).
--   - `current_version_id` : pointer to the active workflow_versions row.
--
-- Both are nullable to remain compatible with rows authored before Phase 1.
-- =============================================================================

ALTER TABLE public.automations
  ADD COLUMN IF NOT EXISTS ir JSONB NULL,
  ADD COLUMN IF NOT EXISTS current_version_id UUID NULL
    REFERENCES public.workflow_versions(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS automations_current_version_id_idx
  ON public.automations (current_version_id);

-- =============================================================================
-- Row-Level Security
-- =============================================================================

ALTER TABLE public.workflow_versions ENABLE ROW LEVEL SECURITY;

-- Users see only their own versions.
DROP POLICY IF EXISTS "workflow_versions_select_own"
  ON public.workflow_versions;
CREATE POLICY "workflow_versions_select_own"
  ON public.workflow_versions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Inserts are server-side only via service role (no user policy).
-- Updates restricted to flipping `activated` on owned rows.
DROP POLICY IF EXISTS "workflow_versions_update_activated_own"
  ON public.workflow_versions;
CREATE POLICY "workflow_versions_update_activated_own"
  ON public.workflow_versions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- next_workflow_version_number(automation_id)
-- -----------------------------------------------------------------------------
-- Atomic helper that returns the next version_number for a given automation.
-- Use INSIDE the same transaction as the INSERT to avoid races.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.next_workflow_version_number(p_automation_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_number
    FROM public.workflow_versions
   WHERE automation_id = p_automation_id;
  RETURN next_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_workflow_version_number(UUID) TO authenticated, service_role;

-- =============================================================================
-- activate_workflow_version(version_id)
-- -----------------------------------------------------------------------------
-- Atomically promote a version to active, deactivating siblings. Required to
-- preserve the "exactly one activated" invariant across rollbacks.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.activate_workflow_version(p_version_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_automation_id UUID;
BEGIN
  SELECT automation_id
    INTO v_automation_id
    FROM public.workflow_versions
   WHERE id = p_version_id;

  IF v_automation_id IS NULL THEN
    RAISE EXCEPTION 'Workflow version % not found', p_version_id;
  END IF;

  UPDATE public.workflow_versions
     SET activated = FALSE
   WHERE automation_id = v_automation_id
     AND id != p_version_id;

  UPDATE public.workflow_versions
     SET activated = TRUE
   WHERE id = p_version_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_workflow_version(UUID) TO authenticated, service_role;
