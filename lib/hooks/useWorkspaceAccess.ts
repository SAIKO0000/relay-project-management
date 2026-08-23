import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { isDemoMode } from '@/lib/demo/config'
import { supabase } from '@/lib/supabase'

export type WorkspaceRole = 'owner' | 'admin' | 'member'

export function useWorkspaceAccess() {
  const { user } = useAuth()

  const query = useQuery({
    queryKey: ['private-beta', 'workspace-access', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<{ workspaceId: string; role: WorkspaceRole }> => {
      if (isDemoMode) {
        return { workspaceId: 'demo-workspace', role: 'owner' }
      }

      const { data, error } = await supabase
        .from('workspace_members')
        .select('workspace_id, role, is_default, joined_at')
        .eq('user_id', user!.id)
        .order('is_default', { ascending: false })
        .order('joined_at', { ascending: true })
        .limit(1)
        .single()

      if (error || !data?.workspace_id) {
        throw new Error('No active private-beta workspace is assigned to this account.')
      }

      return {
        workspaceId: data.workspace_id,
        role: data.role as WorkspaceRole,
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  return {
    ...query,
    role: query.data?.role ?? null,
    workspaceId: query.data?.workspaceId ?? null,
    isWorkspaceAdmin: query.data?.role === 'owner' || query.data?.role === 'admin',
  }
}
