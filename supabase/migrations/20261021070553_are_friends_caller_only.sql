-- are_friends is executable by every signed-in user (RLS policies need it), so
-- as an RPC it let anyone test whether two *other* users are friends. Only
-- answer for pairs that include the caller; every policy already passes
-- auth.uid() as one side.
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select (select auth.uid()) in (a, b) and (a = b or exists (
        select 1 from public.friendships f
        where f.status = 'accepted'
          and least(f.user_id, f.friend_id) = least(a, b)
          and greatest(f.user_id, f.friend_id) = greatest(a, b)
    ));
$$;
