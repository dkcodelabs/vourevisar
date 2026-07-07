import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20260707125900_move_user_security_definer_rpcs_to_edge.sql',
);

describe('move user security definer RPCs to Edge migration', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8').toLowerCase();

  it('creates a private dispatcher callable only by service_role', () => {
    expect(sql).toContain('create or replace function public.user_rpc_dispatch');
    expect(sql).toContain('security definer');
    expect(sql).toContain("set_config('request.jwt.claim.sub'");
    expect(sql).toContain('revoke all on function public.user_rpc_dispatch(text, jsonb, uuid) from authenticated');
    expect(sql).toContain('grant execute on function public.user_rpc_dispatch(text, jsonb, uuid) to service_role');
  });

  it('removes authenticated REST execution from user-facing security definer RPCs', () => {
    expect(sql).toContain('revoke all on function public.atomic_cycle_load(uuid, uuid, text[], uuid[], text, text, date) from authenticated');
    expect(sql).toContain('revoke all on function public.get_subscription_info(uuid) from authenticated');
    expect(sql).toContain('revoke all on function public.get_user_ai_limits(uuid) from authenticated');
    expect(sql).toContain('revoke all on function public.log_user_event(text, uuid, uuid, text, jsonb, text) from authenticated');
    expect(sql).toContain('revoke all on function public.sync_topic_merge_progress(uuid, uuid, jsonb, jsonb) from authenticated');
  });
});
