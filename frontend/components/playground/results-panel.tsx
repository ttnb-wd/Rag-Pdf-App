'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Target, Clock, Zap, ExternalLink, CheckCircle } from 'lucide-react';

interface Citation {
  citationId: number;
  source: string;
  contentSnippet: string;
  chunkIndex?: number;
  similarity?: number;
}

interface PlaygroundResult {
  query: string;
  answer: string;
  citations: Citation[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  timestamp: number;
}

interface ResultsPanelProps {
  result: PlaygroundResult | null;
}

export function ResultsPanel({ result }: ResultsPanelProps) {
  if (!result) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.20 }}
        className="rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex min-h-[400px] items-center justify-center p-8 text-center">
          <div>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              <Target className="h-8 w-8" />
            </div>
            <h3 className="mt-6 text-base font-semibold text-slate-900">
              No test results yet
            </h3>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
              Enter a query and configure your RAG settings to see how the pipeline performs.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={result.timestamp}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="space-y-6"
      >
        {/* Query Display */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Test Query</h3>
          </div>
          <div className="px-6 py-4">
            <p className="text-sm leading-6 text-slate-700">{result.query}</p>
          </div>
        </motion.div>

        {/* Answer */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">AI Response</h3>
              <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                <CheckCircle className="h-3.5 w-3.5" />
                Generated
              </span>
            </div>
          </div>
          <div className="px-6 py-4">
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {result.answer}
            </p>
          </div>
        </motion.div>

        {/* Retrieved Sources */}
        {result.citations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.10 }}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Retrieved Sources
                </h3>
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-600">
                  {result.citations.length} {result.citations.length === 1 ? 'source' : 'sources'}
                </span>
              </div>
            </div>
            <div className="divide-y divide-slate-100 px-6">
              {result.citations.map((citation, index) => (
                <motion.div
                  key={citation.citationId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + index * 0.05 }}
                  className="py-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-sm font-semibold text-violet-600">
                      {citation.citationId}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                            <p className="truncate text-sm font-medium text-slate-900">
                              {citation.source.split('/').pop()?.split('\\').pop() || citation.source}
                            </p>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            {citation.chunkIndex !== undefined && (
                              <span>Chunk {citation.chunkIndex}</span>
                            )}
                            {citation.similarity !== undefined && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="font-medium text-emerald-600">
                                  {(citation.similarity * 100).toFixed(1)}% similarity
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600"
                          title="View source"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View
                        </button>
                      </div>
                      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-xs leading-5 text-slate-600">
                          &ldquo;{citation.contentSnippet}&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Metrics */}
        {result.usage && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <Zap className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Prompt Tokens</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {result.usage.promptTokens.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <FileText className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Completion Tokens</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {result.usage.completionTokens.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                  <Clock className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Tokens</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {result.usage.totalTokens.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
