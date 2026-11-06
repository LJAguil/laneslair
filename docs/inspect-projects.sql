-- Read-only metadata report. Run in the Supabase SQL Editor.
-- This does not read project rows or modify the database.
-- Copy the schema_report result cell and share it for project integration.
select jsonb_pretty(jsonb_build_object(
  'columns', (
    select coalesce(jsonb_agg(to_jsonb(c) order by c.ordinal_position), '[]'::jsonb)
    from (
      select ordinal_position, column_name, data_type, udt_schema, udt_name,
             is_nullable, column_default, is_identity, identity_generation,
             is_generated, generation_expression
      from information_schema.columns
      where table_schema = 'public' and table_name = 'projects'
    ) c
  ),
  'constraints', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', c.conname, 'definition', pg_get_constraintdef(c.oid, true)
    ) order by c.conname), '[]'::jsonb)
    from pg_constraint c where c.conrelid = 'public.projects'::regclass
  ),
  'referencing_foreign_keys', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', c.conrelid::regclass::text, 'name', c.conname,
      'definition', pg_get_constraintdef(c.oid, true)
    ) order by c.conname), '[]'::jsonb)
    from pg_constraint c
    where c.confrelid = 'public.projects'::regclass and c.contype = 'f'
  ),
  'enum_values', (
    select coalesce(jsonb_agg(to_jsonb(v) order by v.column_name, v.enumsortorder), '[]'::jsonb)
    from (
      select a.attname as column_name, n.nspname as type_schema,
             t.typname as type_name, e.enumlabel, e.enumsortorder
      from pg_attribute a
      join pg_type t on t.oid = a.atttypid
      join pg_namespace n on n.oid = t.typnamespace
      join pg_enum e on e.enumtypid = t.oid
      where a.attrelid = 'public.projects'::regclass
        and a.attnum > 0 and not a.attisdropped
    ) v
  ),
  'rls', (
    select jsonb_build_object('enabled', relrowsecurity, 'forced', relforcerowsecurity)
    from pg_class where oid = 'public.projects'::regclass
  ),
  'policies', (
    select coalesce(jsonb_agg(to_jsonb(p) order by p.policyname), '[]'::jsonb)
    from pg_policies p where schemaname = 'public' and tablename = 'projects'
  ),
  'indexes', (
    select coalesce(jsonb_agg(to_jsonb(i) order by i.indexname), '[]'::jsonb)
    from pg_indexes i where schemaname = 'public' and tablename = 'projects'
  ),
  'triggers', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', t.tgname, 'enabled', t.tgenabled,
      'definition', pg_get_triggerdef(t.oid, true),
      'function_definition', pg_get_functiondef(t.tgfoid)
    ) order by t.tgname), '[]'::jsonb)
    from pg_trigger t
    where t.tgrelid = 'public.projects'::regclass and not t.tgisinternal
  ),
  'grants', (
    select coalesce(jsonb_agg(to_jsonb(g) order by g.grantee, g.privilege_type), '[]'::jsonb)
    from (
      select grantee, privilege_type, is_grantable
      from information_schema.table_privileges
      where table_schema = 'public' and table_name = 'projects'
    ) g
  )
)) as schema_report;
