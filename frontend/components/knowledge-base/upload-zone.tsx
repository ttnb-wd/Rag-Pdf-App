'use client';

import { useState } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { isSupportedFile } from '@/lib/api';

interface UploadZoneProps {
  onUpload: (file: File) => void;
  uploading: boolean;
  disabled?: boolean;
}

export function UploadZone({ onUpload, uploading, disabled = false }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    
    if (disabled || uploading) return;
    
    const file = e.dataTransfer.files?.[0];
    if (file && isSupportedFile(file)) {
      onUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled && !uploading) {
      setDragActive(true);
    }
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
        dragActive
          ? 'border-slate-400 bg-slate-50 scale-[1.02]'
          : 'border-slate-200 bg-white'
      } ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 shadow-sm">
        {uploading ? (
          <Loader2 className="h-7 w-7 animate-spin" />
        ) : (
          <FileText className="h-7 w-7" />
        )}
      </div>

      <h2 className="mt-6 text-base font-semibold text-slate-900">
        {uploading ? 'Processing your document...' : 'Drop your documents here'}
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        {uploading ? 'Please wait while we process your file' : 'or click to browse from your computer'}
      </p>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1">
          <Upload className="h-3 w-3" />
          PDF
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1">
          <Upload className="h-3 w-3" />
          DOCX
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1">
          <Upload className="h-3 w-3" />
          TXT
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1">
          <Upload className="h-3 w-3" />
          MD
        </span>
      </div>
    </motion.div>
  );
}
