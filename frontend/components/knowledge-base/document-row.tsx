'use client';

import { FileText, CheckCircle, Loader2, AlertCircle, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Document } from '@/lib/types';
import { formatFileSize, formatRelativeTime, getFileTypeFromName } from '@/lib/utils';

interface DocumentRowProps {
  document: Document;
  index: number;
}

export function DocumentRow({ document, index }: DocumentRowProps) {
  const fileType = getFileTypeFromName(document.name);

  const getStatusDisplay = () => {
    switch (document.status) {
      case 'ready':
        return {
          icon: CheckCircle,
          text: 'Ready',
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
        };
      case 'processing':
        return {
          icon: Loader2,
          text: 'Processing',
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          animate: true,
        };
      case 'failed':
        return {
          icon: AlertCircle,
          text: 'Failed',
          color: 'text-red-600',
          bg: 'bg-red-50',
        };
      default:
        return {
          icon: FileText,
          text: 'Unknown',
          color: 'text-slate-600',
          bg: 'bg-slate-50',
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group flex items-center gap-4 border-b border-slate-100 px-6 py-4 transition hover:bg-slate-50 last:border-0"
    >
      {/* Icon */}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition group-hover:bg-slate-100">
        <FileText className="h-5 w-5" />
      </div>

      {/* Name & Type */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900" title={document.name}>
          {document.name}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
          <span className="font-medium text-slate-600">{fileType}</span>
          <span>•</span>
          <span>{formatFileSize(document.fileSize)}</span>
          {document.chunksCount > 0 && (
            <>
              <span>•</span>
              <span>{document.chunksCount} chunks</span>
            </>
          )}
        </div>
      </div>

      {/* Status */}
      <div
        className={`hidden items-center gap-2 rounded-lg px-3 py-1.5 sm:flex ${status.bg}`}
        title={document.status === 'ready' ? 'Indexed and available for RAG' : document.status === 'processing' ? 'Preparing document for retrieval' : 'Could not process this document'}
      >
        <status.icon className={`h-3.5 w-3.5 ${status.color} ${status.animate ? 'animate-spin' : ''}`} />
        <span className={`text-xs font-medium ${status.color}`}>{status.text}</span>
      </div>

      {/* Updated Time */}
      <div className="hidden text-right lg:block">
        <p className="text-xs text-slate-500" title={new Date(document.uploadedAt).toLocaleString()}>
          {formatRelativeTime(document.uploadedAt)}
        </p>
      </div>

      {/* Actions (Placeholder for future delete functionality) */}
      <button
        disabled
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
        title="Actions currently unavailable"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
