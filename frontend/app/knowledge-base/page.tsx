'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, RefreshCw, CheckCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDocuments, uploadDocument, isSupportedFile } from '@/lib/api';
import { calculateDocumentStats, filterDocuments } from '@/lib/utils';
import type { Document, StatusFilter, FileTypeFilter } from '@/lib/types';
import { UploadZone } from '@/components/knowledge-base/upload-zone';
import { KnowledgeStats } from '@/components/knowledge-base/knowledge-stats';
import { DocumentFilters } from '@/components/knowledge-base/document-filters';
import { DocumentList } from '@/components/knowledge-base/document-list';

type ToastType = 'success' | 'error';

interface Toast {
  message: string;
  type: ToastType;
}

export default function KnowledgeBasePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilter>('all');

  // Load documents function
  const loadDocuments = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    let mounted = true;

    getDocuments()
      .then((docs) => {
        if (mounted) {
          setDocuments(docs);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load documents:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load documents');
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Handle file upload
  const handleUpload = async (file: File) => {
    if (!isSupportedFile(file)) {
      setToast({
        message: 'Unsupported file type. Please upload PDF, DOCX, TXT, or MD files.',
        type: 'error',
      });
      return;
    }

    setUploading(true);
    setToast(null);

    try {
      const result = await uploadDocument(file);
      setDocuments(result.documents);
      
      setToast({
        message: result.message || `${file.name} uploaded successfully`,
        type: 'success',
      });
    } catch (err) {
      console.error('Upload failed:', err);
      setToast({
        message: err instanceof Error ? err.message : 'Upload failed. Please try again.',
        type: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    if (refreshing || uploading) return;
    setRefreshing(true);
    loadDocuments(false).catch(console.error);
  };

  // Handle file input
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file).catch(console.error);
      e.target.value = '';
    }
  };

  // Handle retry
  const handleRetry = () => {
    loadDocuments().catch(console.error);
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Filtered documents
  const filteredDocs = filterDocuments(documents, search, statusFilter, fileTypeFilter);
  const stats = calculateDocumentStats(documents);

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Knowledge
          </p>

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Knowledge Base
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Manage the documents that power your AI knowledge base.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing || uploading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                title="Refresh documents"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {/* Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
              >
                {uploading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? 'Uploading...' : 'Upload'}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,.markdown"
                className="hidden"
                onChange={handleFileInputChange}
              />
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <KnowledgeStats stats={stats} loading={loading} />

        {/* Upload Zone */}
        <div className="mt-8">
          <div
            onClick={() => !uploading && !loading && fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !uploading && !loading) {
                fileInputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
            className={!uploading && !loading ? 'cursor-pointer' : ''}
          >
            <UploadZone onUpload={(file) => { handleUpload(file).catch(console.error); }} uploading={uploading} disabled={loading} />
          </div>
        </div>

        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-6"
            >
              <div
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-sm ${
                  toast.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <CheckCircle
                  className={`h-4 w-4 shrink-0 ${
                    toast.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                  }`}
                />
                <p
                  className={`flex-1 text-sm ${
                    toast.type === 'success' ? 'text-emerald-900' : 'text-red-900'
                  }`}
                >
                  {toast.message}
                </p>
                <button
                  onClick={() => setToast(null)}
                  className={`transition ${
                    toast.type === 'success'
                      ? 'text-emerald-600 hover:text-emerald-900'
                      : 'text-red-600 hover:text-red-900'
                  }`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        {!loading && !error && documents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-8"
          >
            <DocumentFilters
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              fileTypeFilter={fileTypeFilter}
              onFileTypeFilterChange={setFileTypeFilter}
            />
          </motion.div>
        )}

        {/* Document List */}
        <div className="mt-6">
          <DocumentList
            documents={filteredDocs}
            loading={loading}
            error={error || undefined}
            onRetry={handleRetry}
          />
        </div>

        {/* No Results */}
        {!loading && !error && documents.length > 0 && filteredDocs.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                <Upload className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-800">
                No matching documents
              </h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Try adjusting your search or filters.
              </p>
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setFileTypeFilter('all');
                }}
                className="mt-4 text-xs font-medium text-slate-600 underline hover:text-slate-900"
              >
                Clear all filters
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
