"use client"

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { getActiveWorkspaceId, getPrivateStorageUrl, workspaceStoragePath } from '@/lib/workspace'
import { assertUploadFile } from '@/lib/upload-policy'

export interface ProjectFileUploadResult {
  url: string
  path: string
}

export function useProjectOperations() {
  const queryClient = useQueryClient()

  const uploadProjectFile = async (file: File, projectId: string): Promise<ProjectFileUploadResult> => {
    assertUploadFile(file, 'document')
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const workspaceId = await getActiveWorkspaceId()
    const fileName = workspaceStoragePath(
      workspaceId,
      'projects',
      projectId,
      `${Date.now()}-${crypto.randomUUID()}.${fileExt}`
    )
    
    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    const signedUrl = await getPrivateStorageUrl('project-files', fileName, 900)

    return {
      url: signedUrl,
      path: fileName
    }
  }

  const updateProjectWithFile = async (projectId: string, filePath: string, fileName: string) => {
    const { error } = await supabase
      .from('projects')
      .update({ 
        attachment_url: filePath,
        attachment_name: fileName,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    if (error) {
      throw new Error(`Database update failed: ${error.message}`)
    }
  }

  const uploadProjectFilesMutation = useMutation({
    mutationFn: async ({ files, projectId }: { files: File[], projectId: string }) => {
      const results = []
      
      for (const file of files) {
        const uploadResult = await uploadProjectFile(file, projectId)
        await updateProjectWithFile(projectId, uploadResult.path, file.name)
        results.push(uploadResult)
      }
      
      return results
    },
    onSuccess: () => {
      // Instantly invalidate and refetch projects data
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project-files'] })
      toast.success('Files uploaded successfully!')
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`)
    }
  })

  const deleteProjectFileMutation = useMutation({
    mutationFn: async ({ projectId, filePath }: { projectId: string, filePath: string }) => {
      // Remove from storage
      const { error: storageError } = await supabase.storage
        .from('project-files')
        .remove([filePath])

      if (storageError) throw storageError

      // Update database to remove file reference
      const { error: dbError } = await supabase
        .from('projects')
        .update({ 
          attachment_url: null,
          attachment_name: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)

      if (dbError) throw dbError
    },
    onSuccess: () => {
      // Instantly invalidate and refetch projects data
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project-files'] })
      toast.success('File removed successfully')
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`)
    }
  })

  return {
    uploadProjectFiles: uploadProjectFilesMutation.mutate,
    deleteProjectFile: deleteProjectFileMutation.mutate,
    uploading: uploadProjectFilesMutation.isPending,
    deleting: deleteProjectFileMutation.isPending
  }
}
