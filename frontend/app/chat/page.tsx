'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bot,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Loader2,
  Send,
  Settings2,
  Sparkles,
  User,
} from 'lucide-react';

type Citation = {
  citationId: number;
  source: string;
  contentSnippet: string;
  chunkIndex?: number;
  similarity?: number;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
};

type DocumentItem = {
  id: string;
  name: string;
  chunksCount: number;
  fileSize?: number;
  fileType?: string;
  size?: string;
  status?: string;
  uploadedAt?: string;
};

type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

const API_URL = 'http://localhost:5000';

const MODELS = [
  {
    id: 'main',
    name: 'GPT-OSS 120B',
    description: 'Best quality for complex questions',
  },
  {
    id: 'fast',
    name: 'GPT-OSS 20B',
    description: 'Faster responses for simple questions',
  },
];

const DEFAULT_SYSTEM_PROMPT =
  'You are a professional AI Assistant. Answer strictly based on retrieved document knowledge.';

function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) {
    return 'Unknown size';
  }

  const units = ['B', 'KB', 'MB', 'GB'];

  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${
    units[index]
  }`;
}

function formatSimilarity(similarity?: number) {
  if (similarity === undefined || Number.isNaN(similarity)) {
    return null;
  }

  return `${(similarity * 100).toFixed(1)}%`;
}

function getFileName(source: string) {
  if (!source) {
    return 'Unknown document';
  }

  const normalized = source.split('\\').pop()?.split('/').pop();

  return normalized || source;
}

function SourceCard({
  citation,
  onSelect,
}: {
  citation: Citation;
  onSelect: (citation: Citation) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const similarity = formatSimilarity(citation.similarity);
  const documentName = getFileName(citation.source);

  const handleViewSource = () => {
    setExpanded((current) => !current);
    onSelect(citation);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors hover:border-slate-300"
    >
      <div className="flex items-start gap-3 p-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-semibold text-blue-600">
          {String(citation.citationId).padStart(2, '0')}
        </div>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onSelect(citation)}
            className="group flex w-full items-start gap-2 text-left"
          >
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800 group-hover:text-blue-600">
                {documentName}
              </p>

              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                {citation.chunkIndex !== undefined && (
                  <span>Chunk {citation.chunkIndex}</span>
                )}

                {citation.chunkIndex !== undefined && similarity && (
                  <span className="text-slate-300">•</span>
                )}

                {similarity && (
                  <span className="font-medium text-emerald-600">
                    {similarity} relevance
                  </span>
                )}
              </div>
            </div>

            <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-blue-500" />
          </button>

          {citation.contentSnippet && (
            <div className="mt-3">
              <motion.div
                initial={false}
                animate={{
                  height: expanded ? 'auto' : '3rem',
                }}
                className="overflow-hidden"
              >
                <p className="text-sm leading-6 text-slate-600">
                  “{citation.contentSnippet}”
                </p>
              </motion.div>

              <button
                type="button"
                onClick={handleViewSource}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700"
              >
                {expanded ? (
                  <>
                    Show less
                    <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    View source
                    <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-slate-100 bg-slate-50/70"
          >
            <div className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
                  <FileText className="h-3.5 w-3.5 text-blue-500" />
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    Source detail
                  </p>

                  <p className="text-[11px] text-slate-500">
                    {documentName}
                    {citation.chunkIndex !== undefined &&
                      ` · Chunk ${citation.chunkIndex}`}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {citation.contentSnippet}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {citation.chunkIndex !== undefined && (
                  <span className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                    Chunk {citation.chunkIndex}
                  </span>
                )}

                {similarity && (
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100">
                    {similarity} relevance
                  </span>
                )}

                <span className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-blue-100">
                  Source {citation.citationId}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedModel, setSelectedModel] = useState('main');
  const [topK, setTopK] = useState(3);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [selectedCitation, setSelectedCitation] =
    useState<Citation | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await fetch(`${API_URL}/api/documents`);

        if (!response.ok) {
          throw new Error('Failed to load documents');
        }

        const data = await response.json();

        setDocuments(data.documents || []);
      } catch (error) {
        console.error('Failed to load documents:', error);
      }
    };

    void loadDocuments();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages, loading]);

  const handleSend = async (event?: FormEvent) => {
    event?.preventDefault();

    const question = inputQuery.trim();

    if (!question || loading) {
      return;
    }

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: question,
    };

    setMessages((current) => [...current, userMessage]);
    setInputQuery('');
    setLoading(true);
    setSelectedCitation(null);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          selectedModel,
          systemPrompt,
          topK,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI response');
      }

      /*
       * Important:
       *
       * Backend returns:
       *
       * {
       *   answer: "...",
       *   citations: [],
       *   usage: ...
       * }
       *
       * When the backend cannot find enough evidence,
       * citations will be [].
       *
       * Therefore the Sources section will automatically
       * stay hidden because of the length check below.
       */
      const citations: Citation[] = Array.isArray(data.citations)
        ? data.citations
        : [];

      const assistantMessage: Message = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content:
          typeof data.answer === 'string' && data.answer.trim()
            ? data.answer.trim()
            : 'No response received.',
        citations,
      };

      setMessages((current) => [...current, assistantMessage]);

      setTokenUsage(data.usage || null);
    } catch (error) {
      console.error('Chat error:', error);

      const errorMessage: Message = {
        id: `${Date.now()}-error`,
        role: 'assistant',
        content:
          error instanceof Error
            ? `Sorry, something went wrong: ${error.message}`
            : 'Sorry, something went wrong while processing your request.',
      };

      setMessages((current) => [...current, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="min-h-[calc(100vh-0px)] bg-slate-50">
      <div className="mx-auto flex h-[calc(100vh-0px)] max-w-[1600px] flex-col">
        {/* Header */}
        <header className="border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  AI Chat
                </h1>

                <p className="text-xs text-slate-500">
                  Ask questions about your knowledge base
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:flex">
              <FileText className="h-4 w-4 text-slate-400" />

              <span className="text-sm font-medium text-slate-700">
                {documents.length} document
                {documents.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* Main Chat */}
          <main className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-xl text-center"
                  >
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <Bot className="h-8 w-8" />
                    </div>

                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                      Chat with your knowledge
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Ask questions about the documents you uploaded. The AI
                      will retrieve relevant context before answering.
                    </p>

                    {documents.length === 0 ? (
                      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                        Upload a document from Knowledge Base before starting
                        a conversation.
                      </div>
                    ) : (
                      <div className="mt-6 flex flex-wrap justify-center gap-2">
                        {[
                          'Summarize the uploaded document',
                          'What are the main findings?',
                          'Explain the key concepts',
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => setInputQuery(suggestion)}
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </div>
              ) : (
                <div className="mx-auto max-w-4xl space-y-6">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${
                        message.role === 'user'
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] ${
                          message.role === 'user'
                            ? 'rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-white'
                            : 'min-w-0'
                        }`}
                      >
                        <div
                          className={`whitespace-pre-wrap text-sm leading-7 ${
                            message.role === 'assistant'
                              ? 'text-slate-700'
                              : 'text-white'
                          }`}
                        >
                          {message.content}
                        </div>

                        {/* 
                          Sources are shown ONLY when there are actual
                          citations.

                          If backend returns:
                            citations: []

                          then this entire section is hidden.
                        */}
                        {message.role === 'assistant' &&
                          Array.isArray(message.citations) &&
                          message.citations.length > 0 && (
                            <div className="mt-5 border-t border-slate-200 pt-4">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Sources
                                  </p>

                                  <p className="mt-0.5 text-[10px] text-slate-400">
                                    Retrieved from your knowledge base
                                  </p>
                                </div>

                                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">
                                  {message.citations.length} source
                                  {message.citations.length === 1
                                    ? ''
                                    : 's'}
                                </span>
                              </div>

                              <div className="space-y-2.5">
                                {message.citations.map((citation) => (
                                  <SourceCard
                                    key={`${message.id}-${citation.citationId}`}
                                    citation={citation}
                                    onSelect={(selected) =>
                                      setSelectedCitation(selected)
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                      </div>

                      {message.role === 'user' && (
                        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {loading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-3"
                    >
                      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Bot className="h-4 w-4" />
                      </div>

                      <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching your knowledge base...
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-slate-200 bg-white p-4 sm:p-6">
              <form onSubmit={handleSend} className="mx-auto max-w-4xl">
                <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm transition focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-50">
                  <textarea
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask something about your documents..."
                    rows={2}
                    disabled={loading}
                    className="w-full resize-none bg-transparent px-4 pb-12 pt-4 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60"
                  />

                  <div className="absolute bottom-3 right-3">
                    <button
                      type="submit"
                      disabled={!inputQuery.trim() || loading}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <p className="mt-2 text-center text-[11px] text-slate-400">
                  Press Enter to send · Shift + Enter for a new line
                </p>
              </form>
            </div>
          </main>

          {/* Settings Sidebar */}
          <aside className="hidden w-[320px] shrink-0 border-l border-slate-200 bg-white xl:block">
            <div className="h-full overflow-y-auto">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-slate-500" />

                  <h2 className="text-sm font-semibold text-slate-900">
                    RAG Settings
                  </h2>
                </div>
              </div>

              <div className="space-y-6 p-5">
                {/* Model */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Model
                  </label>

                  <div className="relative">
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                    >
                      {MODELS.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>

                  <p className="mt-2 text-[11px] leading-4 text-slate-400">
                    {
                      MODELS.find(
                        (model) => model.id === selectedModel,
                      )?.description
                    }
                  </p>
                </div>

                {/* Top K */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Retrieved Sources
                    </label>

                    <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">
                      {topK}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={topK}
                    onChange={(e) => setTopK(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />

                  <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                    <span>1</span>
                    <span>10</span>
                  </div>
                </div>

                {/* System Prompt */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    System Prompt
                  </label>

                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={6}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                {/* Knowledge Base */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Knowledge Base
                    </label>

                    <span className="text-xs font-medium text-slate-500">
                      {documents.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {documents.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center">
                        <FileText className="mx-auto h-5 w-5 text-slate-300" />

                        <p className="mt-2 text-xs text-slate-400">
                          No documents uploaded
                        </p>
                      </div>
                    ) : (
                      documents.slice(0, 5).map((document) => (
                        <div
                          key={document.id}
                          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-500">
                            <FileText className="h-4 w-4" />
                          </div>

                          <div className="min-w-0">
                            <p
                              className="truncate text-xs font-medium text-slate-700"
                              title={document.name}
                            >
                              {document.name}
                            </p>

                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {document.chunksCount} chunks ·{' '}
                              {document.size ||
                                formatFileSize(document.fileSize)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Token Usage */}
                {tokenUsage && (
                  <div>
                    <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Last Request Usage
                    </label>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex justify-between py-1 text-xs">
                        <span className="text-slate-500">
                          Prompt tokens
                        </span>

                        <span className="font-medium text-slate-700">
                          {tokenUsage.promptTokens}
                        </span>
                      </div>

                      <div className="flex justify-between py-1 text-xs">
                        <span className="text-slate-500">
                          Completion tokens
                        </span>

                        <span className="font-medium text-slate-700">
                          {tokenUsage.completionTokens}
                        </span>
                      </div>

                      <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-xs">
                        <span className="font-semibold text-slate-600">
                          Total
                        </span>

                        <span className="font-semibold text-blue-600">
                          {tokenUsage.totalTokens}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Selected Citation */}
                {selectedCitation && (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Source Preview
                      </label>

                      <button
                        type="button"
                        onClick={() => setSelectedCitation(null)}
                        className="text-[10px] font-medium text-slate-400 transition hover:text-slate-600"
                      >
                        Close
                      </button>
                    </div>

                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-blue-100 bg-blue-50/50 p-4"
                    >
                      <div className="flex items-start gap-2">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />

                        <div className="min-w-0">
                          <p
                            className="truncate text-xs font-semibold text-slate-700"
                            title={selectedCitation.source}
                          >
                            {getFileName(selectedCitation.source)}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] text-slate-400">
                            {selectedCitation.chunkIndex !== undefined && (
                              <span>
                                Chunk {selectedCitation.chunkIndex}
                              </span>
                            )}

                            {selectedCitation.chunkIndex !== undefined &&
                              selectedCitation.similarity !== undefined && (
                                <span>·</span>
                              )}

                            {selectedCitation.similarity !== undefined && (
                              <span className="font-medium text-blue-500">
                                {formatSimilarity(
                                  selectedCitation.similarity,
                                )}{' '}
                                relevance
                              </span>
                            )}
                          </div>

                          <p className="mt-3 text-xs leading-5 text-slate-600">
                            {selectedCitation.contentSnippet}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}