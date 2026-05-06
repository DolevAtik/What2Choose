-- ============================================================
-- What2Choose - Schema V5
-- Run in: Supabase Dashboard -> SQL Editor -> New Query
-- Protect private profile email addresses from public reads
-- ============================================================

-- The profiles table remains publicly readable for display names/avatars, but
-- email is copied from auth.users and must not be exposed through the public API.
REVOKE SELECT ON TABLE public.profiles FROM public, anon, authenticated;

GRANT SELECT (id, username, avatar_url, created_at)
ON TABLE public.profiles
TO anon, authenticated;
