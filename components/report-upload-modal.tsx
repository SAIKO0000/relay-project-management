"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Upload, X, FileText, FolderOpen, Tag, Clock, FileType, File, FileSpreadsheet, FileImage, Archive, Layers, Video, Music, FileCode, User } from "lucide-react"
import { useReports } from "@/lib/hooks/useReports"
import { useProjects } from "@/lib/hooks/useProjects"
import { usePersonnel } from "@/lib/hooks/usePersonnel"
import { useAuth } from "@/lib/auth"
import { toast } from "react-hot-toast"
import { useModalMobileHide } from "@/lib/modal-mobile-utils"
import { uploadAccept, validateUploadFile } from "@/lib/upload-policy"

interface ReportUploadModalProps {
  readonly children?: React.ReactNode
  readonly onUploadComplete?: () => void
  readonly preselectedProjectId?: string
  readonly replacingReportId?: string
}

export function ReportUploadModal({ children, onUploadComplete, preselectedProjectId, replacingReportId }: ReportUploadModalProps) {
  const [open, setOpen] = useState(false)
  
  // Hide mobile header when modal is open
  useModalMobileHide(open)
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [projectId, setProjectId] = useState(preselectedProjectId || "")
  const [category, setCategory] = useState("")
  const [status, setStatus] = useState("pending")
  const [description, setDescription] = useState("")
  const [assignedReviewer, setAssignedReviewer] = useState("")

  const { uploadReport, uploading, uploadProgress, replaceReport } = useReports()
  const { projects } = useProjects()
  const { personnel } = usePersonnel()
  const { user } = useAuth()

  // Get authorized reviewers (excluding current user to prevent self-approval)
  const authorizedReviewers = personnel.filter(person => 
    ["Project Manager", "Senior Electrical Engineer", "Field Engineer", "Design Engineer"].includes(person.position || "") &&
    person.email !== user?.email // Exclude self from reviewers
  )

  const categories = [
    "Progress Report",
    "Safety Report", 
    "Completion Report",
    "Site Photos",
    "Technical Drawing",
    "Material List",
    "Inspection Report",
    "Quality Report",
    "Financial Report",
    "Other"
  ]

  const statuses = [
    { value: "pending", label: "Pending Review" }
    // Removed self-approval options - only reviewers can approve/reject via other interface
  ]
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files?.[0]) {
      const validationError = validateUploadFile(files[0], 'document')
      if (validationError) {
        toast.error(validationError)
        event.target.value = ''
        return
      }
      setSelectedFile(files[0])
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile) {
      toast.error("Please select a file to upload")
      return
    }

    if (!title.trim()) {
      toast.error("Please enter a title for the report")
      return
    }

    if (!replacingReportId && !projectId) {
      toast.error("Please select a project")
      return
    }

    if (!category) {
      toast.error("Please select a category")
      return
    }

    if (!assignedReviewer) {
      toast.error("Please assign a reviewer for this document")
      return
    }

    try {
      if (replacingReportId) {
        // Replace existing report
        await replaceReport(replacingReportId, selectedFile, category, status, description, title)
        toast.success("Report replaced successfully!")
      } else {
        // Upload new report with single reviewer
        await uploadReport(selectedFile, projectId, category, status, description, assignedReviewer, title)
        // Success toast is handled by the hook
      }
      
      // Reset form
      setSelectedFile(null)
      setTitle("")
      setProjectId(preselectedProjectId || "")
      setCategory("")
      setStatus("pending") // Always reset to pending
      setDescription("")
      setAssignedReviewer("")
      setOpen(false)
      
      if (onUploadComplete) {
        onUploadComplete()
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast.error(replacingReportId ? "Failed to replace report" : "Failed to upload report")
    }
  }

  const getFileIcon = (file: File) => {
    const fileType = file.type.toLowerCase()
    const fileName = file.name.toLowerCase()
    const extension = fileName.split('.').pop() || ''
    
    // Document files
    if (fileType.includes('pdf') || extension === 'pdf') {
      return (
        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
          <FileText className="h-5 w-5 text-red-600" />
        </div>
      )
    }
    if (fileType.includes('word') || fileType.includes('doc') || ['doc', 'docx'].includes(extension)) {
      return (
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <FileText className="h-5 w-5 text-blue-600" />
        </div>
      )
    }
    if (fileType.includes('text') || extension === 'txt') {
      return (
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
          <FileType className="h-5 w-5 text-gray-600" />
        </div>
      )
    }
    
    // Spreadsheet files
    if (fileType.includes('excel') || fileType.includes('sheet') || ['xlsx', 'xls', 'csv'].includes(extension)) {
      return (
        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
          <FileSpreadsheet className="h-5 w-5 text-green-600" />
        </div>
      )
    }
    
    // Image files
    if (fileType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
      return (
        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
          <FileImage className="h-5 w-5 text-purple-600" />
        </div>
      )
    }
    
    // Archive files
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
      return (
        <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
          <Archive className="h-5 w-5 text-yellow-600" />
        </div>
      )
    }
    
    // CAD/Technical files
    if (['dwg', 'dxf', 'cad'].includes(extension)) {
      return (
        <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
          <Layers className="h-5 w-5 text-cyan-600" />
        </div>
      )
    }
    
    // Video files
    if (fileType.includes('video') || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) {
      return (
        <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
          <Video className="h-5 w-5 text-pink-600" />
        </div>
      )
    }
    
    // Audio files
    if (fileType.includes('audio') || ['mp3', 'wav', 'flac', 'aac'].includes(extension)) {
      return (
        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
          <Music className="h-5 w-5 text-indigo-600" />
        </div>
      )
    }
    
    // Code files
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py', 'java', 'cpp', 'c'].includes(extension)) {
      return (
        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
          <FileCode className="h-5 w-5 text-orange-600" />
        </div>
      )
    }
    
    // Default file icon
    return (
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
        <File className="h-5 w-5 text-gray-500" />
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (nextOpen) setStatus("pending")
      setOpen(nextOpen)
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        )}
      </DialogTrigger>      <DialogContent className="sm:max-w-[500px] max-w-[95vw] w-[95vw] sm:w-auto max-h-[85vh] sm:max-h-[80vh] overflow-y-auto bg-white/95 backdrop-blur-sm border border-gray-200/50 shadow-2xl rounded-xl">
        <DialogHeader className="space-y-1 sm:space-y-2 p-2 sm:p-3 border-b border-gray-100">
          <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 flex flex-col sm:flex-row items-center sm:items-start">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-2 sm:mb-0 sm:mr-3 shadow-lg">
              <Upload className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
            </div>
            <div className="text-center sm:text-left">
              <span className="block">{replacingReportId ? "Replace Document" : "Upload Document"}</span>
              <span className="text-xs font-normal text-gray-600 block">
                {replacingReportId ? "Replace the existing document with a new version" : "Upload a new document or report to the project"}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3 p-2 sm:p-3">          <div className="grid grid-cols-1 gap-2 sm:gap-3">
            {/* File Upload */}
            <div className="space-y-1 sm:space-y-2">
              <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-orange-500" />
                Document File *
              </Label>
              {!selectedFile ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-8 text-center hover:border-orange-400 hover:bg-orange-50/30 transition-all duration-200 cursor-pointer">
                  <Input
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    accept={uploadAccept('document')}
                  />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-4 rounded-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                      <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
                    </div>
                    <p className="text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">Choose a file to upload</p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      Supports PDF, DOCX, TXT, JPEG, PNG, and WebP files up to 5 MB
                    </p>
                  </Label>
                </div>
              ) : (
                <div className="p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                  <div className="flex items-start space-x-2 sm:space-x-4">
                    {getFileIcon(selectedFile)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base font-semibold text-gray-900 break-words">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {formatFileSize(selectedFile.size)} • Ready to upload
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="p-1 sm:p-2 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Title Field */}
            <div className="space-y-1 sm:space-y-2">
              <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-orange-500" />
                Report Title *
              </Label>
              <div className="relative">
                <FileText className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a descriptive title for this report"
                  className="pl-7 sm:pl-10 h-8 sm:h-10 bg-white/80 border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 rounded-lg text-xs sm:text-sm"
                  required
                />
              </div>
              {selectedFile && (
                <p className="text-xs sm:text-sm text-gray-500 bg-gray-50 p-2 sm:p-3 rounded-lg border">
                  <span className="font-medium">File:</span> <span className="break-all">{selectedFile.name}</span>
                </p>
              )}
            </div>

            {/* Project and Category in one row */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {/* Project Selection - Hidden when replacing */}
              {!replacingReportId ? (
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center">
                    <FolderOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-orange-500" />
                    Project *
                  </Label>
                  <div className="relative">
                    <FolderOpen className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                    <Select value={projectId} onValueChange={setProjectId}>
                      <SelectTrigger className="w-full pl-7 sm:pl-10 h-8 sm:h-10 bg-white/80 border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 rounded-lg text-xs sm:text-sm">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div></div>
              )}

              {/* Category Selection */}
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center">
                  <Tag className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-orange-500" />
                  Category *
                </Label>
                <div className="relative">
                  <Tag className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full pl-7 sm:pl-10 h-8 sm:h-10 bg-white/80 border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 rounded-lg text-xs sm:text-sm">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Status and Assigned Reviewer in one row */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {/* Status Selection */}
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-orange-500" />
                  Status *
                </Label>
                <div className="relative">
                  <Clock className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                  <Select value={status} onValueChange={setStatus} disabled={true}>
                    <SelectTrigger className="w-full pl-7 sm:pl-10 h-8 sm:h-10 bg-white/80 border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 rounded-lg text-xs sm:text-sm">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((stat) => (
                        <SelectItem key={stat.value} value={stat.value}>
                          {stat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assigned Reviewer */}
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center">
                  <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-orange-500" />
                  Reviewer *
                </Label>
                <Select value={assignedReviewer} onValueChange={setAssignedReviewer}>
                  <SelectTrigger className="h-8 sm:h-10 bg-white/80 border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 rounded-lg text-xs sm:text-sm">
                    <SelectValue placeholder="Select a reviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    {authorizedReviewers.map((reviewer) => (
                      <SelectItem key={reviewer.id} value={reviewer.id}>
                        {reviewer.name} ({reviewer.position || 'No position'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1 sm:space-y-2">
            <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center">
              <FileType className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-orange-500" />
              Description (Optional)
            </Label>
            <div className="relative">
              <FileType className="absolute left-2 sm:left-3 top-2 sm:top-3 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description or notes..."
                rows={2}
                className="pl-7 sm:pl-10 pt-2 sm:pt-3 bg-white/80 border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 rounded-lg text-gray-900 placeholder:text-gray-500 resize-none text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span>Uploading...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Form Actions - Smaller on mobile */}
          <div className="flex flex-row justify-end gap-2 pt-2 sm:pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={uploading}
              className="h-8 sm:h-10 px-3 sm:px-4 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={uploading || !selectedFile}
              className="h-8 sm:h-10 px-4 sm:px-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 text-xs sm:text-sm"
            >
              {uploading ? (
                <>
                  <Upload className="mr-1 h-3 w-3 sm:h-4 sm:w-4 animate-pulse" />
                  <span>{replacingReportId ? "Replacing..." : "Uploading..."}</span>
                </>
              ) : (
                <>
                  <Upload className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                  <span>{replacingReportId ? "Replace Document" : "Upload Document"}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
