-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 100),
  description TEXT NOT NULL CHECK (char_length(description) > 0 AND char_length(description) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  action TEXT NOT NULL CHECK (action IN ('Create Task', 'Update Task', 'Delete Task')),
  task_id BIGINT,
  updated_content JSONB,
  notes TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_task_id ON public.audit_logs(task_id);

-- Since we're using Basic Auth (not user-based auth), we'll disable RLS
-- The edge function will handle authentication
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- Insert sample data for demonstration
INSERT INTO public.tasks (title, description, created_at) VALUES
('Design homepage', 'Create hero section and pricing blocks', '2025-01-09T10:00:00Z'),
('API integration', 'Wire up auth endpoints and pagination', '2025-01-07T10:00:00Z'),
('Fix bugs', 'Resolve table overflow and input focus states', '2025-01-06T10:00:00Z'),
('Write docs', 'Add README and API usage examples', '2025-01-04T10:00:00Z'),
('Set up CI', 'Add tests and build pipeline with coverage', '2025-01-02T10:00:00Z'),
('Refactor code', 'Improve component structure and reusability', '2025-01-01T10:00:00Z'),
('Add animations', 'Implement smooth transitions and micro-interactions', '2024-12-30T10:00:00Z');

-- Insert sample audit logs
INSERT INTO public.audit_logs (timestamp, action, task_id, updated_content) VALUES
('2025-01-09T10:00:00Z', 'Create Task', 1, '{"title": "Design homepage", "description": "Create hero section and pricing blocks"}'::jsonb),
('2025-01-07T10:00:00Z', 'Create Task', 2, '{"title": "API integration", "description": "Wire up auth endpoints and pagination"}'::jsonb),
('2025-01-06T10:00:00Z', 'Create Task', 3, '{"title": "Fix bugs", "description": "Resolve table overflow and input focus states"}'::jsonb);