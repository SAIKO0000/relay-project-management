/* eslint-disable @typescript-eslint/no-explicit-any */

type LooseTable = {
  Row: Record<string, any>
  Insert: Record<string, any>
  Update: Record<string, any>
  Relationships: []
}

// Temporary permissive bridge: regenerate this file from the private Supabase
// schema when live-backend development resumes.
export type Database = {
  public: {
    Tables: Record<string, LooseTable>
    Views: Record<string, LooseTable>
    Functions: Record<string, { Args: Record<string, any>; Returns: any }>
    Enums: Record<string, string>
    CompositeTypes: Record<string, never>
  }
}
