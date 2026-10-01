'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Database,
  Sparkles,
  Server,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { SettingSection } from '@/components/settings/setting-section';
import { SettingRow } from '@/components/settings/setting-row';

interface HealthStatus {
  status: string;
  service: string;
  database: string;
  pgvector: string;
  models: {
    main: string;
    fast: string;
  };
  embedding: {
    model: string;
    dimensions: number;
  };
  rag: {
    searchCandidates: number;
    datasetCandidates: number;
  };
  readyDocuments?: number;
  totalChunks?: number;
}

const API_URL = 'http://localhost:5000/api';

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  const loadHealth = async () => {
    try {
      setHealthLoading(true);
      setHealthError(null);
      
      const response = await fetch(`${API_URL}/health`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch system status');
      }
      
      const data = await response.json();
      setHealth(data);
    } catch (err) {
      console.error('Health check failed:', err);
      setHealthError(
        err instanceof Error ? err.message : 'Failed to load system status'
      );
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          setHealth(data);
          setHealthLoading(false);
        }
      })
      .catch((err) => {
        console.error('Health check failed:', err);
        if (mounted) {
          setHealthError(
            err instanceof Error ? err.message : 'Failed to load system status'
          );
          setHealthLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleRefresh = () => {
    loadHealth().catch(console.error);
  };

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Configuration
          </p>

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Settings
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                View system configuration and backend status.
              </p>
            </div>

            <button
              onClick={handleRefresh}
              disabled={healthLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              title="Refresh status"
            >
              <RefreshCw
                className={`h-4 w-4 ${healthLoading ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </motion.div>

        {/* Error State */}
        {healthError && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-red-900">
                Failed to load system status
              </p>
              <p className="mt-1 text-sm text-red-700">{healthError}</p>
            </div>
          </motion.div>
        )}

        <div className="space-y-6">
          {/* System Status */}
          <SettingSection
            title="System Status"
            description="Backend service health and connectivity"
            icon={<Server className="h-5 w-5" />}
            delay={0.08}
          >
            {healthLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : health ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      {health.status === 'ok' ? (
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-500">Service</p>
                        <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
                          {health.service}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      {health.database === 'connected' ? (
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-500">Database</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-900">
                          {health.database === 'connected'
                            ? 'PostgreSQL Connected'
                            : 'Disconnected'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      {health.pgvector === 'enabled' ? (
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-500">Vector Database</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-900">
                          pgvector {health.pgvector}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-500">Documents</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-900">
                          {health.readyDocuments ?? 0} ready
                          {health.totalChunks !== undefined &&
                            ` · ${health.totalChunks} chunks`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
                <p className="text-sm text-slate-500">
                  No status information available
                </p>
              </div>
            )}
          </SettingSection>

          {/* AI Models */}
          {health && (
            <SettingSection
              title="AI Models"
              description="Language models used for generation"
              icon={<Sparkles className="h-5 w-5" />}
              delay={0.14}
            >
              <SettingRow
                label="Main Model"
                description="Used for complex queries requiring best quality"
              >
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-700">
                  {health.models.main}
                </div>
              </SettingRow>

              <SettingRow
                label="Fast Model"
                description="Used for simple queries requiring faster responses"
              >
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-700">
                  {health.models.fast}
                </div>
              </SettingRow>
            </SettingSection>
          )}

          {/* Embedding Configuration */}
          {health && (
            <SettingSection
              title="Embedding Configuration"
              description="Model used for document vectorization"
              icon={<Database className="h-5 w-5" />}
              delay={0.20}
            >
              <SettingRow
                label="Embedding Model"
                description="Converts text into vector representations"
              >
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-700">
                  {health.embedding.model}
                </div>
              </SettingRow>

              <SettingRow
                label="Vector Dimensions"
                description="Size of embedding vectors"
              >
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-700">
                  {health.embedding.dimensions}
                </div>
              </SettingRow>
            </SettingSection>
          )}

          {/* RAG Configuration */}
          {health && (
            <SettingSection
              title="RAG Configuration"
              description="Retrieval Augmented Generation pipeline settings"
              icon={<SettingsIcon className="h-5 w-5" />}
              delay={0.26}
            >
              <SettingRow
                label="Search Candidates"
                description="Maximum chunks retrieved for standard queries"
              >
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-700">
                  {health.rag.searchCandidates}
                </div>
              </SettingRow>

              <SettingRow
                label="Dataset Candidates"
                description="Maximum chunks retrieved for dataset-specific queries"
              >
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-700">
                  {health.rag.datasetCandidates}
                </div>
              </SettingRow>
            </SettingSection>
          )}

          {/* Info Notice */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <SettingsIcon className="h-5 w-5 shrink-0 text-blue-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-blue-900">
                  Configuration Notice
                </p>
                <p className="mt-1 text-sm text-blue-700">
                  These settings are managed through environment variables in
                  the backend. To modify them, update your{' '}
                  <code className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs">
                    .env
                  </code>{' '}
                  file and restart the backend service.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
