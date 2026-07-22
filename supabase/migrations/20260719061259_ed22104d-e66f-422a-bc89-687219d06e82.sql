
-- Invoice numbering: sequence + trigger to assign COS-YYYY-NNNNNN when payment becomes captured.
CREATE SEQUENCE IF NOT EXISTS public.invoice_seq START 1;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS invoice_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS invoice_issued_at timestamptz;

CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  n bigint;
BEGIN
  IF NEW.status = 'captured' AND NEW.invoice_number IS NULL THEN
    n := nextval('public.invoice_seq');
    NEW.invoice_number := 'COS-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 6, '0');
    NEW.invoice_issued_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_assign_invoice ON public.payments;
CREATE TRIGGER payments_assign_invoice
BEFORE INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.assign_invoice_number();

-- Backfill existing captured payments
DO $$
DECLARE r record; n bigint;
BEGIN
  FOR r IN SELECT id, created_at FROM public.payments
           WHERE status='captured' AND invoice_number IS NULL
           ORDER BY created_at ASC LOOP
    n := nextval('public.invoice_seq');
    UPDATE public.payments
      SET invoice_number = 'COS-' || to_char(r.created_at, 'YYYY') || '-' || lpad(n::text,6,'0'),
          invoice_issued_at = r.created_at
      WHERE id = r.id;
  END LOOP;
END $$;
