'use client';

import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Database,
  FileText,
  Loader2,
  MessageSquare,
  Upload,
  Zap,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

type Stats = {
  documents: number;
  readyDocuments: number;
  processing: number;
  totalChunks: number;
};

type Document = {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  chunksCount: number;
  status: 'ready' | 'processing' | 'failed';
  uploadedAt: string;
};

const API_URL = 'http://localhost:5000';

function formatFileSize(bytes: number) {
  if (!bytes || bytes <= 0) return 'Unknown';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    documents: 0,
    readyDocuments: 0,
    processing: 0,
    totalChunks: 0,
  });
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/documents`);
        if (!response.ok) throw new Error('Failed to load documents');

        const data = await response.json();
        const documents: Document[] = data.documents || [];

        // Calculate stats
        const readyDocs = documents.filter((d) => d.status === 'ready');
        const processingDocs = documents.filter((d) => d.status === 'processing');
        const totalChunks = readyDocs.reduce((sum, d) => sum + d.chunksCount, 0);

        setStats({
          documents: documents.length,
          readyDocuments: readyDocs.length,
          processing: processingDocs.length,
          totalChunks,
        });

        // Get recent documents (last 5)
        setRecentDocuments(documents.slice(0, 5));
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const statsCards = [
    {
      label: 'Documents',
      value: stats.documents,
      description: 'Total uploaded files',
      icon: FileText,
      color: 'blue',
    },
    {
      label: 'Ready Documents',
      value: stats.readyDocuments,
      description: 'Indexed and searchable',
      icon: CheckCircle2,
      color: 'emerald',
    },
    {
      label: 'Processing',
      value: stats.processing,
      description: 'Being indexed',
      icon: Clock,
      color: 'amber',
    },
    {
      label: 'Total Chunks',
      value: stats.totalChunks,
      description: 'Searchable knowledge',
      icon: Database,
      color: 'violet',
    },
  ];

  const quickActions = [
    {
      title: 'Upload Document',
      description: 'Add knowledge to your RAG system',
      href: '/knowledge-base',
      icon: Upload,
      color: 'blue',
    },
    {
      title: 'Open AI Chat',
      description: 'Ask questions about your documents',
      href: '/chat',
      icon: MessageSquare,
      color: 'emerald',
    },
    {
      title: 'Open Playground',
      description: 'Test and experiment with your RAG pipeline',
      href: '/playground',
      icon: FlaskConical,
      color: 'violet',
    },
  ];

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Overview
          </p>

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Welcome to RAG PAF Studio
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Manage your knowledge base, chat with your documents, and test
                your RAG pipeline.
              </p>
            </div>

            <Link
              href="/knowledge-base"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              <Upload className="h-4 w-4" />
              Upload document
            </Link>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;

            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.06,
                }}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${stat.color}-50 text-${stat.color}-600`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <ArrowUpRight className="h-4 w-4 text-slate-300" />
                </div>

                <p className="text-2xl font-semibold tracking-tight text-slate-950">
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  ) : (
                    stat.value
                  )}
                </p>

                <p className="mt-1 text-sm font-medium text-slate-700">
                  {stat.label}
                </p>

                <p className="mt-1 text-xs text-slate-400">{stat.description}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Main Grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Recent Documents */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-2xl border border-slate-200 bg-white lg:col-span-2"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Recent documents
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Your latest knowledge base activity
                </p>
              </div>

              <Link
                href="/knowledge-base"
                className="text-xs font-medium text-slate-500 transition hover:text-slate-950"
              >
                View all
              </Link>
            </div>

            {loading ? (
              <div className="flex min-h-[260px] items-center justify-center p-6">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : recentDocuments.length === 0 ? (
              <div className="flex min-h-[260px] items-center justify-center p-6">
                <div className="max-w-sm text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                    <FileText className="h-6 w-6" />
                  </div>

                  <h3 className="mt-4 text-sm font-semibold text-slate-800">
                    No documents yet
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Upload your first PDF, DOCX, TXT, or Markdown document to
                    start building your knowledge base.
                  </p>

                  <Link
                    href="/knowledge-base"
                    className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Add document
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentDocuments.map((doc, index) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 px-5 py-3.5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {doc.name}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-400">
                        {formatFileSize(doc.fileSize)} · {doc.chunksCount} chunks
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {doc.status === 'ready' && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Ready
                        </span>
                      )}

                      {doc.status === 'processing' && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Processing
                        </span>
                      )}

                      {doc.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Failed
                        </span>
                      )}

                      <span className="text-xs text-slate-400">
                        {formatDate(doc.uploadedAt)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>

          {/* Quick Actions */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.26 }}
            className="rounded-2xl border border-slate-200 bg-white"
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Quick actions
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Start working with your AI workspace
              </p>
            </div>

            <div className="space-y-2 p-3">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group flex items-center gap-3 rounded-xl p-3 transition hover:bg-slate-50"
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg bg-${action.color}-50 text-${action.color}-600`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800">
                        {action.title}
                      </p>

                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {action.description}
                      </p>
                    </div>

                    <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-700" />
                  </Link>
                );
              })}
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
