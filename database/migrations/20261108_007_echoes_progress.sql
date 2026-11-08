-- REVIEW ONLY. Requires applied migrations 005 and 006. Apply once after owner review.
-- Extends game allowlists only; preserves existing rows, RLS, grants and previous RPCs.
begin;
alter table public.game_progress drop constraint game_progress_game_id_check;
alter table public.game_progress add constraint game_progress_game_id_check check(game_id in ('rune-lock','chess','echoes'));
alter table public.game_progress drop constraint game_progress_difficulty_check;
alter table public.game_progress add constraint game_progress_difficulty_check check((game_id in ('rune-lock','echoes') and difficulty='standard') or (game_id='chess' and difficulty in ('beginner','intermediate','advanced')));
alter table public.game_preferences drop constraint game_preferences_game_id_check;
alter table public.game_preferences add constraint game_preferences_game_id_check check(game_id in ('rune-lock','chess','echoes'));
create function public.echoes_v1_content(p_date date) returns jsonb language sql immutable set search_path='' as $$
 select '[[{"id":"stone-bowl","choices":["1","2","3","4"],"answers":["1"]},{"id":"window-orchard","choices":["1","2","3","4"],"answers":["2"]},{"id":"letter-fold","choices":["1","2","3","4","5"],"answers":["1","4"]}],[{"id":"shutter-seam","choices":["1","2","3","4"],"answers":["3"]},{"id":"root-stair","choices":["1","2","3","4"],"answers":["1"]},{"id":"harbor-rope","choices":["1","2","3","4"],"answers":["2"]}],[{"id":"open-palm","choices":["1","2","3","4"],"answers":["2"]},{"id":"coat-seam","choices":["1","2","3","4"],"answers":["1"]},{"id":"spare-cup","choices":["1","2","3","4"],"answers":["3"]}],[{"id":"seed-clock","choices":["1","2","3","4"],"answers":["1"]},{"id":"bridge-lantern","choices":["1","2","3","4"],"answers":["2"]},{"id":"unread-map","choices":["1","2","3","4"],"answers":["3"]}],[{"id":"shared-ember","choices":["1","2","3","4"],"answers":["2"]},{"id":"well-echo","choices":["1","2","3","4"],"answers":["1"]},{"id":"paper-wing","choices":["1","2","3","4"],"answers":["3"]}],[{"id":"two-shadows","choices":["1","2","3","4"],"answers":["1"]},{"id":"reed-bend","choices":["1","2","3","4"],"answers":["2"]},{"id":"swept-threshold","choices":["1","2","3","4"],"answers":["3"]}]]'::jsonb->mod(mod(p_date-date '1970-01-01',6)+6,6)
$$;
create function public.validate_echoes_v1(p_date date,p_state jsonb) returns void language plpgsql immutable set search_path='' as $$
declare content jsonb;round_id text;entry jsonb;definition jsonb;guess jsonb;seen jsonb;done boolean;
begin
 content:=public.echoes_v1_content(p_date);
 if p_date is null or p_date<date '0001-01-01' or p_date>date '9999-12-31' or p_state is null or jsonb_typeof(p_state)<>'object' or not(p_state?'rounds') or p_state-'rounds'<>'{}'::jsonb or jsonb_typeof(p_state->'rounds')<>'object' then raise exception 'Invalid Echoes identity/state' using errcode='22023';end if;
 for round_id,entry in select key,value from jsonb_each(p_state->'rounds') loop
  select value into definition from jsonb_array_elements(content) where value->>'id'=round_id;
  if not found or jsonb_typeof(entry)<>'object' or not(entry ?& array['guesses','hintUsed']) or entry-array['guesses','hintUsed']<>'{}'::jsonb or jsonb_typeof(entry->'guesses')<>'array' or jsonb_typeof(entry->'hintUsed')<>'boolean' then raise exception 'Invalid Echoes round' using errcode='22023';end if;
  if jsonb_array_length(entry->'guesses')>jsonb_array_length(definition->'choices') then raise exception 'Too many answers' using errcode='22023';end if;
  seen:='[]';done:=false;
  for guess in select value from jsonb_array_elements(entry->'guesses') loop
   if done or jsonb_typeof(guess)<>'string' or not(definition->'choices' @> jsonb_build_array(guess)) or seen @> jsonb_build_array(guess) then raise exception 'Invalid, duplicate or post-match answer' using errcode='22023';end if;
   seen:=seen||jsonb_build_array(guess);done:=definition->'answers' @> jsonb_build_array(guess);
  end loop;
 end loop;
end $$;
create function public.submit_echoes_progress(p_operation_id uuid,p_date date,p_state jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();saved public.game_progress;receipt jsonb;payload jsonb;merged jsonb;entry jsonb;old_round jsonb;round_id text;old_count integer;new_count integer;i integer;new_round jsonb;
begin
 if actor is null then raise exception 'Sign in first' using errcode='42501';end if;
 if p_operation_id is null then raise exception 'Operation ID required' using errcode='22023';end if;
 perform public.validate_echoes_v1(p_date,p_state);
 payload:=jsonb_build_object('kind','echoes','date',p_date,'state',p_state);
 perform pg_advisory_xact_lock(hashtextextended('game:'||actor::text,0));
 select o.payload into receipt from public.game_write_operations o where user_id=actor and operation_id=p_operation_id;
 if found then if receipt<>payload then raise exception 'Operation ID reused' using errcode='22023';end if;return;end if;
 select * into saved from public.game_progress where user_id=actor and game_id='echoes' and puzzle_version=1 and puzzle_date=p_date and difficulty='standard';
 merged:=p_state;
 if found then
  merged:=saved.state;
  for round_id,entry in select key,value from jsonb_each(p_state->'rounds') loop
   old_round:=saved.state->'rounds'->round_id;new_round:=entry;
   if old_round is not null then
    old_count:=jsonb_array_length(old_round->'guesses');new_count:=jsonb_array_length(entry->'guesses');
    if least(old_count,new_count)>0 then for i in 0..least(old_count,new_count)-1 loop
     if old_round->'guesses'->i<>entry->'guesses'->i then raise exception 'Different Echoes answer branches; both preserved' using errcode='40001';end if;
    end loop;end if;
    new_round:=jsonb_build_object('guesses',case when old_count>new_count then old_round->'guesses' else entry->'guesses' end,'hintUsed',(old_round->>'hintUsed')::boolean or (entry->>'hintUsed')::boolean);
   end if;
   merged:=jsonb_set(merged,array['rounds',round_id],new_round,true);
  end loop;
  perform public.validate_echoes_v1(p_date,merged);
  if merged<>saved.state then update public.game_progress set state=merged,revision=revision+1,updated_at=now() where user_id=actor and game_id='echoes' and puzzle_version=1 and puzzle_date=p_date and difficulty='standard';end if;
 else
  insert into public.game_progress(user_id,game_id,puzzle_version,puzzle_date,difficulty,state) values(actor,'echoes',1,p_date,'standard',p_state);
 end if;
 insert into public.game_write_operations(user_id,operation_id,payload) values(actor,p_operation_id,payload);
end $$;
create function public.set_echoes_streak(p_operation_id uuid,p_show_streak boolean,p_expected_revision bigint)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();saved public.game_preferences;receipt jsonb;payload jsonb;
begin
  if actor is null then raise exception 'Sign in first' using errcode='42501';end if;
  if p_operation_id is null or p_show_streak is null or (p_expected_revision is not null and p_expected_revision<1) then raise exception 'Invalid preference' using errcode='22023';end if;
  payload:=jsonb_build_object('kind','echoes-preference','showStreak',p_show_streak,'expected',p_expected_revision);
  perform pg_advisory_xact_lock(hashtextextended('game:'||actor::text,0));
  select o.payload into receipt from public.game_write_operations o where user_id=actor and operation_id=p_operation_id;
  if found then
    if receipt<>payload then raise exception 'Operation ID reused' using errcode='22023';end if;
    return;
  end if;
  select * into saved from public.game_preferences where user_id=actor and game_id='echoes';
  if found then
    if saved.show_streak<>p_show_streak then
      if p_expected_revision is distinct from saved.revision then raise exception 'Preference changed on another device' using errcode='40001';end if;
      update public.game_preferences set show_streak=p_show_streak,revision=revision+1 where user_id=actor and game_id='echoes';
    end if;
  else
    if p_expected_revision is not null then raise exception 'Preference changed' using errcode='40001';end if;
    insert into public.game_preferences(user_id,game_id,show_streak) values(actor,'echoes',p_show_streak);
  end if;
  insert into public.game_write_operations(user_id,operation_id,payload) values(actor,p_operation_id,payload);
end $$;

revoke all on function public.echoes_v1_content(date),public.validate_echoes_v1(date,jsonb),public.submit_echoes_progress(uuid,date,jsonb),public.set_echoes_streak(uuid,boolean,bigint) from public,anon,authenticated;
grant execute on function public.submit_echoes_progress(uuid,date,jsonb),public.set_echoes_streak(uuid,boolean,bigint) to authenticated;
commit;
