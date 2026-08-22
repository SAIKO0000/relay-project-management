import { isDemoMode } from '@/lib/demo/config'
import { supabase } from '@/lib/supabase'

export const DEMO_WORKSPACE_ID = '550e8400-e29b-41d4-a716-446655440099'

let cachedWorkspaceId: string | null = null
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

export async function getActiveWorkspaceId(): Promise<string> {
  if (isDemoMode) return DEMO_WORKSPACE_ID
  if (cachedWorkspaceId) return cachedWorkspaceId

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    throw new Error('You must be signed in to access a workspace')
  }

  const { data, error } = await supabase
    .from('workspace_members')
    .select('workspace_id, is_default, joined_at')
    .eq('user_id', userData.user.id)
    .order('is_default', { ascending: false })
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !data?.workspace_id) {
    throw new Error('No private workspace is assigned to this account')
  }

  cachedWorkspaceId = data.workspace_id
  return data.workspace_id
}

export function clearWorkspaceCache() {
  cachedWorkspaceId = null
  signedUrlCache.clear()
}

export function workspaceStoragePath(workspaceId: string, ...segments: string[]) {
  const safeSegments = segments.map((segment) =>
    segment.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '_')
  )
  return [workspaceId, ...safeSegments].join('/')
}

export function userAvatarStoragePath(userId: string, fileExtension: string) {
  const safeExtension = fileExtension.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  return `${userId}/${crypto.randomUUID()}.${safeExtension}`
}

export async function getPrivateStorageUrl(
  bucket: string,
  path: string | null | undefined,
  expiresIn = 3600
): Promise<string> {
  if (!path) return ''
  if (/^https?:\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
    return path
  }

  const cacheKey = `${bucket}:${path}`
  const cached = signedUrlCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.url

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error || !data?.signedUrl) return ''

  signedUrlCache.set(cacheKey, {
    url: data.signedUrl,
    expiresAt: Date.now() + Math.max(expiresIn - 60, 60) * 1000,
  })
  return data.signedUrl
}

export function getCachedPrivateStorageUrl(bucket: string, path: string | null | undefined) {
  if (!path) return ''
  if (/^(https?:|data:|blob:)/i.test(path)) return path
  const cached = signedUrlCache.get(`${bucket}:${path}`)
  return cached && cached.expiresAt > Date.now() ? cached.url : ''
}
