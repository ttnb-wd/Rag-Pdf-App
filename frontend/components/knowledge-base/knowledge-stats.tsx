'use client';

import { motion } from 'framer-motion';
import { FileText, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import type { DocumentStats } from '@/lib/types';

interface KnowledgeStatsProps {
  stats: DocumentStats;
  loading?: boolean;
}

export function KnowledgeStats({ stats, loading = false }: KnowledgeStatsProps) {
  const statCards = [
    {
      label: 'Total Documents',
      value: stats.total,
      icon: FileText,
      color: 'text-slate-600',
      bg: 'bg-slate-50',
    },
    {
      label: 'Ready',
      value: stats.ready,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Processing',
      value: stats.processing,
      icon: Loader2,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      animate: stats.processing > 0,
    },
    {
      label: 'Failed',
      value: stats.failed,
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 w-20 rounded bg-slate-200" />
                <div className="h-8 w-12 rounded bg-slate-200" />
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 + index * 0.05 }}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {stat.value.toLocaleString()}
              </p>
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}>
              <stat.icon
                className={`h-5 w-5 ${stat.color} ${stat.animate ? 'animate-spin' : ''}`}
              />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
