"use client"

import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, File, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProjectOperations } from '@/lib/hooks/useProjectOperations'
import { toast } from 'react-hot-toast'
import { uploadAccept, uploadPolicies, validateUploadFile } from '@/lib/upload-policy'

interface ProjectFileUploadProps {
  projectId: string
  maxFiles?: number
  maxFileSize?: number
  accept?: string
  className?: string
}

const SUPPORTED_FILE_TYPES = uploadAccept('document').split(',')

export function ProjectFileUpload({ 
  projectId, 
  maxFiles = 5, 
  maxFileSize = uploadPolicies.document.maxBytes,
  accept = SUPPORTED_FILE_TYPES.join(','),
  className 
}: ProjectFileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { uploadProjectFiles, uploading } = useProjectOperations()

  const validateFile = (file: File): boolean => {
    const policyError = validateUploadFile(file, 'document')
    if (policyError) {
      toast.error(policyError)
      return false
    }

    if (file.size > maxFileSize) {
      toast.error(`File ${file.name} is too large. Max size is ${Math.round(maxFileSize / 1024 / 1024)}MB`)
      return false
    }

    return true
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) return

    const validFiles = Array.from(files).filter(validateFile)
    
    if (selectedFiles.length + validFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`)
      return
    }

    setSelectedFiles(prev => [...prev, ...validFiles])
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleFiles(e.dataTransfer.files)
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select files to upload')
      return
    }

    try {
      await uploadProjectFiles({ files: selectedFiles, projectId })
      setSelectedFiles([])
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Upload error:', error)
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <Card 
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400",
          uploading && "opacity-50 pointer-events-none"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Upload className="h-10 w-10 text-gray-400 mb-4" />
          <p className="text-sm text-gray-600 mb-2">
            Drag and drop files here, or click to select
          </p>
          <p className="text-xs text-gray-500">
            Support for {SUPPORTED_FILE_TYPES.join(', ')}
          </p>
          <p className="text-xs text-gray-500">
            Max {maxFiles} files, {Math.round(maxFileSize / 1024 / 1024)}MB each
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading}
          />
        </CardContent>
      </Card>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Selected Files:</h4>
          {selectedFiles.map((file, index) => (
            <div key={index} className="p-2 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2 flex-1 min-w-0">
                  <File className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm block break-words">{file.name}</span>
                    <span className="text-xs text-gray-500 block">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}
                  disabled={uploading}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {selectedFiles.length > 0 && (
        <Button 
          onClick={handleUpload} 
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            `Upload ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`
          )}
        </Button>
      )}
    </div>
  )
}
