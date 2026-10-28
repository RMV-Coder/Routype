-- Concert Hall: one row per finished performance of one part of a piece.
--
-- Pieces and parts are defined in code (src/lib/music/songs.ts) and stored here
-- by id. Results are written only by the API (service role), after it has
-- checked them against the piece's chart, so the leaderboards cannot be filled
-- with impossible scores from the browser.
create table public.music_scores (
    id               bigint generated always as identity primary key,
    user_id          uuid not null references public.profiles (id) on delete cascade,
    song_id          text not null check (char_length(song_id) between 1 and 64),
    part_id          text not null check (char_length(part_id) between 1 and 64),
    speed            integer not null check (speed in (50, 75, 100)),
    score            integer not null check (score >= 0),
    accuracy         real not null check (accuracy between 0 and 100),
    max_combo        integer not null check (max_combo >= 0),
    perfect          integer not null check (perfect >= 0),
    great            integer not null check (great >= 0),
    good             integer not null check (good >= 0),
    miss             integer not null check (miss >= 0),
    stray            integer not null check (stray >= 0),
    holds_kept       integer not null default 0 check (holds_kept >= 0),
    duration_seconds integer not null check (duration_seconds between 1 and 3600),
    created_at       timestamptz not null default now()
);

create index music_scores_user_idx on public.music_scores (user_id, created_at desc);
create index music_scores_board_idx on public.music_scores (song_id, part_id, speed, score desc);

alter table public.music_scores enable row level security;

-- Users read their own results; leaderboards use music_leaderboard().
create policy "Users read their music scores" on public.music_scores
    for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete, truncate on public.music_scores from authenticated, anon;

-- Best score per player on one part of one piece at one speed. Private profiles are never listed.
create function public.music_leaderboard(p_song_id text, p_part_id text, p_speed integer, p_period text default 'all')
returns table (user_id uuid, name text, image text, xp integer, score integer, accuracy real, max_combo integer, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
    select ranked.user_id, p.name, p.image, p.xp, ranked.score, ranked.accuracy, ranked.max_combo, ranked.created_at
    from (
        select s.user_id, s.score, s.accuracy, s.max_combo, s.created_at,
               row_number() over (partition by s.user_id order by s.score desc, s.accuracy desc, s.created_at asc) as rn
        from public.music_scores s
        where s.song_id = p_song_id
          and s.part_id = p_part_id
          and s.speed = p_speed
          and s.created_at >= case p_period
              when 'daily' then now() - interval '1 day'
              when 'weekly' then now() - interval '7 days'
              when 'monthly' then now() - interval '30 days'
              else '-infinity'::timestamptz
          end
    ) ranked
    join public.profiles p on p.id = ranked.user_id
    where ranked.rn = 1 and not p.is_private
    order by ranked.score desc, ranked.accuracy desc, ranked.created_at asc
    limit 50;
$$;

-- The signed-in user's best result on each part and speed they have played.
create function public.my_music_bests()
returns table (song_id text, part_id text, speed integer, score integer, accuracy real, plays bigint)
language sql
stable
set search_path = ''
as $$
    select distinct on (s.song_id, s.part_id, s.speed)
           s.song_id, s.part_id, s.speed, s.score, s.accuracy,
           count(*) over (partition by s.song_id, s.part_id, s.speed)
    from public.music_scores s
    where s.user_id = (select auth.uid())
    order by s.song_id, s.part_id, s.speed, s.score desc, s.accuracy desc;
$$;

revoke execute on function public.music_leaderboard(text, text, integer, text), public.my_music_bests() from public, anon;
grant execute on function public.music_leaderboard(text, text, integer, text), public.my_music_bests() to authenticated;
