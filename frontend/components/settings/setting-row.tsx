'use client';

import type { ReactNode } from 'react';

interface SettingRowProps {
  label: string;
  description?: string;
  children: ReactNode;
}

export function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 py-5 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <label className="block text-sm font-medium text-slate-900">
          {label}
        </label>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      <div className="sm:ml-6">{children}</div>
    </div>
  );
}
