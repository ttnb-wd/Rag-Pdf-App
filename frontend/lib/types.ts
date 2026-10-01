export type DocumentStatus = 'ready' | 'processing' | 'failed';

export interface Document {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  chunksCount: number;
  status: DocumentStatus;
  uploadedAt: string;
}

export interface DocumentStats {
  total: number;
  ready: number;
  processing: number;
  failed: number;
}

export type FileTypeFilter = 'all' | 'pdf' | 'docx' | 'txt' | 'md';
export type StatusFilter = 'all' | 'ready' | 'processing' | 'failed';
