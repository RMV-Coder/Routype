-- Follow-up to the initial schema, from the Supabase security advisor and a
-- review of the policies.

-- Trigger functions are fired by Postgres, never called over /rest/v1/rpc, so no
-- API role needs EXECUTE on them (the triggers keep working without it).
-- rls_auto_enable is the platform's "enable RLS on new tables" event trigger.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- The "Recipients answer friend requests" policy only pins friend_id, so the
-- recipient could also rewrite user_id and accept a friendship on behalf of a
-- third person. Answering a request only ever changes its status.
revoke update on public.friendships from authenticated, anon;
grant update (status) on public.friendships to authenticated;
