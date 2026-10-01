'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, AlertCircle, FileText } from 'lucide-react';
import { QueryPanel } from '@/components/playground/query-panel';
import { SettingsPanel } from '@/components/playground/settings-panel';
import { ResultsPanel } from '@/components/playground/results-panel';

interface PlaygroundSettings {
  model: string;
  topK: number;
  systemPrompt: string;
}

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

interface Document {
  id: string;
  name: string;
  status: string;
}

const API_URL = 'http://localhost:5000/api';

const DEFAULT_SYSTEM_PROMPT =
  'You are a professional AI Assistant. Answer strictly based on retrieved document knowledge.';

export default function PlaygroundPage() {
  const [settings, setSettings] = useState<PlaygroundSettings>({
    model: 'main',
    topK: 3,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
  });

  const [result, setResult] = useState<PlaygroundResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  // Load documents
  useEffect(() => {
    let mounted = true;

    fetch(`${API_URL}/documents`)
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          setDocuments(data.documents || []);
          setDocumentsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load documents:', err);
        if (mounted) {
          setDocumentsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleQuerySubmit = async (query: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: query,
          selectedModel: settings.model,
          systemPrompt: settings.systemPrompt,
          topK: settings.topK,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI response');
      }

      const citations: Citation[] = Array.isArray(data.citations)
        ? data.citations
        : [];

      setResult({
        query,
        answer:
          typeof data.answer === 'string' && data.answer.trim()
            ? data.answer.trim()
            : 'No response received.',
        citations,
        usage: data.usage || undefined,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('Query error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to process query. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const readyDocuments = documents.filter((doc) => doc.status === 'ready');
  const hasDocuments = readyDocuments.length > 0;

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
            Testing
          </p>

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Playground
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Test and experiment with your RAG pipeline settings and
                configurations.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
              <FlaskConical className="h-4 w-4 text-violet-600" />
              <span className="text-sm font-medium text-slate-700">
                {documentsLoading ? (
                  'Loading...'
                ) : (
                  <>
                    {readyDocuments.length} ready document
                    {readyDocuments.length === 1 ? '' : 's'}
                  </>
                )}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Warning if no documents */}
        {!documentsLoading && !hasDocuments && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-amber-900">
                No documents ready
              </p>
              <p className="mt-1 text-sm text-amber-700">
                Upload and process documents in the Knowledge Base before
                testing the RAG pipeline.
              </p>
            </div>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-red-900">Test failed</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column: Query + Settings */}
          <div className="space-y-6 lg:col-span-1">
            <QueryPanel
              onSubmit={handleQuerySubmit}
              loading={loading}
              disabled={!hasDocuments}
            />
            <SettingsPanel
              settings={settings}
              onChange={setSettings}
              disabled={loading}
            />

            {/* Document Stats */}
            {!documentsLoading && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.20 }}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="border-b border-slate-100 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-slate-500" />
                    <h2 className="text-sm font-semibold text-slate-900">
                      Knowledge Base
                    </h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      Ready documents
                    </span>
                    <span className="text-2xl font-semibold text-slate-900">
                      {readyDocuments.length}
                    </span>
                  </div>
                  {documents.length > readyDocuments.length && (
                    <p className="mt-2 text-xs text-slate-500">
                      {documents.length - readyDocuments.length} document
                      {documents.length - readyDocuments.length === 1
                        ? ' is'
                        : 's are'}{' '}
                      still processing
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-2">
            <ResultsPanel result={result} />
          </div>
        </div>
      </div>
    </div>
  );
}
