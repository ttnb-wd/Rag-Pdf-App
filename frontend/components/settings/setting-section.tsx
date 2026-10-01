'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface SettingSectionProps {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  delay?: number;
}

export function SettingSection({
  title,
  description,
  icon,
  children,
  delay = 0,
}: SettingSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </motion.div>
  );
}
