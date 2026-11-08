-- REVIEW ONLY: run separately, ONLY after migration 003 and deployment are approved.
-- First enable pg_cron and pg_net in Supabase Integrations/Extensions.
-- In Supabase Vault, create (without posting their values in chat):
--   lair_push_worker_secret: same 64-char random hex value as Vercel PUSH_WORKER_SECRET
--   lair_app_url: production HTTPS origin (no trailing path, no preview URL)
-- No Supabase secret/service-role key is used.
begin;
do $$
begin
  if not exists(select 1 from pg_extension where extname='pg_cron') or
     not exists(select 1 from pg_extension where extname='pg_net') then
    raise exception 'Enable pg_cron and pg_net before activating';
  end if;
  if not exists(select 1 from vault.decrypted_secrets where name='lair_push_worker_secret' and decrypted_secret ~ '^[a-f0-9]{64}$') or
     not exists(select 1 from vault.decrypted_secrets where name='lair_app_url' and decrypted_secret ~ '^https://[a-zA-Z0-9.-]+(:443)?/?$') then
    raise exception 'Configure the two Vault values first';
  end if;
end $$;
insert into lair_private.push_worker_config(singleton,secret_hash)
 select true,encode(sha256(convert_to(decrypted_secret,'UTF8')),'hex')
 from vault.decrypted_secrets where name='lair_push_worker_secret'
on conflict(singleton) do update set secret_hash=excluded.secret_hash;

select cron.schedule('lair-push-minute','* * * * *', $job$
 select net.http_post(
   url:=rtrim((select decrypted_secret from vault.decrypted_secrets where name='lair_app_url'),'/')||'/api/push/dispatch',
   headers:=jsonb_build_object('Content-Type','application/json','Authorization',
     'Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='lair_push_worker_secret')),
   body:='{}'::jsonb,timeout_milliseconds:=100000
 );
$job$);
-- Bounded history on the 500MB free database. Only these new receipts/job logs are pruned.
select cron.schedule('lair-push-cleanup','23 3 * * *', $job$
 delete from public.push_deliveries where claimed_at<now()-interval '90 days';
 delete from cron.job_run_details where jobid in
   (select jobid from cron.job where jobname in ('lair-push-minute','lair-push-cleanup'))
   and end_time<now()-interval '7 days';
$job$);
commit;
-- To stop scheduling (does not change your app data):
-- select cron.unschedule('lair-push-minute');
-- select cron.unschedule('lair-push-cleanup');
