/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase.types'
import {
  DEMO_CHANGE_EVENT,
  DEMO_STORAGE_CHANNEL,
  DEMO_STORAGE_KEY,
  DEMO_USER_EMAIL,
  DEMO_USER_ID,
} from './config'
import { createDemoSeedData, type DemoDatabase, type DemoRecord } from './seed-data'

type Filter = {
  column: string
  operator: 'eq' | 'neq' | 'in' | 'not' | 'gte' | 'lte' | 'gt' | 'lt' | 'contains'
  value: unknown
  secondary?: unknown
}

type DemoChange = {
  table: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | 'RESET'
  new: DemoRecord | null
  old: DemoRecord | null
}

type RealtimeHandler = {
  table?: string
  event?: string
  callback: (payload: DemoChange) => void
}

const memoryFiles = new Map<string, Blob>()
const channels = new Set<DemoChannel>()
let broadcastChannel: BroadcastChannel | null = null

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const getStorage = () => (typeof window === 'undefined' ? null : window.localStorage)

const readDatabase = (): DemoDatabase => {
  const storage = getStorage()
  if (!storage) return createDemoSeedData()

  const stored = storage.getItem(DEMO_STORAGE_KEY)
  if (!stored) {
    const seeded = createDemoSeedData()
    storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(seeded))
    return seeded
  }

  try {
    return JSON.parse(stored) as DemoDatabase
  } catch {
    const seeded = createDemoSeedData()
    storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(seeded))
    return seeded
  }
}

const writeDatabase = (database: DemoDatabase) => {
  getStorage()?.setItem(DEMO_STORAGE_KEY, JSON.stringify(database))
}

const ensureBroadcastChannel = () => {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window) || broadcastChannel) return
  broadcastChannel = new BroadcastChannel(DEMO_STORAGE_CHANNEL)
  broadcastChannel.onmessage = (event: MessageEvent<DemoChange>) => notifyChannels(event.data, false)
}

const notifyChannels = (change: DemoChange, broadcast = true) => {
  channels.forEach(channel => channel.emit(change))
  if (broadcast) {
    ensureBroadcastChannel()
    broadcastChannel?.postMessage(change)
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DEMO_CHANGE_EVENT, { detail: change }))
  }
}

const makeId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const comparable = (value: unknown) => {
  if (typeof value === 'string') return value.toLowerCase()
  return value
}

const matchesFilter = (row: DemoRecord, filter: Filter) => {
  const current = row[filter.column]
  const expected = filter.value

  switch (filter.operator) {
    case 'eq': return comparable(current) === comparable(expected)
    case 'neq': return comparable(current) !== comparable(expected)
    case 'in': return Array.isArray(expected) && expected.some(value => comparable(value) === comparable(current))
    case 'not':
      if (expected === 'is' && filter.secondary === null) return current !== null && current !== undefined
      return current !== filter.secondary
    case 'gte': return String(current) >= String(expected)
    case 'lte': return String(current) <= String(expected)
    case 'gt': return String(current) > String(expected)
    case 'lt': return String(current) < String(expected)
    case 'contains':
      if (Array.isArray(current) && Array.isArray(expected)) return expected.every(value => current.includes(value))
      return String(current ?? '').includes(String(expected ?? ''))
    default: return true
  }
}

const resolveTableName = (table: string) => table === 'photos_with_uploader_names' ? 'photos' : table

const enrichRow = (table: string, row: DemoRecord, database: DemoDatabase): DemoRecord => {
  const project = database.projects?.find(item => item.id === row.project_id)
  const uploader = database.personnel?.find(item => item.id === row.uploaded_by)
  const assignee = database.personnel?.find(item => item.id === row.assigned_to)

  if (table === 'photos_with_uploader_names') {
    return {
      ...row,
      project_name: project?.name ?? null,
      uploader_name: uploader?.name ?? 'Demo User',
    }
  }

  if (table === 'tasks') {
    return {
      ...row,
      project: project ? { id: project.id, name: project.name } : null,
      projects: project ? { id: project.id, name: project.name } : null,
      assignee: row.assignee ?? assignee?.name ?? null,
    }
  }

  if (table === 'reports' || table === 'photos' || table === 'events') {
    return {
      ...row,
      project: project ? { id: project.id, name: project.name } : null,
      uploader: uploader ? { id: uploader.id, name: uploader.name } : null,
    }
  }

  return row
}

class DemoQueryBuilder implements PromiseLike<any> {
  private operation: 'select' | 'insert' | 'upsert' | 'update' | 'delete' = 'select'
  private payload: any = null
  private filters: Filter[] = []
  private orders: Array<{ column: string; ascending: boolean }> = []
  private rowLimit: number | null = null
  private rangeValue: [number, number] | null = null
  private wantsSingle = false
  private wantsMaybeSingle = false
  private head = false
  private countRequested = false
  private upsertConflict = 'id'

  constructor(private readonly requestedTable: string) {}

  select(columns = '*', options?: { count?: string; head?: boolean }) {
    void columns
    if (this.operation === 'select') this.operation = 'select'
    this.head = Boolean(options?.head)
    this.countRequested = Boolean(options?.count)
    return this
  }

  insert(payload: any) {
    this.operation = 'insert'
    this.payload = payload
    return this
  }

  upsert(payload: any, options?: { onConflict?: string }) {
    this.operation = 'upsert'
    this.payload = payload
    this.upsertConflict = options?.onConflict ?? 'id'
    return this
  }

  update(payload: any) {
    this.operation = 'update'
    this.payload = payload
    return this
  }

  delete() {
    this.operation = 'delete'
    return this
  }

  eq(column: string, value: unknown) { this.filters.push({ column, operator: 'eq', value }); return this }
  neq(column: string, value: unknown) { this.filters.push({ column, operator: 'neq', value }); return this }
  in(column: string, value: unknown[]) { this.filters.push({ column, operator: 'in', value }); return this }
  not(column: string, operator: string, value: unknown) { this.filters.push({ column, operator: 'not', value: operator, secondary: value }); return this }
  gte(column: string, value: unknown) { this.filters.push({ column, operator: 'gte', value }); return this }
  lte(column: string, value: unknown) { this.filters.push({ column, operator: 'lte', value }); return this }
  gt(column: string, value: unknown) { this.filters.push({ column, operator: 'gt', value }); return this }
  lt(column: string, value: unknown) { this.filters.push({ column, operator: 'lt', value }); return this }
  contains(column: string, value: unknown) { this.filters.push({ column, operator: 'contains', value }); return this }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending !== false })
    return this
  }

  limit(value: number) { this.rowLimit = value; return this }
  range(from: number, to: number) { this.rangeValue = [from, to]; return this }

  single() {
    this.wantsSingle = true
    return this.execute()
  }

  maybeSingle() {
    this.wantsMaybeSingle = true
    return this.execute()
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }

  private async execute() {
    ensureBroadcastChannel()
    const database = readDatabase()
    const table = resolveTableName(this.requestedTable)
    const currentRows = clone(database[table] ?? [])
    const matchedRows = currentRows.filter(row => this.filters.every(filter => matchesFilter(row, filter)))
    let resultRows: DemoRecord[] = []

    if (this.operation === 'insert') {
      const incoming = (Array.isArray(this.payload) ? this.payload : [this.payload]) as Array<Record<string, unknown>>
      resultRows = incoming.map(item => ({
        ...clone(item),
        id: typeof item.id === 'string' ? item.id : makeId(),
        created_at: item.created_at ?? new Date().toISOString(),
        updated_at: item.updated_at ?? new Date().toISOString(),
      }))
      database[table] = [...currentRows, ...resultRows]
      writeDatabase(database)
      resultRows.forEach(row => notifyChannels({ table, eventType: 'INSERT', new: row, old: null }))
    } else if (this.operation === 'upsert') {
      const incoming = (Array.isArray(this.payload) ? this.payload : [this.payload]) as Array<Record<string, unknown>>
      const nextRows = [...currentRows]
      resultRows = incoming.map(item => {
        const index = nextRows.findIndex(row => row[this.upsertConflict] === item[this.upsertConflict])
        const value = {
          ...(index >= 0 ? nextRows[index] : {}),
          ...clone(item),
          id: typeof item.id === 'string' ? item.id : (index >= 0 ? nextRows[index].id : makeId()),
          updated_at: new Date().toISOString(),
        } as DemoRecord
        const old = index >= 0 ? nextRows[index] : null
        if (index >= 0) nextRows[index] = value
        else nextRows.push(value)
        notifyChannels({ table, eventType: old ? 'UPDATE' : 'INSERT', new: value, old })
        return value
      })
      database[table] = nextRows
      writeDatabase(database)
    } else if (this.operation === 'update') {
      const matchedIds = new Set(matchedRows.map(row => row.id))
      database[table] = currentRows.map(row => {
        if (!matchedIds.has(row.id)) return row
        const updated = { ...row, ...clone(this.payload), updated_at: new Date().toISOString() } as DemoRecord
        resultRows.push(updated)
        notifyChannels({ table, eventType: 'UPDATE', new: updated, old: row })
        return updated
      })
      writeDatabase(database)
    } else if (this.operation === 'delete') {
      const matchedIds = new Set(matchedRows.map(row => row.id))
      database[table] = currentRows.filter(row => !matchedIds.has(row.id))
      resultRows = matchedRows
      writeDatabase(database)
      matchedRows.forEach(row => notifyChannels({ table, eventType: 'DELETE', new: null, old: row }))
    } else {
      resultRows = matchedRows
    }

    resultRows = resultRows.map(row => enrichRow(this.requestedTable, row, database))

    this.orders.slice().reverse().forEach(order => {
      resultRows.sort((a, b) => {
        const left = a[order.column]
        const right = b[order.column]
        const comparison = String(left ?? '').localeCompare(String(right ?? ''), undefined, { numeric: true })
        return order.ascending ? comparison : -comparison
      })
    })

    if (this.rangeValue) resultRows = resultRows.slice(this.rangeValue[0], this.rangeValue[1] + 1)
    if (this.rowLimit !== null) resultRows = resultRows.slice(0, this.rowLimit)

    const count = this.countRequested ? resultRows.length : null
    if (this.head) return { data: null, error: null, count }
    if (this.wantsSingle) {
      if (resultRows.length === 0) return { data: null, error: { message: 'Demo record not found', code: 'PGRST116' }, count }
      return { data: resultRows[0], error: null, count }
    }
    if (this.wantsMaybeSingle) return { data: resultRows[0] ?? null, error: null, count }
    return { data: resultRows, error: null, count }
  }
}

class DemoChannel {
  private handlers: RealtimeHandler[] = []

  constructor(readonly name: string) {}

  on(_type: string, config: { table?: string; event?: string }, callback: (payload: DemoChange) => void) {
    this.handlers.push({ table: config?.table, event: config?.event, callback })
    return this
  }

  subscribe(callback?: (status: string) => void) {
    channels.add(this)
    callback?.('SUBSCRIBED')
    return this
  }

  unsubscribe() {
    channels.delete(this)
    return Promise.resolve('ok')
  }

  emit(change: DemoChange) {
    this.handlers.forEach(handler => {
      const tableMatches = change.table === '*' || !handler.table || handler.table === change.table
      const eventMatches = !handler.event || handler.event === '*' || handler.event === change.eventType
      if (tableMatches && eventMatches) handler.callback(change)
    })
  }
}

const demoUser = {
  id: DEMO_USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: DEMO_USER_EMAIL,
  email_confirmed_at: new Date().toISOString(),
  phone: '',
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: { provider: 'demo', providers: ['demo'] },
  user_metadata: { name: 'Alex Morgan', position: 'Project Manager', demo: true },
  identities: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_anonymous: false,
}

const demoSession = {
  access_token: 'browser-local-demo-session',
  token_type: 'bearer',
  expires_in: 31536000,
  expires_at: Math.floor(Date.now() / 1000) + 31536000,
  refresh_token: 'browser-local-demo-refresh',
  user: demoUser,
}

const createStorageBucket = (bucket: string) => ({
  upload: async (path: string, file: Blob) => {
    memoryFiles.set(`${bucket}/${path}`, file)
    return { data: { path, fullPath: `${bucket}/${path}` }, error: null }
  },
  download: async (path: string) => {
    const stored = memoryFiles.get(`${bucket}/${path}`)
    const fallback = new Blob([
      `ProjTrack browser-local demo file\n\nPath: ${path}\n\nThis placeholder represents a file that would be stored in Supabase Storage in live backend mode.`,
    ], { type: 'text/plain' })
    return { data: stored ?? fallback, error: null }
  },
  remove: async (paths: string[]) => {
    paths.forEach(path => memoryFiles.delete(`${bucket}/${path}`))
    return { data: paths.map(name => ({ name })), error: null }
  },
  getPublicUrl: (path: string) => {
    const stored = memoryFiles.get(`${bucket}/${path}`)
    if (stored && typeof URL !== 'undefined') return { data: { publicUrl: URL.createObjectURL(stored) } }
    const label = encodeURIComponent('Demo image - stored only in this browser')
    return { data: { publicUrl: `data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'%3E%3Crect width='100%25' height='100%25' fill='%23fff7ed'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23ea580c' font-family='Arial' font-size='32'%3E${label}%3C/text%3E%3C/svg%3E` } }
  },
  createSignedUrl: async (path: string) => ({ data: { signedUrl: createStorageBucket(bucket).getPublicUrl(path).data.publicUrl }, error: null }),
  list: async () => ({ data: [], error: null }),
})

export function resetDemoData() {
  const seeded = createDemoSeedData()
  writeDatabase(seeded)
  memoryFiles.clear()
  notifyChannels({ table: '*', eventType: 'RESET', new: null, old: null })
}

export function createDemoSupabaseClient(): SupabaseClient<Database> {
  ensureBroadcastChannel()
  const authListeners = new Set<(event: string, session: typeof demoSession | null) => void>()

  const client = {
    from: (table: string) => new DemoQueryBuilder(table),
    channel: (name: string) => new DemoChannel(name),
    removeChannel: async (channel: DemoChannel) => channel.unsubscribe(),
    storage: {
      from: (bucket: string) => createStorageBucket(bucket),
      listBuckets: async () => ({
        data: ['project-documents', 'project-photos', 'avatars'].map(id => ({ id, name: id, public: false })),
        error: null,
      }),
    },
    auth: {
      getSession: async () => ({ data: { session: demoSession }, error: null }),
      getUser: async () => ({ data: { user: demoUser }, error: null }),
      signInWithPassword: async () => {
        authListeners.forEach(listener => listener('SIGNED_IN', demoSession))
        return { data: { user: demoUser, session: demoSession }, error: null }
      },
      signUp: async () => ({ data: { user: demoUser, session: demoSession }, error: null }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ data: {}, error: { message: 'Password recovery is disabled in Demo Mode.' } }),
      updateUser: async () => ({ data: { user: demoUser }, error: null }),
      verifyOtp: async () => ({ data: { user: demoUser, session: demoSession }, error: null }),
      onAuthStateChange: (callback: (event: string, session: typeof demoSession | null) => void) => {
        authListeners.add(callback)
        setTimeout(() => callback('INITIAL_SESSION', demoSession), 0)
        return { data: { subscription: { unsubscribe: () => authListeners.delete(callback) } } }
      },
    },
  }

  return client as unknown as SupabaseClient<Database>
}
