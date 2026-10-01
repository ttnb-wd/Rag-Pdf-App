import type { Document, DocumentStats } from './types';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, index);
  
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (seconds < 172800) return 'Yesterday';
  if (seconds < 604800) {
    const days = Math.floor(seconds / 86400);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function calculateDocumentStats(documents: Document[]): DocumentStats {
  return documents.reduce<DocumentStats>(
    (stats, doc) => {
      stats.total++;
      if (doc.status === 'ready') stats.ready++;
      else if (doc.status === 'processing') stats.processing++;
      else if (doc.status === 'failed') stats.failed++;
      return stats;
    },
    { total: 0, ready: 0, processing: 0, failed: 0 }
  );
}

export function getFileTypeFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  if (!ext) return 'unknown';
  
  const typeMap: Record<string, string> = {
    pdf: 'PDF',
    docx: 'DOCX',
    txt: 'TXT',
    md: 'MD',
    markdown: 'MD',
  };
  
  return typeMap[ext] || ext.toUpperCase();
}

export function filterDocuments(
  documents: Document[],
  search: string,
  statusFilter: string,
  fileTypeFilter: string
): Document[] {
  return documents.filter(doc => {
    const matchesSearch = !search || 
      doc.name.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      doc.status === statusFilter;
    
    const matchesFileType = fileTypeFilter === 'all' || 
      doc.fileType.toLowerCase() === fileTypeFilter.toLowerCase();
    
    return matchesSearch && matchesStatus && matchesFileType;
  });
}
