
-- flows table
CREATE TABLE public.flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own flows" ON public.flows FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_flows_updated_at BEFORE UPDATE ON public.flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- flow_steps table
CREATE TABLE public.flow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  step_number integer NOT NULL DEFAULT 1,
  step_type text NOT NULL DEFAULT 'image_generation',
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.flow_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own flow_steps" ON public.flow_steps FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- flow_executions table
CREATE TABLE public.flow_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  mode text NOT NULL DEFAULT 'step_by_step',
  current_step integer NOT NULL DEFAULT 1,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.flow_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own flow_executions" ON public.flow_executions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- flow_step_executions table
CREATE TABLE public.flow_step_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES public.flow_executions(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.flow_steps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  step_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  input_artifact_url text,
  output_artifact_url text,
  config_snapshot jsonb DEFAULT '{}'::jsonb,
  prompt_used text DEFAULT '',
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.flow_step_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own flow_step_executions" ON public.flow_step_executions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
