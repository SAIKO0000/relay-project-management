export type UploadKind = 'document' | 'photo' | 'avatar'

type UploadPolicy = {
  label: string
  maxBytes: number
  mimeTypesByExtension: Record<string, readonly string[]>
}

const formatMegabytes = (bytes: number) => {
  const megabytes = bytes / 1024 / 1024
  const rounded = Math.ceil((megabytes - Number.EPSILON) * 100) / 100
  return `${rounded} MB`
}

const allowedExtensionsLabel = (policy: UploadPolicy) =>
  Object.keys(policy.mimeTypesByExtension)
    .map(extension => extension.toUpperCase())
    .join(', ')

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

export function uploadPolicySummary(kind: UploadKind) {
  const policy = uploadPolicies[kind]
  return `${allowedExtensionsLabel(policy)} · Maximum ${formatMegabytes(policy.maxBytes)}`
}

export function validateUploadFile(file: File, kind: UploadKind): string | null {
  const policy = uploadPolicies[kind]
  const extension = getFileExtension(file.name)
  const allowedMimeTypes = policy.mimeTypesByExtension[extension]

  if (!allowedMimeTypes) {
    const detectedExtension = extension ? `.${extension}` : 'no file extension'
    return `${file.name}: ${detectedExtension} is not supported. Choose ${allowedExtensionsLabel(policy)}.`
  }

  if (!file.type || !allowedMimeTypes.includes(file.type)) {
    const detectedType = file.type || 'an unknown browser file type'
    return `${file.name}: the browser reported ${detectedType}, which does not match .${extension}. Try exporting the original as ${allowedExtensionsLabel(policy)}.`
  }

  if (file.size <= 0) {
    return `${file.name}: the file is empty. Choose a complete image file.`
  }

  if (file.size > policy.maxBytes) {
    return `${file.name} is ${formatMegabytes(file.size)}. The maximum ${policy.label} size is ${formatMegabytes(policy.maxBytes)}.`
  }

  return null
}

export function assertUploadFile(file: File, kind: UploadKind) {
  const error = validateUploadFile(file, kind)
  if (error) throw new Error(error)
}
