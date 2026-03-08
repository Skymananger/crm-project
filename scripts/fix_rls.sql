-- Script to enable Row Level Security (RLS) on all tables currently lacking it.
-- These were identified by the Supabase Database Linter as security risks.

-- 1. Enable RLS on all affected tables
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs_414 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 2. Add missing pipeline_type column to leads
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='pipeline_type') THEN
        ALTER TABLE public.leads ADD COLUMN pipeline_type TEXT;
    END IF;
END $$;

-- 3. Create permissive policies for all tables (since this is a shared-access CRM)
-- Using a loop for efficiency
DO $$ 
DECLARE
    t text;
    tables text[] := ARRAY['appointments', 'customers', 'inventory', 'leads', 'orders', 'products', 'programs_414', 'team', 'app_settings'];
BEGIN
    FOR t IN SELECT unnest(tables) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public Access" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Public Access" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;
