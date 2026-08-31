import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary from env vars (server-only)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export function getCloudinaryPublicId(url: string): { publicId: string; resourceType: string } | null {
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;

    const preUploadParts = parts[0].split('/');
    const resourceType = preUploadParts[preUploadParts.length - 1] || 'image';

    const postUpload = parts[1];
    const cleanPath = postUpload.replace(/^v\d+\//, '');

    let publicId = cleanPath;
    if (resourceType !== 'raw') {
      const lastDot = cleanPath.lastIndexOf('.');
      if (lastDot !== -1) {
        publicId = cleanPath.substring(0, lastDot);
      }
    }
    return { publicId, resourceType };
  } catch (e) {
    console.error('Failed to parse Cloudinary URL:', url, e);
    return null;
  }
}

export async function deleteCloudinaryFile(url: string): Promise<boolean> {
  const info = getCloudinaryPublicId(url);
  if (!info) return false;

  try {
    const result = await cloudinary.uploader.destroy(info.publicId, {
      resource_type: info.resourceType,
    });
    console.log(`Cloudinary delete result for ${info.publicId}:`, result);
    return result.result === 'ok';
  } catch (e) {
    console.error(`Failed to delete Cloudinary file: ${url}`, e);
    return false;
  }
}

export async function deleteCloudinaryFiles(urls: (string | null | undefined)[]): Promise<void> {
  const validUrls = urls.filter((u): u is string => typeof u === 'string' && u.length > 0);
  for (const url of validUrls) {
    await deleteCloudinaryFile(url);
  }
}
