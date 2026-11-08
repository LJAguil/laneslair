-- REVIEW ONLY: new owned game tables/RPCs. No existing tables or history changed.
-- Apply once only after owner review. Conflicting names abort the entire transaction.
begin;
create table public.game_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null check(game_id='rune-lock'),
  puzzle_version integer not null check(puzzle_version=1),
  puzzle_date date not null check(puzzle_date between date '0001-01-01' and date '9999-12-31'),
  difficulty text not null check(difficulty='standard'),
  state jsonb not null,
  revision bigint not null default 1 check(revision>=1),
  updated_at timestamptz not null default now(),
  primary key(user_id,game_id,puzzle_version,puzzle_date,difficulty)
);
create table public.game_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null check(game_id='rune-lock'),
  show_streak boolean not null default false,
  revision bigint not null default 1 check(revision>=1),
  primary key(user_id,game_id)
);
create table public.game_write_operations (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key(user_id,operation_id)
);
alter table public.game_progress enable row level security;
alter table public.game_preferences enable row level security;
alter table public.game_write_operations enable row level security;
revoke all on public.game_progress,public.game_preferences,public.game_write_operations from public,anon,authenticated;
grant select on public.game_progress,public.game_preferences to authenticated;
create policy "Read own game progress" on public.game_progress for select to authenticated using((select auth.uid())=user_id);
create policy "Read own game preferences" on public.game_preferences for select to authenticated using((select auth.uid())=user_id);
-- No client access to write receipts; only owned RPCs can write these tables.

-- Exact published JS v1 unsigned 32-bit FNV/LCG algorithm. Do not change for v1.
create function public.rune_v1_answer(p_date date) returns jsonb language plpgsql immutable set search_path='' as $$
declare seed bigint:=2166136261; ch text; answer jsonb:='[]'; symbols text[]:=array['key','flame','leaf','moon','wave','compass']; i integer;
begin
  foreach ch in array regexp_split_to_array('lair-rune-lock-v1:'||to_char(p_date,'YYYY-MM-DD'),'') loop
    seed:=((seed # ascii(ch)::bigint)*16777619)&4294967295;
  end loop;
  for i in 1..4 loop
    seed:=(seed*1664525+1013904223)&4294967295;
    answer:=answer||jsonb_build_array(symbols[1+floor(seed::numeric/4294967296*6)::integer]);
  end loop;
  return answer;
end $$;
create function public.validate_rune_v1(p_date date,p_state jsonb) returns void language plpgsql immutable set search_path='' as $$
declare guess jsonb; seen jsonb:='[]'; done boolean:=false; symbol jsonb;
begin
  if p_date is null or p_date<date '0001-01-01' or p_date>date '9999-12-31' or p_state is null or jsonb_typeof(p_state)<>'object'
    or not(p_state ?& array['guesses','hintUsed']) or p_state-array['guesses','hintUsed']<>'{}'::jsonb
    or jsonb_typeof(p_state->'guesses')<>'array' or jsonb_typeof(p_state->'hintUsed')<>'boolean'
    then raise exception 'Invalid game state' using errcode='22023'; end if;
  if jsonb_array_length(p_state->'guesses')>6 then raise exception 'Too many guesses' using errcode='22023';end if;
  for guess in select value from jsonb_array_elements(p_state->'guesses') loop
    if done or jsonb_typeof(guess)<>'array' then raise exception 'Finished or invalid game' using errcode='22023';end if;
    if jsonb_array_length(guess)<>4 or exists(select 1 from jsonb_array_elements(seen) previous where previous.value=guess) then raise exception 'Duplicate or incomplete guess' using errcode='22023';end if;
    for symbol in select value from jsonb_array_elements(guess) loop
      if not (symbol <@ '["key","flame","leaf","moon","wave","compass"]'::jsonb) then raise exception 'Invalid rune' using errcode='22023';end if;
    end loop;
    seen:=seen||jsonb_build_array(guess);done:=guess=public.rune_v1_answer(p_date);
  end loop;
end $$;
create function public.submit_rune_progress(p_operation_id uuid,p_date date,p_state jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); saved public.game_progress; receipt jsonb; payload jsonb; merged jsonb; old_count integer; new_count integer; i integer;
begin
  if actor is null then raise exception 'Sign in first' using errcode='42501';end if;
  if p_operation_id is null then raise exception 'Operation ID required' using errcode='22023';end if;
  perform public.validate_rune_v1(p_date,p_state);
  payload:=jsonb_build_object('kind','rune','date',p_date,'state',p_state);
  -- One account lock serializes all imports, preference changes and game submissions.
  perform pg_advisory_xact_lock(hashtextextended('game:'||actor::text,0));
  select o.payload into receipt from public.game_write_operations o where user_id=actor and operation_id=p_operation_id;
  if found then
    if receipt<>payload then raise exception 'Operation ID reused for different submission' using errcode='22023';end if;
    return;
  end if;
  select * into saved from public.game_progress where user_id=actor and game_id='rune-lock' and puzzle_version=1 and puzzle_date=p_date and difficulty='standard';
  merged:=p_state;
  if found then
    old_count:=jsonb_array_length(saved.state->'guesses');new_count:=jsonb_array_length(p_state->'guesses');
    if least(old_count,new_count)>0 then
      for i in 0..least(old_count,new_count)-1 loop
        if saved.state->'guesses'->i <> p_state->'guesses'->i then raise exception 'Conflicting game branches; both copies preserved' using errcode='40001';end if;
      end loop;
    end if;
    merged:=jsonb_build_object('guesses',case when old_count>new_count then saved.state->'guesses' else p_state->'guesses' end,'hintUsed',(saved.state->>'hintUsed')::boolean or (p_state->>'hintUsed')::boolean);
    -- Validation forbids extension after a solve, including imports of invalid history.
    perform public.validate_rune_v1(p_date,merged);
    if merged<>saved.state then
      update public.game_progress set state=merged,revision=revision+1,updated_at=now() where user_id=actor and game_id='rune-lock' and puzzle_version=1 and puzzle_date=p_date and difficulty='standard';
    end if;
  else
    insert into public.game_progress(user_id,game_id,puzzle_version,puzzle_date,difficulty,state) values(actor,'rune-lock',1,p_date,'standard',merged);
  end if;
  insert into public.game_write_operations(user_id,operation_id,payload) values(actor,p_operation_id,payload);
end $$;
create function public.set_game_streak(p_operation_id uuid,p_show_streak boolean,p_expected_revision bigint)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();saved public.game_preferences;receipt jsonb;payload jsonb;
begin
  if actor is null then raise exception 'Sign in first' using errcode='42501';end if;
  if p_operation_id is null or p_show_streak is null or (p_expected_revision is not null and p_expected_revision<1) then raise exception 'Invalid preference' using errcode='22023';end if;
  payload:=jsonb_build_object('kind','preference','showStreak',p_show_streak,'expected',p_expected_revision);
  perform pg_advisory_xact_lock(hashtextextended('game:'||actor::text,0));
  select o.payload into receipt from public.game_write_operations o where user_id=actor and operation_id=p_operation_id;
  if found then
    if receipt<>payload then raise exception 'Operation ID reused' using errcode='22023';end if;
    return;
  end if;
  select * into saved from public.game_preferences where user_id=actor and game_id='rune-lock';
  if found then
    if saved.show_streak<>p_show_streak then
      if p_expected_revision is distinct from saved.revision then raise exception 'Preference changed on another device' using errcode='40001';end if;
      update public.game_preferences set show_streak=p_show_streak,revision=revision+1 where user_id=actor and game_id='rune-lock';
    end if;
  else
    if p_expected_revision is not null then raise exception 'Preference changed' using errcode='40001';end if;
    insert into public.game_preferences(user_id,game_id,show_streak) values(actor,'rune-lock',p_show_streak);
  end if;
  insert into public.game_write_operations(user_id,operation_id,payload) values(actor,p_operation_id,payload);
end $$;
revoke all on function public.rune_v1_answer(date),public.validate_rune_v1(date,jsonb),public.submit_rune_progress(uuid,date,jsonb),public.set_game_streak(uuid,boolean,bigint) from public,anon,authenticated;
grant execute on function public.submit_rune_progress(uuid,date,jsonb),public.set_game_streak(uuid,boolean,bigint) to authenticated;
commit;
