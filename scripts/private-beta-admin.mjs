import { createClient } from '@supabase/supabase-js'

const APP_BUCKETS = [
  'project-documents',
  'project-photos',
  'avatars',
  'profile-pictures',
  'project-files',
  'report-attachments',
]

const WORKSPACE_BUCKETS = [
  'project-documents',
  'project-photos',
  'project-files',
  'report-attachments',
]

function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing ${name}. Use .env.private-beta.example as the template.`)
  return value
}

const supabaseUrl = requiredEnv('PRIVATE_BETA_SUPABASE_URL')
const serviceRoleKey = requiredEnv('PRIVATE_BETA_SUPABASE_SERVICE_ROLE_KEY')
const expectedProjectRef = requiredEnv('PRIVATE_BETA_EXPECTED_PROJECT_REF')
const privateBetaUrl = requiredEnv('PRIVATE_BETA_APP_URL').replace(/\/$/, '')
const maxUsers = Number(process.env.PRIVATE_BETA_MAX_USERS || '3')
const actualProjectRef = new URL(supabaseUrl).hostname.split('.')[0]

if (actualProjectRef !== expectedProjectRef) {
  throw new Error(`Refusing to run: configured project ${actualProjectRef} does not match PRIVATE_BETA_EXPECTED_PROJECT_REF.`)
}

if (!privateBetaUrl.startsWith('https://')) {
  throw new Error('PRIVATE_BETA_APP_URL must use HTTPS.')
}

if (!Number.isInteger(maxUsers) || maxUsers < 1 || maxUsers > 10) {
  throw new Error('PRIVATE_BETA_MAX_USERS must be an integer from 1 to 10.')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function option(name) {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? null : process.argv[index + 1]
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function listAllUsers() {
  const users = []
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < 200) return users
  }
  throw new Error('User listing exceeded the safe pagination limit.')
}

async function findUserByEmail(email) {
  const users = await listAllUsers()
  return users.find(user => user.email?.toLowerCase() === email.toLowerCase()) ?? null
}

async function readiness() {
  const { data, error } = await supabase.rpc('private_beta_readiness')
  if (error) {
    return { ready: false, error: error.message }
  }
  return data
}

async function status() {
  const [security, users, bucketResult] = await Promise.all([
    readiness(),
    listAllUsers(),
    supabase.storage.listBuckets(),
  ])

  if (bucketResult.error) throw bucketResult.error
  const relevantBuckets = bucketResult.data
    .filter(bucket => APP_BUCKETS.includes(bucket.id))
    .map(bucket => ({
      id: bucket.id,
      public: bucket.public,
      fileSizeLimit: bucket.file_size_limit,
    }))

  console.log(JSON.stringify({
    projectRef: actualProjectRef,
    privateBetaUrl,
    security,
    authUsers: users.length,
    configuredUserCap: maxUsers,
    buckets: relevantBuckets,
  }, null, 2))

  if (!security?.ready) process.exitCode = 2
}

async function invite() {
  const email = option('email')?.trim().toLowerCase()
  const name = option('name')?.trim()
  const position = option('position')?.trim() || 'Private Beta Tester'
  if (!email || !validEmail(email)) throw new Error('Provide a valid --email value.')

  const security = await readiness()
  if (!security?.ready) {
    throw new Error(`Invitations are locked until private_beta_readiness passes: ${JSON.stringify(security)}`)
  }

  const users = await listAllUsers()
  if (users.length >= maxUsers) {
    throw new Error(`Invitation refused: the configured ${maxUsers}-user private-beta cap has been reached.`)
  }
  if (users.some(user => user.email?.toLowerCase() === email)) {
    throw new Error('An Auth user already exists for this email. Resend or recover access from the Supabase dashboard.')
  }

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${privateBetaUrl}/auth/confirm`,
    data: { name: name || email.split('@')[0], position },
  })
  if (error) throw error

  const suggestedExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  console.log(JSON.stringify({
    invited: true,
    userId: data.user.id,
    email,
    suggestedExpiry: suggestedExpiry.toISOString(),
    reminder: 'Record the expiry and ban the account when testing ends.',
  }, null, 2))
}

async function setBan(banned) {
  const email = option('email')?.trim().toLowerCase()
  if (!email || !validEmail(email)) throw new Error('Provide a valid --email value.')
  const user = await findUserByEmail(email)
  if (!user) throw new Error('No Auth user exists for that email.')

  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    ban_duration: banned ? '876000h' : 'none',
  })
  if (error) throw error
  console.log(`${banned ? 'Banned' : 'Unbanned'} ${email}.`)
}

async function listStoredFiles(bucket, prefix) {
  const paths = []
  for (let offset = 0; offset < 10000; offset += 100) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw error
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.id) paths.push(path)
      else paths.push(...await listStoredFiles(bucket, path))
    }
    if (data.length < 100) break
  }
  return paths
}

async function removeStoredPrefix(bucket, prefix) {
  const paths = await listStoredFiles(bucket, prefix)
  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await supabase.storage.from(bucket).remove(paths.slice(index, index + 100))
    if (error) throw error
  }
  return paths.length
}

async function cleanup() {
  const email = option('email')?.trim().toLowerCase()
  const confirmation = option('confirm')?.trim().toLowerCase()
  if (!email || !validEmail(email)) throw new Error('Provide a valid --email value.')
  if (confirmation !== email) {
    throw new Error('Cleanup requires --confirm with the exact same email address.')
  }

  const user = await findUserByEmail(email)
  if (!user) throw new Error('No Auth user exists for that email.')

  await supabase.auth.admin.updateUserById(user.id, { ban_duration: '876000h' })

  const { data: memberships, error: membershipError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
  if (membershipError) throw membershipError

  for (const membership of memberships) {
    const { count, error } = await supabase
      .from('workspace_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('workspace_id', membership.workspace_id)
    if (error) throw error
    if ((count ?? 0) !== 1) {
      throw new Error('Cleanup stopped: this account belongs to a shared workspace. Keep it banned and use the manual shared-workspace review procedure.')
    }
  }

  let removedObjects = 0
  for (const membership of memberships) {
    for (const bucket of WORKSPACE_BUCKETS) {
      removedObjects += await removeStoredPrefix(bucket, membership.workspace_id)
    }
  }
  for (const bucket of ['avatars', 'profile-pictures']) {
    removedObjects += await removeStoredPrefix(bucket, user.id)
  }

  for (const membership of memberships) {
    const { error } = await supabase.from('workspaces').delete().eq('id', membership.workspace_id)
    if (error) throw error
  }

  const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id)
  if (deleteUserError) throw deleteUserError

  console.log(JSON.stringify({ cleaned: true, email, removedObjects, workspaces: memberships.length }, null, 2))
}

function help() {
  console.log(`
Relay private-beta owner CLI

  npm run private-beta:admin -- status
  npm run private-beta:admin -- invite --email person@example.com --name "Person Name" --position "Project Manager"
  npm run private-beta:admin -- ban --email person@example.com
  npm run private-beta:admin -- unban --email person@example.com
  npm run private-beta:admin -- cleanup --email person@example.com --confirm person@example.com

The CLI refuses invitations while the database readiness check fails or the configured user cap is reached.
Cleanup refuses shared workspaces and bans the account before removing isolated data.
`)
}

const command = process.argv[2] || 'help'

try {
  if (command === 'status') await status()
  else if (command === 'invite') await invite()
  else if (command === 'ban') await setBan(true)
  else if (command === 'unban') await setBan(false)
  else if (command === 'cleanup') await cleanup()
  else help()
} catch (error) {
  console.error(`Private beta admin error: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
