CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient TEXT NOT NULL,
  template TEXT NOT NULL,
  subject TEXT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  provider_message_id TEXT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX email_logs_created_at_idx ON public.email_logs (created_at DESC);
CREATE INDEX email_logs_recipient_idx ON public.email_logs (recipient);
CREATE INDEX email_logs_template_idx ON public.email_logs (template);
CREATE INDEX email_logs_status_idx ON public.email_logs (status);

GRANT SELECT ON public.email_logs TO authenticated;
GRANT ALL ON public.email_logs TO service_role;

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email logs"
  ON public.email_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_email_logs_updated_at
  BEFORE UPDATE ON public.email_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();