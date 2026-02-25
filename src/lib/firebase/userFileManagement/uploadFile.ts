import {
  uploadPdf as uploadPdfToStorage,
  uploadImage as uploadImageToStorage,
  uploadDocument as uploadDocumentToStorage,
  UploadResult,
} from '../firebaseStorage';
import { writeFileMetadataToFirestore } from '../firestore/writeFileMetadata';

function getDocumentMimeType(mimeType: string, fileName: string): string {
  if (mimeType) return mimeType;
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'md' || ext === 'markdown') return 'text/markdown';
  if (ext === 'csv') return 'text/csv';
  return 'text/plain';
}

async function writeMetadataOrThrow(
  userId: string,
  file: File,
  result: UploadResult,
  mimeType: string,
  extractedText: string
): Promise<void> {
  if (!result.hash) {
    throw new Error('Upload result missing file hash for metadata write.');
  }

  await writeFileMetadataToFirestore({
    userId,
    file,
    fileHash: result.hash,
    storagePath: result.path,
    downloadURL: result.url,
    mimeType,
    extractedText,
  });
}

export async function uploadPdf(userId: string, file: File, extractedText: string): Promise<UploadResult> {
  const result = await uploadPdfToStorage(userId, file);
  await writeMetadataOrThrow(userId, file, result, 'application/pdf', extractedText);
  return result;
}

export async function uploadImage(userId: string, file: File, extractedText: string): Promise<UploadResult> {
  const result = await uploadImageToStorage(userId, file);
  await writeMetadataOrThrow(userId, file, result, file.type, extractedText);
  return result;
}

export async function uploadDocument(userId: string, file: File, extractedText: string): Promise<UploadResult> {
  const result = await uploadDocumentToStorage(userId, file);
  await writeMetadataOrThrow(userId, file, result, getDocumentMimeType(file.type, file.name), extractedText);
  return result;
}

export async function uploadFile(userId: string, file: File, extractedText: string): Promise<UploadResult> {
  const fileExt = file.name.split('.').pop()?.toLowerCase();

  if (file.type === 'application/pdf' || fileExt === 'pdf') {
    return uploadPdf(userId, file, extractedText);
  }

  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const imageExts = ['jpg', 'jpeg', 'png', 'webp'];
  if (imageTypes.includes(file.type) || imageExts.includes(fileExt || '')) {
    return uploadImage(userId, file, extractedText);
  }

  const docTypes = ['text/plain', 'text/markdown', 'text/x-markdown', 'text/csv'];
  const docExts = ['txt', 'md', 'markdown', 'csv'];
  if (docTypes.includes(file.type) || docExts.includes(fileExt || '')) {
    return uploadDocument(userId, file, extractedText);
  }

  throw new Error(
    `Unsupported file type: ${file.type || fileExt}. Supported: PDF, images (jpg, png, webp), documents (txt, md, csv)`
  );
}

// export async function uploadFiles(userId: string, files: File[]): Promise<UploadResult[]> {
//   return Promise.all(files.map((file) => uploadFile(userId, file)));
// }
