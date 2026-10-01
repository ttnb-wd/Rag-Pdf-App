import type { Document } from './types';

const API_BASE = 'http://localhost:5000/api';

export async function getDocuments(): Promise<Document[]> {
  const response = await fetch(`${API_BASE}/documents`);
  
  if (!response.ok) {
    throw new Error('Failed to load documents');
  }
  
  const data = await response.json();
  return data.documents || [];
}

export async function uploadDocument(file: File): Promise<{ documents: Document[]; message: string }> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data?.message || 'Upload failed');
  }
  
  return {
    documents: data.documents || [],
    message: data.message || 'Document uploaded successfully',
  };
}

export const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.markdown'] as const;
export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
] as const;

export function isSupportedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const hasValidExtension = SUPPORTED_EXTENSIONS.some(ext => name.endsWith(ext));
  const hasValidMimeType = SUPPORTED_MIME_TYPES.includes(file.type as typeof SUPPORTED_MIME_TYPES[number]);
  
  return hasValidExtension || hasValidMimeType;
}
