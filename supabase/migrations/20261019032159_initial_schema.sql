-- Routype on Supabase (Postgres). Replaces the old MySQL migrations.
--
-- Accounts live in auth.users (Supabase Auth: email & password + OAuth). Every
-- table has row level security enabled; the browser and the Next.js route
-- handlers talk to the database as the signed-in user, so these policies are the
-- real security boundary. Things users must not be able to do for themselves
-- (granting XP and achievements, reading other people's raw scores) go through
-- SECURITY DEFINER functions that are only executable by the service role or
-- that only return safe aggregates.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.visibility as enum ('public', 'friends', 'private');
create type public.entry_status as enum ('draft', 'published', 'scheduled');
create type public.piece_kind as enum ('story', 'poetry', 'riddle', 'novel', 'phrase', 'thought', 'article', 'blog', 'diary');
create type public.friendship_status as enum ('pending', 'accepted', 'blocked');
create type public.room_type as enum ('dm', 'group');
create type public.room_role as enum ('owner', 'admin', 'member');
create type public.user_type as enum ('business', 'page', 'admin', 'default');

-- ---------------------------------------------------------------------------
-- Profiles (one per auth.users row, created by trigger)
-- ---------------------------------------------------------------------------
create table public.profiles (
    id          uuid primary key references auth.users (id) on delete cascade,
    name        text check (char_length(name) <= 255),
    image       text,
    bio         text check (char_length(bio) <= 500),
    is_private  boolean not null default false,
    xp          integer not null default 0 check (xp >= 0),
    type        public.user_type not null default 'default',
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, name, image)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'user_name', split_part(new.email, '@', 1)),
        coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
    );
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
    for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Writing: journals and entries ("pieces")
-- ---------------------------------------------------------------------------
create table public.journals (
    id          bigint generated always as identity primary key,
    user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
    title       text not null check (char_length(title) between 1 and 255),
    description text,
    visibility  public.visibility not null default 'public',
    created_at  timestamptz not null default now()
);

create table public.entries (
    id           bigint generated always as identity primary key,
    journal_id   bigint not null references public.journals (id) on delete cascade,
    title        text check (char_length(title) <= 255),
    kind         public.piece_kind not null default 'thought',
    content      text not null check (char_length(content) between 1 and 5000000),
    visibility   public.visibility not null default 'public',
    allow_typing boolean not null default false,
    status       public.entry_status not null default 'draft',
    scheduled_at timestamptz,
    published_at timestamptz,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    constraint entries_scheduled_has_date check (status <> 'scheduled' or scheduled_at is not null)
);

create trigger entries_touch before update on public.entries
    for each row execute function public.touch_updated_at();

create table public.journal_read_state (
    user_id            uuid not null default auth.uid() references public.profiles (id) on delete cascade,
    journal_id         bigint not null references public.journals (id) on delete cascade,
    last_seen_entry_id bigint not null references public.entries (id) on delete cascade,
    updated_at         timestamptz not null default now(),
    primary key (user_id, journal_id)
);

-- ---------------------------------------------------------------------------
-- Social: friendships and streaks
-- ---------------------------------------------------------------------------
create table public.friendships (
    id         bigint generated always as identity primary key,
    user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
    friend_id  uuid not null references public.profiles (id) on delete cascade,
    status     public.friendship_status not null default 'pending',
    created_at timestamptz not null default now(),
    constraint friendships_no_self check (user_id <> friend_id)
);

-- one row per pair, whichever direction it was requested in
create unique index friendships_pair_unique on public.friendships (least(user_id, friend_id), greatest(user_id, friend_id));

create table public.streaks (
    user_id        uuid primary key references public.profiles (id) on delete cascade,
    streak_count   integer not null default 0 check (streak_count >= 0),
    last_post_date date
);

-- ---------------------------------------------------------------------------
-- TypeArena: scores and achievements
-- ---------------------------------------------------------------------------
create table public.typing_scores (
    id               bigint generated always as identity primary key,
    user_id          uuid not null default auth.uid() references public.profiles (id) on delete cascade,
    mode             text not null check (mode in ('time', 'words', 'piece', 'sudden-death', 'race')),
    mode_value       integer check (mode_value > 0),
    wpm              real not null check (wpm between 0 and 350),
    raw_wpm          real check (raw_wpm between 0 and 400),
    accuracy         real not null check (accuracy between 0 and 100),
    consistency      real check (consistency between 0 and 100),
    chars_correct    integer check (chars_correct >= 0),
    chars_incorrect  integer check (chars_incorrect >= 0),
    duration_seconds integer not null check (duration_seconds between 1 and 3600),
    entry_id         bigint references public.entries (id) on delete set null,
    match_id         text check (char_length(match_id) <= 32),
    placement        integer check (placement > 0),
    created_at       timestamptz not null default now()
);

-- Definitions live in code (src/lib/game/achievements.ts).
create table public.user_achievements (
    user_id          uuid not null references public.profiles (id) on delete cascade,
    achievement_code text not null check (char_length(achievement_code) <= 64),
    unlocked_at      timestamptz not null default now(),
    primary key (user_id, achievement_code)
);

-- ---------------------------------------------------------------------------
-- Messaging
-- ---------------------------------------------------------------------------
create table public.message_rooms (
    id         bigint generated always as identity primary key,
    room_type  public.room_type not null default 'dm',
    title      text check (char_length(title) <= 255),
    created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
    created_at timestamptz not null default now()
);

create table public.message_room_members (
    room_id   bigint not null references public.message_rooms (id) on delete cascade,
    user_id   uuid not null references public.profiles (id) on delete cascade,
    role      public.room_role not null default 'member',
    joined_at timestamptz not null default now(),
    primary key (room_id, user_id)
);

create table public.messages (
    id           bigint generated always as identity primary key,
    room_id      bigint not null references public.message_rooms (id) on delete cascade,
    sender_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
    text_content text check (char_length(text_content) <= 4000),
    e2ee_nonce   text,
    created_at   timestamptz not null default now()
);

create table public.message_encrypted_payloads (
    id           bigint generated always as identity primary key,
    message_id   bigint not null references public.messages (id) on delete cascade,
    recipient_id uuid not null references public.profiles (id) on delete cascade,
    cipher       text not null,
    nonce        text,
    version      integer not null default 1
);

-- ---------------------------------------------------------------------------
-- Indexes (foreign keys and the queries the app runs)
-- ---------------------------------------------------------------------------
create index journals_user_id_idx on public.journals (user_id);
create index journals_visibility_idx on public.journals (visibility, created_at);
create index entries_journal_id_idx on public.entries (journal_id);
create index entries_feed_idx on public.entries (status, visibility, id desc);
create index entries_typing_idx on public.entries (allow_typing, visibility, status);
create index entries_kind_idx on public.entries (kind, published_at);
create index entries_scheduled_idx on public.entries (scheduled_at) where status = 'scheduled';
create index journal_read_state_journal_idx on public.journal_read_state (journal_id);
create index journal_read_state_entry_idx on public.journal_read_state (last_seen_entry_id);
create index friendships_friend_idx on public.friendships (friend_id, status);
create index friendships_user_idx on public.friendships (user_id, status);
create index typing_scores_user_idx on public.typing_scores (user_id, created_at desc);
create index typing_scores_board_idx on public.typing_scores (mode, mode_value, wpm desc);
create index typing_scores_entry_idx on public.typing_scores (entry_id);
create index message_rooms_created_by_idx on public.message_rooms (created_by);
create index message_room_members_user_idx on public.message_room_members (user_id);
create index messages_room_created_idx on public.messages (room_id, id desc);
create index messages_sender_idx on public.messages (sender_id);
create index message_payloads_message_idx on public.message_encrypted_payloads (message_id);
create index message_payloads_recipient_idx on public.message_encrypted_payloads (recipient_id);

-- ---------------------------------------------------------------------------
-- RLS helpers. SECURITY DEFINER so policies can consult other tables without
-- recursing through those tables' own policies.
-- ---------------------------------------------------------------------------
create function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select a = b or exists (
        select 1 from public.friendships f
        where f.status = 'accepted'
          and least(f.user_id, f.friend_id) = least(a, b)
          and greatest(f.user_id, f.friend_id) = greatest(a, b)
    );
$$;

-- The most restrictive of profile, journal and piece visibility wins, and
-- unpublished pieces are only visible to their author.
create function public.can_view_journal(p_journal_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.journals j
        join public.profiles p on p.id = j.user_id
        where j.id = p_journal_id
          and (
              j.user_id = (select auth.uid())
              or (not p.is_private and (
                  j.visibility = 'public'
                  or (j.visibility = 'friends' and public.are_friends((select auth.uid()), j.user_id))
              ))
          )
    );
$$;

create function public.can_view_entry(p_journal_id bigint, p_visibility public.visibility, p_status public.entry_status)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.journals j
        join public.profiles p on p.id = j.user_id
        where j.id = p_journal_id
          and (
              j.user_id = (select auth.uid())
              or (
                  p_status = 'published'
                  and not p.is_private
                  and p_visibility <> 'private'
                  and j.visibility <> 'private'
                  and (
                      (p_visibility = 'public' and j.visibility = 'public')
                      or public.are_friends((select auth.uid()), j.user_id)
                  )
              )
          )
    );
$$;

create function public.owns_journal(p_journal_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (select 1 from public.journals where id = p_journal_id and user_id = (select auth.uid()));
$$;

create function public.is_room_member(p_room_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.message_room_members
        where room_id = p_room_id and user_id = (select auth.uid())
    );
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.journals enable row level security;
alter table public.entries enable row level security;
alter table public.journal_read_state enable row level security;
alter table public.friendships enable row level security;
alter table public.streaks enable row level security;
alter table public.typing_scores enable row level security;
alter table public.user_achievements enable row level security;
alter table public.message_rooms enable row level security;
alter table public.message_room_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_encrypted_payloads enable row level security;

-- profiles: names and avatars are shown next to pieces, races and leaderboards.
-- Only name, image, bio and is_private are user-editable (xp and type are not).
create policy "Signed-in users can read profiles" on public.profiles
    for select to authenticated using (true);
create policy "Users can update their own profile" on public.profiles
    for update to authenticated
    using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated, anon;
grant update (name, image, bio, is_private) on public.profiles to authenticated;

-- journals
create policy "Readable journals" on public.journals
    for select to authenticated using (public.can_view_journal(id));
create policy "Users create their own journals" on public.journals
    for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users update their own journals" on public.journals
    for update to authenticated
    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users delete their own journals" on public.journals
    for delete to authenticated using (user_id = (select auth.uid()));

-- entries
create policy "Readable entries" on public.entries
    for select to authenticated using (public.can_view_entry(journal_id, visibility, status));
create policy "Authors add entries to their journals" on public.entries
    for insert to authenticated with check (public.owns_journal(journal_id));
create policy "Authors update their entries" on public.entries
    for update to authenticated
    using (public.owns_journal(journal_id)) with check (public.owns_journal(journal_id));
create policy "Authors delete their entries" on public.entries
    for delete to authenticated using (public.owns_journal(journal_id));

-- journal_read_state
create policy "Users manage their read state" on public.journal_read_state
    for all to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()) and public.can_view_journal(journal_id));

-- friendships: either side can see and remove it; only the recipient can accept.
create policy "Users see their friendships" on public.friendships
    for select to authenticated
    using ((select auth.uid()) in (user_id, friend_id));
create policy "Users send friend requests" on public.friendships
    for insert to authenticated
    with check (user_id = (select auth.uid()) and status = 'pending');
create policy "Recipients answer friend requests" on public.friendships
    for update to authenticated
    using (friend_id = (select auth.uid()))
    with check (friend_id = (select auth.uid()) and status in ('accepted', 'blocked'));
create policy "Users remove their friendships" on public.friendships
    for delete to authenticated
    using ((select auth.uid()) in (user_id, friend_id));

-- streaks (written by the server)
create policy "Users read their streak" on public.streaks
    for select to authenticated using (user_id = (select auth.uid()));

-- typing_scores: users save and read their own; leaderboards use leaderboard().
create policy "Users read their scores" on public.typing_scores
    for select to authenticated using (user_id = (select auth.uid()));
create policy "Users save their scores" on public.typing_scores
    for insert to authenticated with check (user_id = (select auth.uid()));

-- user_achievements: granted only by grant_progress() (service role).
create policy "Users read their achievements" on public.user_achievements
    for select to authenticated using (user_id = (select auth.uid()));

-- messaging
create policy "Members read rooms" on public.message_rooms
    for select to authenticated
    using (created_by = (select auth.uid()) or public.is_room_member(id));
create policy "Users create rooms" on public.message_rooms
    for insert to authenticated with check (created_by = (select auth.uid()));

create policy "Members read room membership" on public.message_room_members
    for select to authenticated using (public.is_room_member(room_id));
create policy "Room creators add members" on public.message_room_members
    for insert to authenticated
    with check (exists (
        select 1 from public.message_rooms r
        where r.id = room_id and r.created_by = (select auth.uid())
    ));
create policy "Users leave rooms" on public.message_room_members
    for delete to authenticated using (user_id = (select auth.uid()));

create policy "Members read messages" on public.messages
    for select to authenticated using (public.is_room_member(room_id));
create policy "Members send messages" on public.messages
    for insert to authenticated
    with check (sender_id = (select auth.uid()) and public.is_room_member(room_id));

create policy "Recipients and senders read payloads" on public.message_encrypted_payloads
    for select to authenticated
    using (
        recipient_id = (select auth.uid())
        or exists (select 1 from public.messages m where m.id = message_id and m.sender_id = (select auth.uid()))
    );
create policy "Senders attach payloads" on public.message_encrypted_payloads
    for insert to authenticated
    with check (exists (
        select 1 from public.messages m
        where m.id = message_id and m.sender_id = (select auth.uid()) and public.is_room_member(m.room_id)
    ));

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------
-- An entry joined with its journal and author. security_invoker keeps the
-- callers' RLS in force.
create view public.entries_with_author
with (security_invoker = true)
as
select e.id, e.journal_id, e.title, e.kind, e.content, e.visibility, e.allow_typing, e.status,
       e.scheduled_at, e.published_at, e.created_at, e.updated_at,
       j.title as journal_title, j.visibility as journal_visibility,
       p.id as author_id, p.name as author_name, p.image as author_image, p.is_private as author_private
from public.entries e
join public.journals j on j.id = e.journal_id
join public.profiles p on p.id = j.user_id;

-- ---------------------------------------------------------------------------
-- Functions called by the app
-- ---------------------------------------------------------------------------

-- Publishes scheduled pieces whose time has come (run lazily before feeds).
create function public.publish_due_entries()
returns void
language sql
security definer
set search_path = ''
as $$
    update public.entries
    set status = 'published', published_at = scheduled_at
    where status = 'scheduled' and scheduled_at <= now();
$$;

-- A random handful of public pieces whose authors allowed them in TypeArena.
create function public.random_typing_pieces(p_kind public.piece_kind default null, p_exclude bigint default null, p_id bigint default null)
returns setof public.entries_with_author
language sql
stable
set search_path = ''
as $$
    select *
    from public.entries_with_author e
    where e.status = 'published' and e.visibility = 'public' and e.journal_visibility = 'public'
      and not e.author_private and e.allow_typing
      and (p_exclude is null or e.id <> p_exclude)
      and (p_id is null or e.id = p_id)
      and (p_id is not null or p_kind is null or e.kind = p_kind)
    order by random()
    limit 10;
$$;

-- Best result per writer for a mode. Private profiles are never listed.
create function public.leaderboard(p_mode text, p_mode_value integer, p_period text default 'all')
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

-- The signed-in user's personal bests per mode.
create function public.my_typing_bests()
returns table (mode text, mode_value integer, wpm real, tests bigint, avg_accuracy numeric)
language sql
stable
set search_path = ''
as $$
    select s.mode, s.mode_value, max(s.wpm), count(*), round(avg(s.accuracy)::numeric, 1)
    from public.typing_scores s
    where s.user_id = (select auth.uid())
    group by s.mode, s.mode_value
    order by s.mode, s.mode_value;
$$;

-- Headline stats for the signed-in user's profile.
create function public.my_profile_stats()
returns table (tests bigint, best_wpm real, avg_wpm_last10 numeric, pieces bigint, achievements bigint)
language sql
stable
set search_path = ''
as $$
    select
        (select count(*) from public.typing_scores where user_id = (select auth.uid())),
        (select max(wpm) from public.typing_scores where user_id = (select auth.uid())),
        (select round(avg(r.wpm)::numeric, 1) from (
            select wpm from public.typing_scores where user_id = (select auth.uid()) order by created_at desc limit 10
        ) r),
        (select count(*) from public.entries e join public.journals j on j.id = e.journal_id
         where j.user_id = (select auth.uid()) and e.status = 'published'),
        (select count(*) from public.user_achievements where user_id = (select auth.uid()));
$$;

-- "People you may know": mutual friends and readers of the same journals.
-- Only returns public profile fields and counts.
create function public.friend_suggestions(p_limit integer default 12)
returns table (id uuid, name text, image text, mutual_friends bigint, co_reads bigint, score bigint)
language sql
stable
security definer
set search_path = ''
as $$
    with me as (select (select auth.uid()) as id),
    my_friends as (
        select case when f.user_id = me.id then f.friend_id else f.user_id end as friend_id
        from public.friendships f, me
        where me.id in (f.user_id, f.friend_id) and f.status = 'accepted'
    ),
    others as (
        select p.id, p.name, p.image
        from public.profiles p, me
        where p.id <> me.id and not p.is_private
          and p.id not in (select friend_id from my_friends)
    ),
    mutual_counts as (
        select o.id as other_id, count(*) as mutuals
        from others o
        join public.friendships f on f.status = 'accepted' and o.id in (f.user_id, f.friend_id)
        join my_friends mf on mf.friend_id = case when f.user_id = o.id then f.friend_id else f.user_id end
        group by o.id
    ),
    co_reads as (
        select o.id as other_id, count(distinct jrs.journal_id) as co_reads
        from others o
        join public.journal_read_state jrs on jrs.user_id = o.id
        where jrs.journal_id in (select r.journal_id from public.journal_read_state r, me where r.user_id = me.id)
        group by o.id
    )
    select o.id, o.name, o.image,
           coalesce(mc.mutuals, 0), coalesce(cr.co_reads, 0),
           coalesce(mc.mutuals, 0) * 3 + coalesce(cr.co_reads, 0) * 2
    from others o
    left join mutual_counts mc on mc.other_id = o.id
    left join co_reads cr on cr.other_id = o.id
    order by 6 desc, o.id
    limit least(greatest(p_limit, 1), 50);
$$;

-- Finds or creates the DM room between the signed-in user and another user.
create function public.get_or_create_dm(p_other uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_me uuid := (select auth.uid());
    v_room bigint;
begin
    if v_me is null then raise exception 'not authenticated' using errcode = '28000'; end if;
    if p_other is null or p_other = v_me then raise exception 'invalid recipient' using errcode = '22023'; end if;
    if not exists (select 1 from public.profiles where id = p_other) then
        raise exception 'unknown recipient' using errcode = '22023';
    end if;

    -- serialize concurrent creation of the same pair
    perform pg_advisory_xact_lock(hashtextextended(least(v_me, p_other)::text || greatest(v_me, p_other)::text, 0));

    select r.id into v_room
    from public.message_rooms r
    join public.message_room_members m1 on m1.room_id = r.id and m1.user_id = v_me
    join public.message_room_members m2 on m2.room_id = r.id and m2.user_id = p_other
    where r.room_type = 'dm'
    limit 1;

    if v_room is null then
        insert into public.message_rooms (room_type, created_by) values ('dm', v_me) returning id into v_room;
        insert into public.message_room_members (room_id, user_id) values (v_room, v_me), (v_room, p_other);
    end if;
    return v_room;
end;
$$;

-- Sends a message (with optional per-recipient ciphertexts) atomically.
-- SECURITY INVOKER: the messages/payload insert policies do the checks.
create function public.send_message(p_room_id bigint, p_text text default null, p_e2ee_nonce text default null, p_ciphertexts jsonb default '[]'::jsonb)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
    v_id bigint;
begin
    insert into public.messages (room_id, sender_id, text_content, e2ee_nonce)
    values (p_room_id, (select auth.uid()), p_text, p_e2ee_nonce)
    returning id into v_id;

    insert into public.message_encrypted_payloads (message_id, recipient_id, cipher, nonce, version)
    select v_id, (c ->> 'recipientId')::uuid, c ->> 'cipher', c ->> 'nonce', coalesce((c ->> 'version')::integer, 1)
    from jsonb_array_elements(coalesce(p_ciphertexts, '[]'::jsonb)) c
    where c ->> 'recipientId' is not null and c ->> 'cipher' is not null;

    return v_id;
end;
$$;

-- The signed-in user's rooms, most recently active first (keyset pagination).
create function public.my_rooms(p_limit integer default 15, p_cursor_ts timestamptz default null, p_cursor_id bigint default null)
returns table (
    id bigint, kind public.room_type, title text,
    other_user_id uuid, other_user_name text, other_user_image text,
    g_img1 text, g_img2 text, last_ts timestamptz, last_id bigint
)
language sql
stable
set search_path = ''
as $$
    with mine as (
        select r.*
        from public.message_rooms r
        join public.message_room_members mm on mm.room_id = r.id and mm.user_id = (select auth.uid())
    ),
    latest as (
        select m.room_id, max(m.created_at) as last_ts, max(m.id) as last_id
        from public.messages m
        where m.room_id in (select id from mine)
        group by m.room_id
    )
    select r.id, r.room_type, r.title,
           other_user.id, other_user.name, other_user.image,
           (select p.image from public.message_room_members gm join public.profiles p on p.id = gm.user_id
             where gm.room_id = r.id and gm.user_id <> (select auth.uid()) order by gm.joined_at limit 1),
           (select p.image from public.message_room_members gm join public.profiles p on p.id = gm.user_id
             where gm.room_id = r.id and gm.user_id <> (select auth.uid()) order by gm.joined_at limit 1 offset 1),
           lm.last_ts, lm.last_id
    from mine r
    left join latest lm on lm.room_id = r.id
    left join lateral (
        select p.id, p.name, p.image
        from public.message_room_members mrm
        join public.profiles p on p.id = mrm.user_id
        where mrm.room_id = r.id and r.room_type = 'dm' and mrm.user_id <> (select auth.uid())
        limit 1
    ) other_user on true
    where p_cursor_ts is null
       or lm.last_ts < p_cursor_ts
       or (lm.last_ts = p_cursor_ts and lm.last_id < p_cursor_id)
    order by lm.last_ts is null, lm.last_ts desc, lm.last_id desc, r.id desc
    limit least(greatest(p_limit, 1), 50) + 1;
$$;

-- ---------------------------------------------------------------------------
-- Gamification (service role only: called by the Next.js server after it has
-- validated the action, never directly by clients)
-- ---------------------------------------------------------------------------

-- Counters used by the achievement rules in src/lib/game/achievements.ts.
create function public.achievement_progress(p_user_id uuid)
returns table (
    tests_completed bigint, races_completed bigint, races_won bigint, pieces_typed bigint,
    pieces_published bigint, poems_published bigint, pieces_shared bigint, times_typed_by_others bigint,
    owned text[]
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        (select count(*) from public.typing_scores where user_id = p_user_id),
        (select count(*) from public.typing_scores where user_id = p_user_id and match_id is not null),
        (select count(*) from public.typing_scores where user_id = p_user_id and match_id is not null and placement = 1),
        (select count(*) from public.typing_scores s join public.entries e on e.id = s.entry_id join public.journals j on j.id = e.journal_id
          where s.user_id = p_user_id and j.user_id <> p_user_id),
        (select count(*) from public.entries e join public.journals j on j.id = e.journal_id
          where j.user_id = p_user_id and e.status = 'published'),
        (select count(*) from public.entries e join public.journals j on j.id = e.journal_id
          where j.user_id = p_user_id and e.status = 'published' and e.kind = 'poetry'),
        (select count(*) from public.entries e join public.journals j on j.id = e.journal_id
          where j.user_id = p_user_id and e.status = 'published' and e.allow_typing),
        (select count(*) from public.typing_scores s join public.entries e on e.id = s.entry_id join public.journals j on j.id = e.journal_id
          where j.user_id = p_user_id and s.user_id <> p_user_id),
        (select coalesce(array_agg(achievement_code), '{}') from public.user_achievements where user_id = p_user_id);
$$;

-- Stores newly unlocked achievements and adds XP. Returns the codes that were
-- actually inserted (so concurrent calls never double-grant).
create function public.grant_progress(p_user_id uuid, p_codes text[], p_code_xp integer[], p_extra_xp integer default 0)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_new text[];
    v_xp integer;
begin
    with ins as (
        insert into public.user_achievements (user_id, achievement_code)
        select p_user_id, unnest(coalesce(p_codes, '{}'))
        on conflict do nothing
        returning achievement_code
    )
    select coalesce(array_agg(achievement_code), '{}') into v_new from ins;

    select coalesce(p_extra_xp, 0) + coalesce(sum(x.xp), 0) into v_xp
    from unnest(coalesce(p_codes, '{}'), coalesce(p_code_xp, '{}')) as x(code, xp)
    where x.code = any (v_new);

    if v_xp > 0 then
        update public.profiles set xp = xp + v_xp where id = p_user_id;
    end if;
    return v_new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges: nothing is callable anonymously; gamification writes
-- and raw progress are service-role only.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on function
    public.are_friends(uuid, uuid),
    public.can_view_journal(bigint),
    public.can_view_entry(bigint, public.visibility, public.entry_status),
    public.owns_journal(bigint),
    public.is_room_member(bigint),
    public.publish_due_entries(),
    public.random_typing_pieces(public.piece_kind, bigint, bigint),
    public.leaderboard(text, integer, text),
    public.my_typing_bests(),
    public.my_profile_stats(),
    public.friend_suggestions(integer),
    public.get_or_create_dm(uuid),
    public.send_message(bigint, text, text, jsonb),
    public.my_rooms(integer, timestamptz, bigint)
to authenticated;
revoke execute on function
    public.achievement_progress(uuid),
    public.grant_progress(uuid, text[], integer[], integer)
from authenticated;
grant execute on function
    public.achievement_progress(uuid),
    public.grant_progress(uuid, text[], integer[], integer)
to service_role;

-- New functions created later should not be callable by default either.
alter default privileges in schema public revoke execute on functions from public, anon;
