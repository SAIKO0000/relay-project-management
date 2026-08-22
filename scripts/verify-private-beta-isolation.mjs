import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

function required(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing ${name}.`)
  return value
}

const url = required('PRIVATE_BETA_SUPABASE_URL')
const publishableKey = required('PRIVATE_BETA_SUPABASE_PUBLISHABLE_KEY')
const credentials = [
  { email: required('PRIVATE_BETA_TEST_USER_A_EMAIL'), password: required('PRIVATE_BETA_TEST_USER_A_PASSWORD') },
  { email: required('PRIVATE_BETA_TEST_USER_B_EMAIL'), password: required('PRIVATE_BETA_TEST_USER_B_PASSWORD') },
]

const clients = credentials.map(() => createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
}))

async function signIn(client, credentialsForUser) {
  const { data, error } = await client.auth.signInWithPassword(credentialsForUser)
  if (error || !data.user) throw error || new Error('Sign-in returned no user.')

  const { data: membership, error: membershipError } = await client
    .from('workspace_members')
    .select('workspace_id, role, is_default')
    .eq('user_id', data.user.id)
    .order('is_default', { ascending: false })
    .limit(1)
    .single()
  if (membershipError || !membership) throw membershipError || new Error('No workspace membership.')
  return { user: data.user, membership }
}

const [clientA, clientB] = clients
let projectId = null
let storagePath = null

try {
  const [accountA, accountB] = await Promise.all([
    signIn(clientA, credentials[0]),
    signIn(clientB, credentials[1]),
  ])

  assert.notEqual(accountA.user.id, accountB.user.id, 'The isolation test requires two different users.')
  assert.notEqual(accountA.membership.workspace_id, accountB.membership.workspace_id, 'The users must start in unrelated workspaces.')

  const marker = `Isolation test ${crypto.randomUUID()}`
  const { data: project, error: projectError } = await clientA
    .from('projects')
    .insert({
      workspace_id: accountA.membership.workspace_id,
      created_by: accountA.user.id,
      name: marker,
      description: 'Temporary automated tenant-isolation check.',
      status: 'planning',
      priority: 'low',
      progress: 0,
    })
    .select('id, name, progress')
    .single()
  if (projectError || !project) throw projectError || new Error('User A could not create the test project.')
  projectId = project.id

  const { data: leakedProject, error: leakReadError } = await clientB
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .maybeSingle()
  if (leakReadError) throw leakReadError
  assert.equal(leakedProject, null, 'User B could read User A project.')

  const { error: spoofError } = await clientB.from('projects').insert({
    workspace_id: accountA.membership.workspace_id,
    created_by: accountB.user.id,
    name: 'Cross-workspace insert must fail',
    status: 'planning',
    priority: 'low',
  })
  assert.ok(spoofError, 'User B inserted a row into User A workspace.')

  const { error: crossUpdateError } = await clientB
    .from('projects')
    .update({ progress: 99 })
    .eq('id', projectId)
  if (crossUpdateError) throw crossUpdateError
  const { data: unchanged, error: unchangedError } = await clientA
    .from('projects')
    .select('progress')
    .eq('id', projectId)
    .single()
  if (unchangedError) throw unchangedError
  assert.equal(unchanged.progress, 0, 'User B changed User A project.')

  storagePath = `${accountA.membership.workspace_id}/isolation/${crypto.randomUUID()}.txt`
  const body = new Blob(['ProjTrack tenant isolation test'], { type: 'text/plain' })
  const { error: uploadError } = await clientA.storage.from('project-documents').upload(storagePath, body)
  if (uploadError) throw uploadError

  const { error: ownerDownloadError } = await clientA.storage.from('project-documents').download(storagePath)
  if (ownerDownloadError) throw ownerDownloadError
  const { data: leakedFile, error: leakedFileError } = await clientB.storage.from('project-documents').download(storagePath)
  assert.ok(leakedFileError || !leakedFile, 'User B downloaded User A private object.')

  console.log(JSON.stringify({
    pass: true,
    databaseIsolation: true,
    crossWorkspaceInsertDenied: true,
    crossWorkspaceUpdateDenied: true,
    storageIsolation: true,
  }, null, 2))
} finally {
  if (storagePath) await clientA.storage.from('project-documents').remove([storagePath])
  if (projectId) await clientA.from('projects').delete().eq('id', projectId)
  await Promise.all(clients.map(client => client.auth.signOut()))
}
