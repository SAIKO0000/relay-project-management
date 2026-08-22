import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { queryKeys } from '@/lib/supabase-query'
import { withAuthErrorHandling } from '@/lib/auth-utils'
import { toast } from 'react-hot-toast'

export type Task = Database['public']['Tables']['tasks']['Row']

export function useTasks() {
  const queryClient = useQueryClient()

  // Main tasks query with aggressive caching
  const query = useQuery({
    queryKey: queryKeys.tasks(),
    queryFn: async () => {
      return withAuthErrorHandling(async () => {
        const { data, error } = await supabase
          .from('tasks')
          .select(`
            *,
            project:projects(id, name),
            assignee:personnel(id, name)
          `)
          .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
      }, [])
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - tasks change more frequently
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      return withAuthErrorHandling(async () => {
        const { data, error } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', id)
          .select(`
            *,
            project:projects(id, name),
            assignee:personnel(id, name)
          `)
          .single()

        if (error) throw error
        return data
      }, undefined)
    },
    onSuccess: (updatedTask) => {
      // Update cache with the updated task
      queryClient.setQueryData(queryKeys.tasks(), (old: Task[] | undefined) =>
        old ? old.map(t => t.id === updatedTask.id ? updatedTask : t) : [updatedTask]
      )
      toast.success('Task updated successfully')
    },
    onError: (error) => {
      console.error('Update task error:', error)
      toast.error('Failed to update task')
    }
  })

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return withAuthErrorHandling(async () => {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId)

        if (error) throw error
        return taskId
      }, undefined)
    },
    onSuccess: (deletedId) => {
      // Update cache by removing the deleted task
      queryClient.setQueryData(queryKeys.tasks(), (old: Task[] | undefined) =>
        old ? old.filter(t => t.id !== deletedId) : []
      )
      toast.success('Task deleted successfully')
    },
    onError: (error) => {
      console.error('Delete task error:', error)
      toast.error('Failed to delete task')
    }
  })

  return {
    tasks: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
    updateTask: updateTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending
  }
}
