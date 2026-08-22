import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('workspace migration fails closed around tenant-owned data', async () => {
  const sql = await read('supabase/migrations/202608230001_private_beta_workspaces.sql')
  for (const table of ['projects', 'personnel', 'tasks', 'reports', 'events', 'photos']) {
    assert.match(sql, new RegExp(`'${table}'`))
  }
  assert.match(sql, /alter column workspace_id set not null/i)
  assert.match(sql, /enable row level security/i)
  assert.match(sql, /revoke all on public\.workspaces, public\.workspace_members from anon/i)
  assert.match(sql, /security_invoker = true/i)
})

test('safeguard migration enforces quotas, throttling, and private storage', async () => {
  const sql = await read('supabase/migrations/202608230002_private_beta_safeguards.sql')
  assert.match(sql, /^begin;/im)
  assert.match(sql, /^commit;/im)
  assert.match(sql, /enforce_private_beta_write_rate/i)
  assert.match(sql, /enforce_private_beta_row_quota/i)
  assert.match(sql, /workspace_storage_quota_allows/i)
  assert.match(sql, /private_beta_readiness/i)
  assert.match(sql, /private_beta_storage_insert/i)
  assert.match(sql, /\('project-photos', 'project-photos', false, 3145728/i)
  assert.doesNotMatch(sql, /image\/svg\+xml|text\/html|application\/zip/i)
})

test('private-beta emails use token hashes and the controlled confirmation route', async () => {
  const [invite, recovery] = await Promise.all([
    read('email-templates/invite.html'),
    read('email-templates/recovery.html'),
  ])
  assert.match(invite, /\/auth\/confirm\?token_hash=\{\{ \.TokenHash \}\}&amp;type=invite/)
  assert.match(recovery, /\/auth\/confirm\?token_hash=\{\{ \.TokenHash \}\}&amp;type=recovery/)
  assert.doesNotMatch(invite, /service.role|service_role/i)
})

test('owner CLI refuses unsafe project, readiness, and user-cap states', async () => {
  const cli = await read('scripts/private-beta-admin.mjs')
  assert.match(cli, /PRIVATE_BETA_EXPECTED_PROJECT_REF/)
  assert.match(cli, /private_beta_readiness/)
  assert.match(cli, /configured .*user private-beta cap has been reached/i)
  assert.match(cli, /Cleanup stopped: this account belongs to a shared workspace/)
  assert.match(cli, /--confirm with the exact same email address/)
})

test('public signup and diagnostic routes remain blocked in live-backend mode', async () => {
  const proxy = await read('proxy.ts')
  const auth = await read('lib/auth.tsx')
  assert.match(proxy, /pathname === '\/auth\/signup'/)
  assert.match(proxy, /pathname\.startsWith\('\/debug'\)/)
  assert.match(proxy, /pathname\.startsWith\('\/test'\)/)
  assert.match(auth, /private beta is invitation-only/i)
})

test('upload policy excludes active and archive formats', async () => {
  const policy = await read('lib/upload-policy.ts')
  for (const unsafeType of ['svg', 'html', 'javascript', 'zip', 'rar', 'video/']) {
    assert.doesNotMatch(policy, new RegExp(unsafeType, 'i'))
  }
  assert.match(policy, /maxBytes: 5 \* 1024 \* 1024/)
  assert.match(policy, /maxBytes: 3 \* 1024 \* 1024/)
})

test('browser-visible environment variables never include a service-role secret', async () => {
  const envExample = await read('.env.example')
  assert.doesNotMatch(envExample, /NEXT_PUBLIC_[A-Z0-9_]*SERVICE_ROLE/)
})
