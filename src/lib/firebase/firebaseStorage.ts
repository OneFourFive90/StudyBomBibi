/*
Pure file storage operations with Firebase Storage

/users
  /{userId}
    /uploads
      /pdfs
        - {fileHash}.pdf  <-- Hash-based naming for deduplication
      /images
        - {fileHash}.{ext}  <-- Hash-based naming for deduplication
      /text
        - {fileHash}.{txt|md}  <-- Hash-based naming for deduplication
    /assets
      /thumbnails
        - {fileId}_thumb.jpg

*/
import { storage } from './firebase';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  UploadMetadata,
} from 'firebase/storage';
import {
  getUploadFileKind,
  normalizeUploadMimeType,
  SUPPORTED_UPLOAD_TYPES_LABEL,
} from '@/lib/upload/fileTypePolicy';

// ============================================
// Types
// ============================================

export interface UploadResult {
  url: string;
  path: string;
  fileName: string;
  hash?: string;
  alreadyExists?: boolean;
}

export interface StorageFile {
  name: string;
  path: string;
  url: string;
  createdAt?: string;
  size?: number;
}




// ============================================
// Path Builders (Centralized path management)
// ============================================

export const StoragePaths = {
  // Base paths
  userBase: (userId: string) => `users/${userId}`,
  
  // Upload paths
  uploads: (userId: string) => `users/${userId}/uploads`,
  pdfs: (userId: string) => `users/${userId}/uploads/pdfs`,
  images: (userId: string) => `users/${userId}/uploads/images`,
  text: (userId: string) => `users/${userId}/uploads/text`,
  
  // Asset paths
  assets: (userId: string) => `users/${userId}/assets`,
  thumbnails: (userId: string) => `users/${userId}/assets/thumbnails`,
  
  // Full file paths
  pdfFile: (userId: string, fileHash: string) => 
    `users/${userId}/uploads/pdfs/${fileHash}.pdf`,
  
  imageFile: (userId: string, fileHash: string, extension: string = 'jpg') => 
    `users/${userId}/uploads/images/${fileHash}.${extension}`,
  
  textFile: (userId: string, fileHash: string, extension: string) => 
    `users/${userId}/uploads/text/${fileHash}.${extension}`,
  
  thumbnailFile: (userId: string, fileId: string) => 
    `users/${userId}/assets/thumbnails/${fileId}_thumb.jpg`,
};

// ============================================
// Utility Functions
// ============================================

/**
 * Simple hash function (FNV-1a) for file content
 * Works in all browser contexts without crypto.subtle
 */
function fnv1aHash(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // Convert to unsigned 32-bit integer and then to hex
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Generate hash from file content
 * Uses crypto.subtle if available (secure context), falls back to FNV-1a
 */
export async function generateFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  
  // Try using crypto.subtle (only works in secure contexts - HTTPS/localhost)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fall through to fallback
    }
  }
  
  // Fallback: Use file metadata + partial content for hash
  const uint8Array = new Uint8Array(arrayBuffer);
  const sampleSize = Math.min(10000, uint8Array.length);
  
  // Sample from start, middle, and end of file
  let sample = '';
  for (let i = 0; i < sampleSize / 3; i++) {
    sample += String.fromCharCode(uint8Array[i] || 0);
  }
  const middle = Math.floor(uint8Array.length / 2);
  for (let i = 0; i < sampleSize / 3; i++) {
    sample += String.fromCharCode(uint8Array[middle + i] || 0);
  }
  for (let i = 0; i < sampleSize / 3; i++) {
    sample += String.fromCharCode(uint8Array[uint8Array.length - 1 - i] || 0);
  }
  
  // Combine file size and content sample for better uniqueness
  const hashInput = `${file.size}-${file.name}-${sample}`;
  const hash1 = fnv1aHash(hashInput);
  const hash2 = fnv1aHash(hashInput.split('').reverse().join(''));
  const hash3 = fnv1aHash(`${file.lastModified}-${hashInput}`);
  
  return `${hash1}${hash2}${hash3}`;
}

/**
 * Generate a short hash (first 12 characters)
 * Sufficient for uniqueness while keeping paths manageable
 */
export async function generateShortHash(file: File): Promise<string> {
  const fullHash = await generateFileHash(file);
  return fullHash.substring(0, 12);
}

/**
 * Check if a file already exists at the given path
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    const fileRef = ref(storage, path);
    await getMetadata(fileRef);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// PDF Upload Functions
// ============================================

/**
 * Upload a PDF file with hash-based naming to prevent duplicates
 * If file with same hash exists, returns existing file URL
 */
export async function uploadPdf(
  userId: string,
  file: File
): Promise<UploadResult> {
  // Validate file type
  if (file.type !== 'application/pdf') {
    throw new Error('Invalid file type. Only PDF files are allowed.');
  }

  // Generate hash for deduplication
  const fileHash = await generateShortHash(file);
  const filePath = StoragePaths.pdfFile(userId, fileHash);
  
  // Check if file already exists (deduplication)
  const exists = await fileExists(filePath);
  if (exists) {
    const fileRef = ref(storage, filePath);
    const url = await getDownloadURL(fileRef);
    return {
      url,
      path: filePath,
      fileName: `${fileHash}.pdf`,
      hash: fileHash,
      alreadyExists: true,
    };
  }

  // Upload new file
  const fileRef = ref(storage, filePath);
  const metadata: UploadMetadata = {
    contentType: 'application/pdf',
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
      hash: fileHash,
    },
  };

  await uploadBytes(fileRef, file, metadata);
  const url = await getDownloadURL(fileRef);

  return {
    url,
    path: filePath,
    fileName: `${fileHash}.pdf`,
    hash: fileHash,
    alreadyExists: false,
  };
}

// ============================================
// Image Upload Functions
// ============================================

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return mimeToExt[mimeType] || 'jpg';
}

/**
 * Upload an image with hash-based naming to prevent duplicates
 * If file with same hash exists, returns existing file URL
 */
export async function uploadImage(
  userId: string,
  file: File
): Promise<UploadResult> {
  // Validate file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, JPG, PNG, and WebP images are allowed.');
  }

  // Generate hash for deduplication
  const fileHash = await generateShortHash(file);
  const extension = getExtensionFromMimeType(file.type);
  const filePath = StoragePaths.imageFile(userId, fileHash, extension);

  // Check if file already exists (deduplication)
  const exists = await fileExists(filePath);
  if (exists) {
    const fileRef = ref(storage, filePath);
    const url = await getDownloadURL(fileRef);
    return {
      url,
      path: filePath,
      fileName: `${fileHash}.${extension}`,
      hash: fileHash,
      alreadyExists: true,
    };
  }

  // Upload new file
  const fileRef = ref(storage, filePath);
  const metadata: UploadMetadata = {
    contentType: file.type,
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
      hash: fileHash,
    },
  };

  await uploadBytes(fileRef, file, metadata);
  const url = await getDownloadURL(fileRef);

  return {
    url,
    path: filePath,
    fileName: `${fileHash}.${extension}`,
    hash: fileHash,
    alreadyExists: false,
  };
}

/**
 * Upload multiple images in batch
 * Duplicate files are automatically deduplicated by hash
 */
// export async function uploadImages(
//   userId: string,
//   files: File[]
// ): Promise<UploadResult[]> {
//   return Promise.all(files.map(file => uploadImage(userId, file)));
// }

// ============================================
// Document Upload Functions (.txt, .md)
// ============================================

/**
 * Get file extension from MIME type for documents (now supports csv)
 */
function getDocumentExtension(mimeType: string, fileName: string): string {
  // Check MIME type first
  const mimeToExt: Record<string, string> = {
    'text/plain': 'txt',
    'text/markdown': 'md',
    'text/x-markdown': 'md',
    'text/csv': 'csv',
  };
  
  if (mimeToExt[mimeType]) {
    return mimeToExt[mimeType];
  }

  const normalizedMimeType = normalizeUploadMimeType(mimeType, fileName);
  if (mimeToExt[normalizedMimeType]) {
    return mimeToExt[normalizedMimeType];
  }
  
  // Fallback: check file extension
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'md' || ext === 'markdown') return 'md';
  if (ext === 'txt') return 'txt';
  if (ext === 'csv') return 'csv';
  
  return 'txt'; // default
}

/**
 * Upload a document (.txt or .md) with hash-based naming to prevent duplicates
 * If file with same hash exists, returns existing file URL
 */
export async function uploadDocument(
  userId: string,
  file: File
): Promise<UploadResult> {
  // Validate file type
  if (getUploadFileKind(file.type, file.name) !== 'document') {
    throw new Error('Invalid file type. Only .txt, .md, and .csv files are allowed.');
  }

  // Generate hash for deduplication
  const fileHash = await generateShortHash(file);
  const extension = getDocumentExtension(file.type, file.name);
  const filePath = StoragePaths.textFile(userId, fileHash, extension);

  // Check if file already exists (deduplication)
  const exists = await fileExists(filePath);
  if (exists) {
    const fileRef = ref(storage, filePath);
    const url = await getDownloadURL(fileRef);
    return {
      url,
      path: filePath,
      fileName: `${fileHash}.${extension}`,
      hash: fileHash,
      alreadyExists: true,
    };
  }

  // Upload new file
  const fileRef = ref(storage, filePath);
  // Set correct contentType for csv
  let contentType = file.type;
  if (!contentType) {
    if (extension === 'csv') contentType = 'text/csv';
    else if (extension === 'md') contentType = 'text/markdown';
    else contentType = 'text/plain';
  }
  const metadata: UploadMetadata = {
    contentType,
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
      hash: fileHash,
    },
  };

  await uploadBytes(fileRef, file, metadata);
  const url = await getDownloadURL(fileRef);

  return {
    url,
    path: filePath,
    fileName: `${fileHash}.${extension}`,
    hash: fileHash,
    alreadyExists: false,
  };
}

/**
 * Upload multiple documents in batch
 * Duplicate files are automatically deduplicated by hash
 */
// export async function uploadDocuments(
//   userId: string,
//   files: File[]
// ): Promise<UploadResult[]> {
//   return Promise.all(files.map(file => uploadDocument(userId, file)));
// }

/**
 * List all documents for a user
 */
export async function listUserDocuments(userId: string): Promise<StorageFile[]> {
  const folderRef = ref(storage, StoragePaths.text(userId));
  const result = await listAll(folderRef);

  const files = await Promise.all(
    result.items.map(async (item) => {
      const url = await getDownloadURL(item);
      const metadata = await getMetadata(item);
      return {
        name: item.name,
        path: item.fullPath,
        url,
        createdAt: metadata.customMetadata?.uploadedAt,
        size: metadata.size,
      };
    })
  );

  return files;
}

// ============================================
// Generic Upload Function
// ============================================

/**
 * Upload any supported file type (auto-detects and routes to correct handler)
 */
export async function uploadFile(
  userId: string,
  file: File
): Promise<UploadResult> {
  const kind = getUploadFileKind(file.type, file.name);

  if (kind === 'pdf') {
    return uploadPdf(userId, file);
  }

  if (kind === 'image') {
    return uploadImage(userId, file);
  }

  if (kind === 'document') {
    return uploadDocument(userId, file);
  }

  throw new Error(`Unsupported file type: ${file.type || file.name}. Supported: ${SUPPORTED_UPLOAD_TYPES_LABEL}`);
}

/**
 * Upload multiple files of any supported type
 */
export async function uploadFiles(
  userId: string,
  files: File[]
): Promise<UploadResult[]> {
  return Promise.all(files.map(file => uploadFile(userId, file)));
}

// ============================================
// Thumbnail Functions
// ============================================

/**
 * Upload a thumbnail for a file
 */
export async function uploadThumbnail(
  userId: string,
  fileId: string,
  thumbnailBlob: Blob
): Promise<UploadResult> {
  const filePath = StoragePaths.thumbnailFile(userId, fileId);
  const fileRef = ref(storage, filePath);

  const metadata: UploadMetadata = {
    contentType: 'image/jpeg',
    customMetadata: {
      fileId,
      createdAt: new Date().toISOString(),
      type: 'thumbnail',
    },
  };

  await uploadBytes(fileRef, thumbnailBlob, metadata);
  const url = await getDownloadURL(fileRef);

  return {
    url,
    path: filePath,
    fileName: `${fileId}_thumb.jpg`,
  };
}

/**
 * Generate thumbnail from image file (client-side)
 */
export async function generateThumbnail(
  file: File,
  maxWidth: number = 200,
  maxHeight: number = 200,
  quality: number = 0.7
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate new dimensions
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

// ============================================
// File Management Functions
// ============================================

/**
 * List all PDFs for a user
 */
export async function listUserPdfs(userId: string): Promise<StorageFile[]> {
  const folderRef = ref(storage, StoragePaths.pdfs(userId));
  const result = await listAll(folderRef);

  const files = await Promise.all(
    result.items.map(async (item) => {
      const url = await getDownloadURL(item);
      const metadata = await getMetadata(item);
      return {
        name: item.name,
        path: item.fullPath,
        url,
        createdAt: metadata.customMetadata?.uploadedAt,
        size: metadata.size,
      };
    })
  );

  return files;
}

/**
 * List all images for a user
 */
export async function listUserImages(userId: string): Promise<StorageFile[]> {
  const folderRef = ref(storage, StoragePaths.images(userId));
  const result = await listAll(folderRef);

  const files = await Promise.all(
    result.items.map(async (item) => {
      const url = await getDownloadURL(item);
      const metadata = await getMetadata(item);
      return {
        name: item.name,
        path: item.fullPath,
        url,
        createdAt: metadata.customMetadata?.uploadedAt,
        size: metadata.size,
      };
    })
  );

  return files;
}

/**
 * Delete a file by path
 */
export async function deleteFile(filePath: string): Promise<void> {
  const fileRef = ref(storage, filePath);
  await deleteObject(fileRef);
}

// ============================================
// Storage Statistics
// ============================================

/**
 * Get storage usage statistics for a user
 */
export async function getUserStorageStats(userId: string): Promise<{
  totalFiles: number;
  totalSize: number;
  pdfCount: number;
  imageCount: number;
  documentCount: number;
  thumbnailCount: number;
}> {
  const [pdfs, images, textFiles, thumbnails] = await Promise.all([
    listUserPdfs(userId).catch(() => []),
    listUserImages(userId).catch(() => []),
    listUserDocuments(userId).catch(() => []),
    listAll(ref(storage, StoragePaths.thumbnails(userId)))
      .then((r) => r.items)
      .catch(() => []),
  ]);

  const pdfSize = pdfs.reduce((acc, f) => acc + (f.size || 0), 0);
  const imageSize = images.reduce((acc, f) => acc + (f.size || 0), 0);
  const textSize = textFiles.reduce((acc, f) => acc + (f.size || 0), 0);

  return {
    totalFiles: pdfs.length + images.length + textFiles.length + thumbnails.length,
    totalSize: pdfSize + imageSize + textSize,
    pdfCount: pdfs.length,
    imageCount: images.length,
    documentCount: textFiles.length,
    thumbnailCount: thumbnails.length,
  };
}
