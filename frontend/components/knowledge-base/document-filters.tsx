'use client';

import { Search, X, Filter } from 'lucide-react';
import { useState } from 'react';
import type { StatusFilter, FileTypeFilter } from '@/lib/types';

interface DocumentFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  fileTypeFilter: FileTypeFilter;
  onFileTypeFilterChange: (value: FileTypeFilter) => void;
}

export function DocumentFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  fileTypeFilter,
  onFileTypeFilterChange,
}: DocumentFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All Status' },
    { value: 'ready', label: 'Ready' },
    { value: 'processing', label: 'Processing' },
    { value: 'failed', label: 'Failed' },
  ];

  const fileTypeOptions: { value: FileTypeFilter; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'pdf', label: 'PDF' },
    { value: 'docx', label: 'DOCX' },
    { value: 'txt', label: 'TXT' },
    { value: 'md', label: 'Markdown' },
  ];

  const hasActiveFilters = statusFilter !== 'all' || fileTypeFilter !== 'all';

  return (
    <div className="space-y-4">
      {/* Search and Filter Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search documents..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Toggle (Mobile) */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:hidden"
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-xs text-white">
              {(statusFilter !== 'all' ? 1 : 0) + (fileTypeFilter !== 'all' ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Filters (Desktop: Always visible, Mobile: Collapsible) */}
      <div className={`flex flex-col gap-3 sm:flex-row sm:items-center ${showFilters ? 'block' : 'hidden sm:flex'}`}>
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Status:</span>
          <div className="flex gap-1">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onStatusFilterChange(option.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === option.value
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* File Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Type:</span>
          <div className="flex flex-wrap gap-1">
            {fileTypeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onFileTypeFilterChange(option.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  fileTypeFilter === option.value
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
