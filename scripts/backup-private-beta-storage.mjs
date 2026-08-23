import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const EXPECTED_REF = 'qdagzcivuddbztsybxfk'

function requiredEnv(name, fallbackName) {
  const value = process.env[name]?.trim() || (fallbackName ? process.env[fallbackName]?.trim() : '')
  if (!value) throw new Error(`Missing ${name}. Configure .env.private-beta.local.`)
  return value
}

const supabaseUrl = requiredEnv('PRIVATE_BETA_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL')
const serviceRoleKey = requiredEnv('PRIVATE_BETA_SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY')
const expectedRef = requiredEnv('PRIVATE_BETA_EXPECTED_PROJECT_REF')
const outputRoot = requiredEnv('PRIVATE_BETA_BACKUP_OUTPUT')
const actualRef = new URL(supabaseUrl).hostname.split('.')[0]

if (expectedRef !== EXPECTED_REF || actualRef !== EXPECTED_REF) {
  throw new Error(`Refusing Storage backup: expected ${EXPECTED_REF}, received ${actualRef}.`)
}

if (!isAbsolute(outputRoot)) throw new Error('Backup output must be an absolute path.')

const workspace = resolve(process.cwd())
const output = resolve(outputRoot)
const relativeToWorkspace = relative(workspace, output)
if (!relativeToWorkspace.startsWith('..') && !isAbsolute(relativeToWorkspace)) {
  throw new Error('Refusing Storage backup inside the Git repository.')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
if (bucketError) throw bucketError

const manifest = {
  projectRef: EXPECTED_REF,
  createdAt: new Date().toISOString(),
  bucketCount: buckets.length,
  objectCount: 0,
  buckets: [],
}

function safeObjectPath(bucketRoot, objectName) {
  const parts = objectName.split('/').filter(Boolean)
  if (!parts.length || parts.some(part => part === '.' || part === '..' || part.includes('\0'))) {
    throw new Error(`Unsafe Storage object path: ${objectName}`)
  }

  const destination = resolve(bucketRoot, ...parts)
  const relativePath = relative(bucketRoot, destination)
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error(`Storage object escaped its bucket directory: ${objectName}`)
  }
  return destination
}

async function listFiles(bucketName, prefix = '', depth = 0) {
  if (depth > 30) throw new Error(`Storage path depth exceeded in ${bucketName}/${prefix}`)

  const files = []
  for (let offset = 0; offset < 10000; offset += 100) {
    const { data, error } = await supabase.storage.from(bucketName).list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw error

    for (const entry of data) {
      const objectName = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.id) files.push({ objectName, metadata: entry.metadata ?? null })
      else files.push(...await listFiles(bucketName, objectName, depth + 1))
    }

    if (data.length < 100) break
    if (offset === 9900) throw new Error(`Storage listing exceeded 10,000 entries in ${bucketName}/${prefix}`)
  }
  return files
}

for (const bucket of buckets) {
  const bucketRoot = resolve(output, 'storage', bucket.id)
  await mkdir(bucketRoot, { recursive: true })
  const files = await listFiles(bucket.id)
  const bucketManifest = {
    id: bucket.id,
    public: bucket.public,
    fileSizeLimit: bucket.file_size_limit ?? null,
    allowedMimeTypes: bucket.allowed_mime_types ?? null,
    objects: [],
  }

  for (const file of files) {
    const { data, error } = await supabase.storage.from(bucket.id).download(file.objectName)
    if (error) throw error
    const bytes = Buffer.from(await data.arrayBuffer())
    const destination = safeObjectPath(bucketRoot, file.objectName)
    await mkdir(resolve(destination, '..'), { recursive: true })
    await writeFile(destination, bytes)
    bucketManifest.objects.push({
      name: file.objectName,
      size: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      metadata: file.metadata,
    })
    manifest.objectCount += 1
  }

  manifest.buckets.push(bucketManifest)
}

const manifestPath = resolve(output, 'backup-manifest.json')
if (!manifestPath.startsWith(`${output}${sep}`)) throw new Error('Invalid manifest destination.')
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

console.log(`Backed up ${manifest.objectCount} Storage objects across ${manifest.bucketCount} buckets.`)
