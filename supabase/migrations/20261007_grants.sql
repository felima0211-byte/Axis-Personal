-- Conceder privilégios CRUD ao role authenticated em todas as tabelas do app
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.logs      TO authenticated;
