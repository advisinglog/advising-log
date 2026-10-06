// ============================================================
// Cloudinary Media & Document Upload Service
// ============================================================

export interface CloudinaryUploadResult {
  publicId: string
  secureUrl: string
  format: string
  bytes: number
  originalFilename: string
  isSimulated?: boolean
}

export interface CloudinaryUploadOptions {
  studentCode?: string
  logId?: string
  folder?: string
}

// Permitted document & image file extensions
const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'doc', 'docx']
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

/**
 * Upload a document or image file directly to Cloudinary.
 * Follows AGENTS.md rules:
 * - Tags Cloudinary assets with student_code and log_id only (no PII in metadata)
 * - Validates file types and sizes
 * - Graceful fallback simulation if Cloudinary environment variables are pending setup
 */
export async function uploadFileToCloudinary(
  file: File,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || ''
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || ''

  // 1. File Validation
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    throw new Error(`Invalid file type (.${extension}). Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}`)
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds 10 MB limit.`)
  }

  // 2. If Cloudinary credentials are missing, provide a safe simulated upload
  if (!cloudName || !uploadPreset || cloudName.includes('your_cloud_name')) {
    const mockPublicId = `advising_docs/${options.studentCode || 'std'}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    return {
      publicId: mockPublicId,
      secureUrl: URL.createObjectURL(file),
      format: extension,
      bytes: file.size,
      originalFilename: file.name,
      isSimulated: true,
    }
  }

  // 3. Build Multipart FormData for Cloudinary API
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)

  if (options.folder) {
    formData.append('folder', options.folder)
  }

  // Tag with student_code and log_id only (strictly no PII per security rule)
  const tags: string[] = ['advising_doc']
  if (options.studentCode) tags.push(`student_${options.studentCode}`)
  if (options.logId) tags.push(`log_${options.logId}`)
  formData.append('tags', tags.join(','))

  // 4. Send request to Cloudinary API
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`
  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMsg = errorData?.error?.message || response.statusText || 'Failed to upload to Cloudinary'
    throw new Error(`Cloudinary Upload Error: ${errorMsg}`)
  }

  const data = await response.json()

  return {
    publicId: data.public_id,
    secureUrl: data.secure_url,
    format: data.format || extension,
    bytes: data.bytes || file.size,
    originalFilename: data.original_filename || file.name,
    isSimulated: false,
  }
}

/**
 * Helper to get a secure view URL for a Cloudinary public_id
 */
export function getCloudinaryViewUrl(publicId: string, cloudName?: string): string {
  const cName = cloudName || import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || ''
  if (!cName || publicId.startsWith('blob:') || publicId.startsWith('http')) {
    return publicId
  }
  return `https://res.cloudinary.com/${cName}/image/upload/${publicId}`
}

/**
 * Helper to get a direct attachment download URL for a Cloudinary URL or public_id.
 * Attaches the fl_attachment transformation so Cloudinary sends the proper
 * Content-Disposition: attachment; filename="..." header with the original extension.
 */
export function getCloudinaryDownloadUrl(urlOrPublicId: string, cloudName?: string): string {
  if (!urlOrPublicId) return ''
  let fullUrl = urlOrPublicId
  if (!fullUrl.startsWith('http') && !fullUrl.startsWith('blob:')) {
    fullUrl = getCloudinaryViewUrl(urlOrPublicId, cloudName)
  }
  if (!fullUrl.includes('res.cloudinary.com')) return fullUrl
  if (fullUrl.includes('/fl_attachment/')) return fullUrl

  if (fullUrl.includes('/image/upload/')) {
    return fullUrl.replace('/image/upload/', '/image/upload/fl_attachment/')
  }
  if (fullUrl.includes('/raw/upload/')) {
    return fullUrl.replace('/raw/upload/', '/raw/upload/fl_attachment/')
  }
  if (fullUrl.includes('/auto/upload/')) {
    return fullUrl.replace('/auto/upload/', '/auto/upload/fl_attachment/')
  }
  return fullUrl
}

