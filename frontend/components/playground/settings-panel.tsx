'use client';

import { motion } from 'framer-motion';
import { Settings2, ChevronDown } from 'lucide-react';

interface PlaygroundSettings {
  model: string;
  topK: number;
  systemPrompt: string;
}

interface SettingsPanelProps {
  settings: PlaygroundSettings;
  onChange: (settings: PlaygroundSettings) => void;
  disabled?: boolean;
}

const MODELS = [
  { id: 'main', name: 'GPT-OSS 120B', description: 'Best quality' },
  { id: 'fast', name: 'GPT-OSS 20B', description: 'Faster responses' },
];

export function SettingsPanel({ settings, onChange, disabled = false }: SettingsPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.14 }}
      className="rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <Settings2 className="h-5 w-5 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">RAG Configuration</h2>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {/* Model Selection */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Model
          </label>
          <div className="relative">
            <select
              value={settings.model}
              onChange={(e) => onChange({ ...settings, model: e.target.value })}
              disabled={disabled}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-sm text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-50 disabled:opacity-50"
            >
              {MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {MODELS.find((m) => m.id === settings.model)?.description}
          </p>
        </div>

        {/* Top K */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Retrieved Sources (Top K)
            </label>
            <span className="rounded-md bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-600">
              {settings.topK}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={settings.topK}
            onChange={(e) => onChange({ ...settings, topK: Number(e.target.value) })}
            disabled={disabled}
            className="w-full accent-violet-600 disabled:opacity-50"
          />
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            <span>1</span>
            <span>10</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Number of document chunks to retrieve from the vector database
          </p>
        </div>

        {/* System Prompt */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            System Prompt
          </label>
          <textarea
            value={settings.systemPrompt}
            onChange={(e) => onChange({ ...settings, systemPrompt: e.target.value })}
            disabled={disabled}
            rows={5}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-50 disabled:opacity-50"
          />
          <p className="mt-2 text-xs text-slate-500">
            Instructions for the AI model on how to respond
          </p>
        </div>
      </div>
    </motion.div>
  );
}
