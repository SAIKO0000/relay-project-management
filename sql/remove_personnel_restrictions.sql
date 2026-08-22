-- RETIRED: intentionally left as a safe no-op.
--
-- The former migration disabled RLS and granted personnel-table writes to
-- anon and public. That makes a public Supabase project vulnerable to data
-- scraping and spam. Do not restore or run that migration.
--
-- Public portfolio deployments should use browser-local Demo Mode and apply:
--   sql/portfolio_demo_lockdown.sql

select 'Unsafe personnel migration is retired; no changes were made.' as notice;
