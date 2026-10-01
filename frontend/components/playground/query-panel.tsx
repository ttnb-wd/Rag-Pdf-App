'use client';

import { useState } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface QueryPanelProps {
  onSubmit: (query: string) => void;
  loading: boolean;
  disabled?: boolean;
}

export function QueryPanel({ onSubmit, loading, disabled = false }: QueryPanelProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !loading && !disabled) {
      onSubmit(query.trim());
    }
  };

  const suggestions = [
    'What dataset was used in this study?',
    'What are the main findings?',
    'Explain the methodology',
    'What were the results?',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Test Query</h2>
            <p className="text-xs text-slate-500">Enter a question to test your RAG pipeline</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about your documents..."
              rows={4}
              disabled={loading || disabled}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-50 disabled:opacity-50"
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 2).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setQuery(suggestion)}
                  disabled={loading || disabled}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600 disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={!query.trim() || loading || disabled}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Test
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
