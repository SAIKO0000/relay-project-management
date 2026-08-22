export type UploadKind = 'document' | 'photo' | 'avatar'

type UploadPolicy = {
  label: string
  maxBytes: number
  mimeTypesByExtension: Record<string, readonly string[]>
}

const imageMimeTypes = {
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
} as const

export const uploadPolicies: Record<UploadKind, UploadPolicy> = {
  document: {
    label: 'document',
    maxBytes: 5 * 1024 * 1024,
    mimeTypesByExtension: {
      pdf: ['application/pdf'],
      docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      txt: ['text/plain'],
      ...imageMimeTypes,
    },
  },
  photo: {
    label: 'image',
    maxBytes: 3 * 1024 * 1024,
    mimeTypesByExtension: imageMimeTypes,
  },
  avatar: {
    label: 'profile image',
    maxBytes: 2 * 1024 * 1024,
    mimeTypesByExtension: imageMimeTypes,
  },
}

export function getFileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

export function uploadAccept(kind: UploadKind) {
  return Object.keys(uploadPolicies[kind].mimeTypesByExtension)
    .map(extension => `.${extension}`)
    .join(',')
}

export function validateUploadFile(file: File, kind: UploadKind): string | null {
  const policy = uploadPolicies[kind]
  const extension = getFileExtension(file.name)
  const allowedMimeTypes = policy.mimeTypesByExtension[extension]

  if (!allowedMimeTypes) {
    return `${file.name} is not an allowed ${policy.label} type.`
  }

  if (!file.type || !allowedMimeTypes.includes(file.type)) {
    return `${file.name} has a file type that does not match its extension.`
  }

  if (file.size <= 0) {
    return `${file.name} is empty.`
  }

  if (file.size > policy.maxBytes) {
    return `${file.name} exceeds the ${Math.round(policy.maxBytes / 1024 / 1024)} MB limit.`
  }

  return null
}

export function assertUploadFile(file: File, kind: UploadKind) {
  const error = validateUploadFile(file, kind)
  if (error) throw new Error(error)
}
