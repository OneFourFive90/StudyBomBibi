import {
  uploadPdf as uploadPdfToStorage,
  uploadImage as uploadImageToStorage,
  uploadDocument as uploadDocumentToStorage,
  UploadResult,
} from '../firebaseStorage';
import { writeFileMetadataToFirestore } from '../firestore/writeFileMetadata';
import {
  getUploadFileKind,
  normalizeUploadMimeType,
  SUPPORTED_UPLOAD_TYPES_LABEL,
} from '@/lib/upload/fileTypePolicy';

function getDocumentMimeType(mimeType: string, fileName: string): string {
  const normalized = normalizeUploadMimeType(mimeType, fileName);
  return normalized || 'text/plain';
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
  const kind = getUploadFileKind(file.type, file.name);

  if (kind === 'pdf') {
    return uploadPdf(userId, file, extractedText);
  }

  if (kind === 'image') {
    return uploadImage(userId, file, extractedText);
  }

  if (kind === 'document') {
    return uploadDocument(userId, file, extractedText);
  }

  throw new Error(`Unsupported file type: ${file.type || file.name}. Supported: ${SUPPORTED_UPLOAD_TYPES_LABEL}`);
}

// export async function uploadFiles(userId: string, files: File[]): Promise<UploadResult[]> {
//   return Promise.all(files.map((file) => uploadFile(userId, file)));
// }
