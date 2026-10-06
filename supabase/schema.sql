-- ============================================================================
-- "A Little Question For You 💗" — Supabase schema
-- Run this entire file inside the Supabase SQL editor for a fresh project.
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE where possible).
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Anonymous',
  nickname text,
  email text not null,
  avatar_url text,
  facebook_url text,
  theme_preference text not null default 'system' check (theme_preference in ('light','dark','system')),
  is_online boolean not null default false,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system' check (theme in ('light','dark','system')),
  notifications_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- ADMIN
-- ----------------------------------------------------------------------------
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin','superadmin')),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_activity (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource text,
  resource_id text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admin_users au where au.user_id = uid);
$$;

-- ----------------------------------------------------------------------------
-- QUESTIONS
-- ----------------------------------------------------------------------------
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  question text not null,
  introduction text,
  type text not null check (type in ('TEXT','LONG_TEXT','SINGLE_CHOICE','MULTIPLE_CHOICE')),
  options jsonb,
  required boolean not null default true,
  display_order integer not null default 0,
  conditional_rule jsonb,
  is_active boolean not null default true,
  is_supporting boolean not null default false,
  placeholder text,
  min_value integer,
  max_value integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_questions_active_order on public.questions (is_active, display_order);

-- ----------------------------------------------------------------------------
-- RESPONSES / ANSWERS
-- ----------------------------------------------------------------------------
create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  anonymous_token text,
  status text not null default 'in_progress' check (status in ('in_progress','submitted')),
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_responses_submitted_at on public.responses (submitted_at desc);
create index if not exists idx_responses_user on public.responses (user_id);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses(id) on delete cascade,
  question_id uuid references public.questions(id) on delete set null,
  value_text text,
  value_options jsonb,
  was_edited boolean not null default false,
  skipped boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_answers_response on public.answers (response_id);

create table if not exists public.supporting_answers (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.answers(id) on delete cascade,
  question_id uuid references public.questions(id) on delete set null,
  value_text text,
  value_options jsonb,
  skipped boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_supporting_answers_answer on public.supporting_answers (answer_id);

-- ----------------------------------------------------------------------------
-- CONVERSATIONS / MESSAGES
-- ----------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','archived','blocked')),
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_conversations_updated on public.conversations (last_message_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('user','admin')),
  message_text text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  metadata jsonb
);

create index if not exists idx_messages_conversation_created on public.messages (conversation_id, created_at desc);
create index if not exists idx_messages_unread on public.messages (conversation_id, read_at) where read_at is null;

-- ----------------------------------------------------------------------------
-- SITE SETTINGS
-- ----------------------------------------------------------------------------
create table if not exists public.site_settings (
  id boolean primary key default true,
  website_title text not null default 'A Little Question For You 💗',
  welcome_message text not null default E'I made something small...\nbut maybe a little meaningful.',
  final_message text not null default 'Thank you for answering. 💗',
  questionnaire_enabled boolean not null default true,
  allow_multiple_submissions boolean not null default false,
  account_creation_enabled boolean not null default true,
  chat_enabled boolean not null default true,
  session_timeout_minutes integer not null default 1440,
  notifications_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint single_row check (id)
);

insert into public.site_settings (id) values (true) on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- TRIGGERS: updated_at maintenance + auto profile creation
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_questions_updated on public.questions;
create trigger trg_questions_updated before update on public.questions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_answers_updated on public.answers;
create trigger trg_answers_updated before update on public.answers
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.conversations (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_conversation()
returns trigger language plpgsql as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_conversation on public.messages;
create trigger trg_touch_conversation after insert on public.messages
  for each row execute function public.touch_conversation();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.questions enable row level security;
alter table public.responses enable row level security;
alter table public.answers enable row level security;
alter table public.supporting_answers enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_activity enable row level security;
alter table public.site_settings enable row level security;

-- PROFILES
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles for select
  using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles for update
  using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert
  with check (auth.uid() = id);

-- USER PREFERENCES
drop policy if exists "prefs_all_own" on public.user_preferences;
create policy "prefs_all_own" on public.user_preferences for all
  using (auth.uid() = user_id or public.is_admin(auth.uid()))
  with check (auth.uid() = user_id);

-- QUESTIONS (public read of active questions; admin manages all)
drop policy if exists "questions_public_read_active" on public.questions;
create policy "questions_public_read_active" on public.questions for select
  using (is_active = true or public.is_admin(auth.uid()));

drop policy if exists "questions_admin_write" on public.questions;
create policy "questions_admin_write" on public.questions for insert
  with check (public.is_admin(auth.uid()));
drop policy if exists "questions_admin_update" on public.questions;
create policy "questions_admin_update" on public.questions for update
  using (public.is_admin(auth.uid()));
drop policy if exists "questions_admin_delete" on public.questions;
create policy "questions_admin_delete" on public.questions for delete
  using (public.is_admin(auth.uid()));

-- RESPONSES
drop policy if exists "responses_select_own_or_admin" on public.responses;
create policy "responses_select_own_or_admin" on public.responses for select
  using (auth.uid() = user_id or user_id is null or public.is_admin(auth.uid()));

drop policy if exists "responses_insert_own_or_anon" on public.responses;
create policy "responses_insert_own_or_anon" on public.responses for insert
  with check (auth.uid() = user_id or user_id is null);

drop policy if exists "responses_update_own_or_admin" on public.responses;
create policy "responses_update_own_or_admin" on public.responses for update
  using (auth.uid() = user_id or user_id is null or public.is_admin(auth.uid()));

drop policy if exists "responses_delete_admin" on public.responses;
create policy "responses_delete_admin" on public.responses for delete
  using (public.is_admin(auth.uid()));

-- ANSWERS (scoped through parent response ownership)
drop policy if exists "answers_select_own_or_admin" on public.answers;
create policy "answers_select_own_or_admin" on public.answers for select
  using (
    public.is_admin(auth.uid())
    or exists (select 1 from public.responses r where r.id = answers.response_id and (r.user_id = auth.uid() or r.user_id is null))
  );

drop policy if exists "answers_insert_own_or_admin" on public.answers;
create policy "answers_insert_own_or_admin" on public.answers for insert
  with check (
    public.is_admin(auth.uid())
    or exists (select 1 from public.responses r where r.id = answers.response_id and (r.user_id = auth.uid() or r.user_id is null))
  );

drop policy if exists "answers_update_own_or_admin" on public.answers;
create policy "answers_update_own_or_admin" on public.answers for update
  using (
    public.is_admin(auth.uid())
    or exists (select 1 from public.responses r where r.id = answers.response_id and (r.user_id = auth.uid() or r.user_id is null))
  );

drop policy if exists "answers_delete_admin" on public.answers;
create policy "answers_delete_admin" on public.answers for delete
  using (public.is_admin(auth.uid()));

-- SUPPORTING ANSWERS
drop policy if exists "supporting_select_own_or_admin" on public.supporting_answers;
create policy "supporting_select_own_or_admin" on public.supporting_answers for select
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.answers a join public.responses r on r.id = a.response_id
      where a.id = supporting_answers.answer_id and (r.user_id = auth.uid() or r.user_id is null)
    )
  );

drop policy if exists "supporting_insert_own_or_admin" on public.supporting_answers;
create policy "supporting_insert_own_or_admin" on public.supporting_answers for insert
  with check (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.answers a join public.responses r on r.id = a.response_id
      where a.id = supporting_answers.answer_id and (r.user_id = auth.uid() or r.user_id is null)
    )
  );

drop policy if exists "supporting_delete_admin" on public.supporting_answers;
create policy "supporting_delete_admin" on public.supporting_answers for delete
  using (public.is_admin(auth.uid()));

-- CONVERSATIONS
drop policy if exists "conversations_select_own_or_admin" on public.conversations;
create policy "conversations_select_own_or_admin" on public.conversations for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "conversations_insert_own_or_admin" on public.conversations;
create policy "conversations_insert_own_or_admin" on public.conversations for insert
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "conversations_update_own_or_admin" on public.conversations;
create policy "conversations_update_own_or_admin" on public.conversations for update
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- MESSAGES
drop policy if exists "messages_select_participant" on public.messages;
create policy "messages_select_participant" on public.messages for select
  using (
    public.is_admin(auth.uid())
    or exists (select 1 from public.conversations c where c.id = messages.conversation_id and c.user_id = auth.uid())
  );

drop policy if exists "messages_insert_participant" on public.messages;
create policy "messages_insert_participant" on public.messages for insert
  with check (
    sender_id = auth.uid()
    and (
      public.is_admin(auth.uid())
      or exists (select 1 from public.conversations c where c.id = messages.conversation_id and c.user_id = auth.uid())
    )
  );

drop policy if exists "messages_update_participant" on public.messages;
create policy "messages_update_participant" on public.messages for update
  using (
    public.is_admin(auth.uid())
    or exists (select 1 from public.conversations c where c.id = messages.conversation_id and c.user_id = auth.uid())
  );

drop policy if exists "messages_delete_admin" on public.messages;
create policy "messages_delete_admin" on public.messages for delete
  using (public.is_admin(auth.uid()));

-- ADMIN TABLES
drop policy if exists "admin_users_self_or_admin" on public.admin_users;
create policy "admin_users_self_or_admin" on public.admin_users for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "admin_activity_admin_only" on public.admin_activity;
create policy "admin_activity_admin_only" on public.admin_activity for select
  using (public.is_admin(auth.uid()));
drop policy if exists "admin_activity_admin_insert" on public.admin_activity;
create policy "admin_activity_admin_insert" on public.admin_activity for insert
  with check (public.is_admin(auth.uid()));

-- SITE SETTINGS
drop policy if exists "settings_public_read" on public.site_settings;
create policy "settings_public_read" on public.site_settings for select using (true);
drop policy if exists "settings_admin_update" on public.site_settings;
create policy "settings_admin_update" on public.site_settings for update using (public.is_admin(auth.uid()));

-- ============================================================================
-- STORAGE (avatar uploads)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar_public_read" on storage.objects;
create policy "avatar_public_read" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatar_owner_write" on storage.objects;
create policy "avatar_owner_write" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar_owner_update" on storage.objects;
create policy "avatar_owner_update" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar_owner_delete" on storage.objects;
create policy "avatar_owner_delete" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- REALTIME
-- ============================================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;

-- ============================================================================
-- SEED: the 15 primary questions + conditional/supporting questions
-- ============================================================================
insert into public.questions (key, question, introduction, type, options, required, display_order, conditional_rule, is_supporting, placeholder)
values
('free_time', E'What''s your favorite way to spend a free day?', 'Let''s start simple...', 'SINGLE_CHOICE',
  '[{"value":"movies","label":"Watching movies 🎬"},{"value":"music","label":"Listening to music 🎧"},{"value":"games","label":"Playing games 🎮"},{"value":"reading","label":"Reading 📚"},{"value":"outdoors","label":"Going outdoors 🌿"},{"value":"friends","label":"Hanging out with friends 👯"},{"value":"sleep","label":"Sleeping in 😴"}]', true, 1, null, false, null),

('has_facebook', 'Do you have a Facebook?', 'Just so I can find you there too 🤍', 'SINGLE_CHOICE',
  '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]', true, 2, null, false, null),

('love_language', 'What makes you feel most loved?', 'Getting a little deeper...', 'SINGLE_CHOICE',
  '[{"value":"words","label":"Words of Affirmation 💌"},{"value":"acts","label":"Acts of Service 🤝"},{"value":"gifts","label":"Receiving Gifts 🎁"},{"value":"time","label":"Quality Time ⏳"},{"value":"touch","label":"Physical Touch 🤍"}]', true, 3, null, false, null),

('favorite_memory', 'What''s a memory that always makes you smile?', 'Take your time with this one 💭', 'LONG_TEXT', null, true, 4, null, false, 'Tell me about it...'),

('ideal_date', 'What''s your idea of a perfect date?', null, 'SINGLE_CHOICE',
  '[{"value":"cozy","label":"Cozy night in 🕯️"},{"value":"adventure","label":"Adventurous outing 🌄"},{"value":"dinner","label":"Fancy dinner 🍷"},{"value":"walk","label":"Simple walk & talk 🚶"},{"value":"food","label":"Trying new food 🍜"}]', true, 5, null, false, null),

('comfort_food', 'What''s your ultimate comfort food?', null, 'TEXT', null, false, 6, null, false, 'e.g. ramen, chocolate...'),

('stress_relief', 'How do you usually unwind after a hard day?', 'Pick as many as you like', 'MULTIPLE_CHOICE',
  '[{"value":"music","label":"Music 🎵"},{"value":"sleep","label":"Sleeping 😴"},{"value":"talk","label":"Talking to someone 💬"},{"value":"walk","label":"Taking a walk 🚶"},{"value":"food","label":"Eating something good 🍰"},{"value":"alone","label":"Being alone for a bit 🤍"}]', true, 7, null, false, null),

('three_words', 'What three words would your friends use to describe you?', null, 'TEXT', null, false, 8, null, false, 'e.g. kind, funny, loyal'),

('future_excite', 'What''s something you''re excited about these days?', null, 'LONG_TEXT', null, false, 9, null, false, 'Tell me what''s on your mind...'),

('perfect_weekend', 'What does your perfect weekend look like?', null, 'SINGLE_CHOICE',
  '[{"value":"relax","label":"Doing absolutely nothing 😌"},{"value":"social","label":"Full of people & plans 🎉"},{"value":"mix","label":"A mix of both 🤍"},{"value":"productive","label":"Getting things done ✅"}]', true, 10, null, false, null),

('communication_style', 'How do you like to stay in touch?', null, 'SINGLE_CHOICE',
  '[{"value":"text","label":"Texting all day 📱"},{"value":"calls","label":"Phone calls 📞"},{"value":"voice","label":"Voice notes 🎙️"},{"value":"person","label":"In person, always 🤍"}]', true, 11, null, false, null),

('pet_peeve', 'What''s a little thing that annoys you?', null, 'TEXT', null, false, 12, null, false, 'Be honest 😅'),

('dream_trip', 'If we could travel anywhere together, where would it be?', null, 'TEXT', null, false, 13, null, false, 'Dream big 🌍'),

('nickname_friends', 'What do the people closest to you call you?', 'This stays just between us 🤍', 'TEXT', null, false, 14, null, false, 'Your nickname...'),

('closing_feelings', 'Is there anything else you want me to know about you?', 'Last one, I promise 💗', 'LONG_TEXT', null, false, 15, null, false, 'Anything at all...'),

-- Conditional / supporting questions (not counted in the main 15)
('facebook_url', 'What''s your Facebook?', 'facebook.com/username or just your username', 'TEXT',
  null, true, 100, '{"dependsOnQuestionKey":"has_facebook","showWhenValueIn":["yes"]}', true, 'facebook.com/username'),

('movie_genre', 'What genre of movies do you usually like? 🎬', 'Tell me more... 💭', 'MULTIPLE_CHOICE',
  '[{"value":"action","label":"Action 💥"},{"value":"comedy","label":"Comedy 😂"},{"value":"romance","label":"Romance 💕"},{"value":"drama","label":"Drama 😢"},{"value":"horror","label":"Horror 👻"},{"value":"scifi","label":"Sci-Fi 🚀"},{"value":"fantasy","label":"Fantasy 🧙"},{"value":"thriller","label":"Thriller 😰"},{"value":"animation","label":"Animation 🎨"},{"value":"documentary","label":"Documentary 📚"},{"value":"all","label":"I like all of them 🎬"}]',
  true, 101, '{"dependsOnQuestionKey":"free_time","showWhenValueIn":["movies"]}', true, null),

('music_genre', 'What genre of music do you usually listen to? 🎧', 'Tell me more... 💭', 'MULTIPLE_CHOICE',
  '[{"value":"pop","label":"Pop"},{"value":"rock","label":"Rock"},{"value":"hiphop","label":"Hip-Hop"},{"value":"rnb","label":"R&B"},{"value":"jazz","label":"Jazz"},{"value":"classical","label":"Classical"},{"value":"electronic","label":"Electronic"},{"value":"indie","label":"Indie"},{"value":"kpop","label":"K-Pop"},{"value":"opm","label":"OPM"},{"value":"reggae","label":"Reggae"},{"value":"latin","label":"Latin"},{"value":"country","label":"Country"},{"value":"metal","label":"Metal"},{"value":"trap","label":"Trap"}]',
  true, 102, '{"dependsOnQuestionKey":"free_time","showWhenValueIn":["music"]}', true, null),

('music_artists', 'Any artists you''re obsessed with? 🎤', null, 'TEXT', null, false, 103,
  '{"dependsOnQuestionKey":"free_time","showWhenValueIn":["music"]}', true, 'Name a few...'),

('music_mood', E'What''s your current music mood? ☀️🌙', null, 'SINGLE_CHOICE',
  '[{"value":"upbeat","label":"Upbeat"},{"value":"chill","label":"Chill"},{"value":"sad","label":"Sad"},{"value":"energetic","label":"Energetic"}]',
  true, 104, '{"dependsOnQuestionKey":"free_time","showWhenValueIn":["music"]}', true, null),

('game_type', 'What kind of games do you usually play? 🎮', 'Tell me more... 💭', 'MULTIPLE_CHOICE',
  '[{"value":"action","label":"Action"},{"value":"rpg","label":"RPG"},{"value":"strategy","label":"Strategy"},{"value":"puzzle","label":"Puzzle"},{"value":"sports","label":"Sports"},{"value":"simulation","label":"Simulation"},{"value":"adventure","label":"Adventure"},{"value":"horror","label":"Horror"},{"value":"casual","label":"Casual"},{"value":"multiplayer","label":"Multiplayer"},{"value":"mobile","label":"Mobile Games"},{"value":"console","label":"Console"},{"value":"vr","label":"VR"},{"value":"indie","label":"Indie"}]',
  true, 105, '{"dependsOnQuestionKey":"free_time","showWhenValueIn":["games"]}', true, null),

('game_platform', 'Which platform?', null, 'SINGLE_CHOICE',
  '[{"value":"pc","label":"PC"},{"value":"console","label":"Console"},{"value":"mobile","label":"Mobile"},{"value":"vr","label":"VR"},{"value":"all","label":"All"}]',
  true, 106, '{"dependsOnQuestionKey":"free_time","showWhenValueIn":["games"]}', true, null),

('game_hours', 'How many hours do you play per week?', null, 'SINGLE_CHOICE',
  '[{"value":"0","label":"0"},{"value":"5","label":"5"},{"value":"10","label":"10"},{"value":"15","label":"15"},{"value":"20","label":"20"},{"value":"25","label":"25"},{"value":"30","label":"30"},{"value":"40","label":"40"},{"value":"50","label":"50+"}]',
  true, 107, '{"dependsOnQuestionKey":"free_time","showWhenValueIn":["games"]}', true, null),

('game_competitive', 'Are you competitive? 🏆', null, 'SINGLE_CHOICE',
  '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"},{"value":"sometimes","label":"Sometimes"}]',
  true, 108, '{"dependsOnQuestionKey":"free_time","showWhenValueIn":["games"]}', true, null)

on conflict (key) do nothing;
