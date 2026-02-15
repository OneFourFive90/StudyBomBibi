import {
  uploadPdf as uploadPdfToStorage,
  uploadImage as uploadImageToStorage,
  uploadDocument as uploadDocumentToStorage,
  uploadImages as uploadImagesToStorage,
  uploadDocuments as uploadDocumentsToStorage,
  UploadResult,
} from './firebaseStorage';
import { writeFileMetadataToFirestore } from './firestore/fileMetadata';

function getDocumentMimeType(mimeType: string, fileName: string): string {
  if (mimeType) return mimeType;
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'md' || ext === 'markdown') return 'text/markdown';
  return 'text/plain';
}

async function writeMetadataOrThrow(
  userId: string,
  file: File,
  result: UploadResult,
  mimeType: string
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
  });
}

export async function uploadPdf(userId: string, file: File): Promise<UploadResult> {
  const result = await uploadPdfToStorage(userId, file);
  await writeMetadataOrThrow(userId, file, result, 'application/pdf');
  return result;
}

export async function uploadImage(userId: string, file: File): Promise<UploadResult> {
  const result = await uploadImageToStorage(userId, file);
  await writeMetadataOrThrow(userId, file, result, file.type);
  return result;
}

export async function uploadDocument(userId: string, file: File): Promise<UploadResult> {
  const result = await uploadDocumentToStorage(userId, file);
  await writeMetadataOrThrow(userId, file, result, getDocumentMimeType(file.type, file.name));
  return result;
}

export async function uploadImages(
  userId: string,
  files: File[]
): Promise<UploadResult[]> {
  const results = await uploadImagesToStorage(userId, files);
  await Promise.all(
    results.map((result, index) =>
      writeMetadataOrThrow(userId, files[index], result, files[index].type)
    )
  );
  return results;
}

export async function uploadDocuments(
  userId: string,
  files: File[]
): Promise<UploadResult[]> {
  const results = await uploadDocumentsToStorage(userId, files);
  await Promise.all(
    results.map((result, index) =>
      writeMetadataOrThrow(
        userId,
        files[index],
        result,
        getDocumentMimeType(files[index].type, files[index].name)
      )
    )
  );
  return results;
}

export async function uploadFile(userId: string, file: File): Promise<UploadResult> {
  const fileExt = file.name.split('.').pop()?.toLowerCase();

  if (file.type === 'application/pdf' || fileExt === 'pdf') {
    return uploadPdf(userId, file);
  }

  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const imageExts = ['jpg', 'jpeg', 'png', 'webp'];
  if (imageTypes.includes(file.type) || imageExts.includes(fileExt || '')) {
    return uploadImage(userId, file);
  }

  const docTypes = ['text/plain', 'text/markdown', 'text/x-markdown'];
  const docExts = ['txt', 'md', 'markdown'];
  if (docTypes.includes(file.type) || docExts.includes(fileExt || '')) {
    return uploadDocument(userId, file);
  }

  throw new Error(
    `Unsupported file type: ${file.type || fileExt}. Supported: PDF, images (jpg, png, webp), documents (txt, md)`
  );
}

export async function uploadFiles(userId: string, files: File[]): Promise<UploadResult[]> {
  return Promise.all(files.map((file) => uploadFile(userId, file)));
}
