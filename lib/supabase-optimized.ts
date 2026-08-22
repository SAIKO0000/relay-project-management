// Optimized and legacy query paths intentionally share one client so their
// authentication, Demo Mode data, and realtime events cannot diverge.
export { supabase } from './supabase'

export type Project = Record<string, unknown>
export type Personnel = Record<string, unknown>
export type Task = Record<string, unknown>
export type Event = Record<string, unknown>
export type Report = Record<string, unknown>
export type Photo = Record<string, unknown>
