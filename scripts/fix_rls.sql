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

-- 2. Verify: All these tables should already have "Public Access" policies created (as per the linter report).
-- If RLS was disabled, those policies were just sitting there. Now they are active.

-- Note: In a production environment with real users, you might want to restrict 
-- "Public Access" further to only authenticated users if sensitive data is involved.
