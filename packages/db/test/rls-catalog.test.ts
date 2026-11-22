import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';

let client: Client;

beforeAll(async () => {
  client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
});

afterAll(async () => {
  await client.end();
});

describe('RLS catalog check', () => {
  it('every public table with a tenant_id column has RLS + FORCE enabled', async () => {
    const { rows } = await client.query(`
      SELECT t.relname, t.relrowsecurity, t.relforcerowsecurity
      FROM pg_class t
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relkind = 'r'
        AND EXISTS (
          SELECT 1 FROM information_schema.columns c
          WHERE c.table_schema = 'public'
            AND c.table_name = t.relname
            AND c.column_name = 'tenant_id'
        )
      ORDER BY t.relname
    `);

    // tenant_memberships + noroform_forms / noroform_form_versions / noroform_submissions.
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.relrowsecurity, `${row.relname} should have RLS enabled`).toBe(true);
      expect(row.relforcerowsecurity, `${row.relname} should have FORCE RLS enabled`).toBe(true);
    }
  });
});
