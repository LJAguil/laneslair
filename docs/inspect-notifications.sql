-- Read-only metadata. Run in Supabase SQL Editor and copy the schema_report cell.
-- No notification records, credentials, or database changes are involved.
select jsonb_pretty(jsonb_object_agg(t.name, jsonb_build_object(
  'columns', (select coalesce(jsonb_agg(to_jsonb(c) order by c.ordinal_position), '[]'::jsonb)
    from (select ordinal_position, column_name, data_type, udt_schema, udt_name,
      is_nullable, column_default from information_schema.columns
      where table_schema = 'public' and table_name = t.name) c),
  'constraints', (select coalesce(jsonb_agg(jsonb_build_object('name', c.conname,
    'definition', pg_get_constraintdef(c.oid, true)) order by c.conname), '[]'::jsonb)
    from pg_constraint c where c.conrelid = to_regclass('public.' || t.name)),
  'rls', (select jsonb_build_object('enabled', relrowsecurity, 'forced', relforcerowsecurity)
    from pg_class where oid = to_regclass('public.' || t.name)),
  'policies', (select coalesce(jsonb_agg(to_jsonb(p) order by policyname), '[]'::jsonb)
    from pg_policies p where schemaname = 'public' and tablename = t.name),
  'indexes', (select coalesce(jsonb_agg(to_jsonb(i) order by indexname), '[]'::jsonb)
    from pg_indexes i where schemaname = 'public' and tablename = t.name),
  'enum_values', (select coalesce(jsonb_agg(jsonb_build_object('column', a.attname,
    'type', typ.typname, 'value', e.enumlabel) order by a.attname, e.enumsortorder), '[]'::jsonb)
    from pg_attribute a join pg_type typ on typ.oid = a.atttypid
    join pg_enum e on e.enumtypid = typ.oid
    where a.attrelid = to_regclass('public.' || t.name) and a.attnum > 0 and not a.attisdropped),
  'triggers', (select coalesce(jsonb_agg(jsonb_build_object('name', tgname,
    'definition', pg_get_triggerdef(g.oid, true), 'function_definition', pg_get_functiondef(tgfoid)) order by tgname), '[]'::jsonb)
    from pg_trigger g where tgrelid = to_regclass('public.' || t.name) and not tgisinternal)
))) as schema_report
from (values ('notifications')) t(name);
