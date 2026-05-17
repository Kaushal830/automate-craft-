-- =============================================================================
-- Phase 3 — convenience views for naming alignment
-- -----------------------------------------------------------------------------
-- Phase 2 introduced these physical tables:
--   automation_runs            ← canonical run records
--   step_executions            ← per-step logs
--   runtime_events             ← append-only event stream
--   deployments                ← adapter deployment lifecycle
--
-- The Phase 3 product spec referenced these names:
--   workflow_runs, execution_logs, execution_events, workflow_deployments
--
-- Rather than renaming (which would break Phase 2 callers), this migration
-- creates lightweight SQL VIEWs aliasing the canonical tables. Read-only;
-- writes still go to the original tables.
--
-- This means external tooling / future docs can reference either naming
-- without surprise.
-- =============================================================================

-- workflow_runs ≡ automation_runs (with explicit column aliasing for stability)
CREATE OR REPLACE VIEW public.workflow_runs AS
SELECT
  id,
  automation_id,
  user_id,
  status,
  trigger_source,
  trigger_kind,
  payload,
  result,
  error_message,
  deployment_id,
  version_id,
  created_at AS started_at,
  finished_at,
  CASE
    WHEN finished_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (finished_at - created_at)) * 1000
    ELSE NULL
  END AS duration_ms
FROM public.automation_runs;

-- execution_logs ≡ runtime_events (append-only log stream)
CREATE OR REPLACE VIEW public.execution_logs AS
SELECT
  id,
  run_id,
  step_id,
  kind,
  level,
  message,
  details,
  created_at AS logged_at
FROM public.runtime_events;

-- execution_events ≡ runtime_events
-- (same shape — provided so the spec's two naming styles both work)
CREATE OR REPLACE VIEW public.execution_events AS
SELECT
  id,
  run_id,
  step_id,
  kind,
  level,
  message,
  details,
  created_at AS occurred_at
FROM public.runtime_events;

-- workflow_deployments ≡ deployments
CREATE OR REPLACE VIEW public.workflow_deployments AS
SELECT
  id,
  automation_id,
  user_id,
  version_id,
  adapter,
  state,
  external_ref,
  last_error,
  deployed_at,
  created_at,
  updated_at
FROM public.deployments;

-- =============================================================================
-- Grants — views inherit base-table RLS via security_invoker so authenticated
-- users see only their own rows automatically.
-- =============================================================================

ALTER VIEW public.workflow_runs        SET (security_invoker = ON);
ALTER VIEW public.execution_logs       SET (security_invoker = ON);
ALTER VIEW public.execution_events     SET (security_invoker = ON);
ALTER VIEW public.workflow_deployments SET (security_invoker = ON);

GRANT SELECT ON public.workflow_runs        TO authenticated;
GRANT SELECT ON public.execution_logs       TO authenticated;
GRANT SELECT ON public.execution_events     TO authenticated;
GRANT SELECT ON public.workflow_deployments TO authenticated;
