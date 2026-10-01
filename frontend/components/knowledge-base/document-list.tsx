'use client';

import { FileText, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Document } from '@/lib/types';
import { DocumentRow } from './document-row';

interface DocumentListProps {
  documents: Document[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export function DocumentList({ documents, loading = false, error, onRetry }: DocumentListProps) {
  // Loading State
  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-48 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="divide-y divide-slate-100">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="h-11 w-11 animate-pulse rounded-xl bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="hidden h-8 w-20 animate-pulse rounded-lg bg-slate-100 sm:block" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h3 className="mt-6 text-base font-semibold text-slate-900">
            We couldn&apos;t load your knowledge base
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
            {error || 'An unexpected error occurred. Please try again.'}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-6 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // Empty State
  if (documents.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
            <FileText className="h-8 w-8" />
          </div>
          <h3 className="mt-6 text-base font-semibold text-slate-900">
            Your knowledge base is empty
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Upload your first document to start asking questions about your own knowledge.
          </p>
        </div>
      </div>
    );
  }

  // Document List
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.20 }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      {/* Header */}
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Documents</h2>
        <p className="mt-1 text-xs text-slate-500">
          {documents.length} document{documents.length === 1 ? '' : 's'} in your knowledge base
        </p>
      </div>

      {/* Document Rows */}
      <div>
        {documents.map((document, index) => (
          <DocumentRow key={document.id} document={document} index={index} />
        ))}
      </div>
    </motion.div>
  );
}
