
DROP POLICY IF EXISTS "write company intel" ON public.company_intelligence;
DROP POLICY IF EXISTS "update company intel" ON public.company_intelligence;

CREATE POLICY "write company intel" ON public.company_intelligence
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.application_workspaces w
      WHERE w.user_id = auth.uid() AND w.company_id = company_intelligence.company_id
    )
  );

CREATE POLICY "update company intel" ON public.company_intelligence
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.application_workspaces w
      WHERE w.user_id = auth.uid() AND w.company_id = company_intelligence.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.application_workspaces w
      WHERE w.user_id = auth.uid() AND w.company_id = company_intelligence.company_id
    )
  );
