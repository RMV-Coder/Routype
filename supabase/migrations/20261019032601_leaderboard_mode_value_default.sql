-- Modes without a value (piece, sudden-death, race) pass no p_mode_value. A
-- default lets callers omit it, like the other optional RPC arguments, which is
-- also how the generated TypeScript types model it.
create or replace function public.leaderboard(p_mode text, p_mode_value integer default null, p_period text default 'all')
returns table (user_id uuid, name text, image text, xp integer, wpm real, accuracy real, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
    select ranked.user_id, p.name, p.image, p.xp, ranked.wpm, ranked.accuracy, ranked.created_at
    from (
        select s.user_id, s.wpm, s.accuracy, s.created_at,
               row_number() over (partition by s.user_id order by s.wpm desc, s.accuracy desc, s.created_at asc) as rn
        from public.typing_scores s
        where s.mode = p_mode
          and s.mode_value is not distinct from p_mode_value
          and s.created_at >= case p_period
              when 'daily' then now() - interval '1 day'
              when 'weekly' then now() - interval '7 days'
              when 'monthly' then now() - interval '30 days'
              else '-infinity'::timestamptz
          end
    ) ranked
    join public.profiles p on p.id = ranked.user_id
    where ranked.rn = 1 and not p.is_private
    order by ranked.wpm desc, ranked.accuracy desc, ranked.created_at asc
    limit 50;
$$;
