import { supabase } from '@/lib/supabase'

/**
 * uploadFile — the ONE function every page should call to upload a file.
 *
 * Sends the file to /api/upload (server route) which proxies it to Cloudinary
 * with resource_type:'auto', so PDFs / DOCX / PPTX / images all work.
 *
 * The Cloudinary API secret is never exposed to the browser.
 *
 * @param file   The File object selected by the user
 * @param folder Logical folder inside Cloudinary, e.g. "paper-proofs",
 *               "seed-fund/application", "seed-fund/ppt",
 *               "seed-fund/project-documents"
 * @returns      The Cloudinary secure_url of the uploaded file
 * @throws       An Error with a human-readable message on any failure
 */
export async function uploadFile(file: File, folder: string): Promise<string> {
  // Get current session token to authenticate the server route
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Session expired. Please log in again.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: formData,
  })

  if (!res.ok) {
    let message = 'Upload failed. Please try again.'
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      // ignore parse error — keep the default message
    }
    throw new Error(message)
  }

  const { url } = await res.json()
  if (!url) {
    throw new Error('Upload succeeded but no URL was returned.')
  }
  return url
}
