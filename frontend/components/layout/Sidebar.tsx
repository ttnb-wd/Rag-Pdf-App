'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  Database,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Play,
  Settings,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const navigation = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Knowledge Base',
    href: '/knowledge-base',
    icon: Database,
  },
  {
    title: 'AI Chat',
    href: '/chat',
    icon: MessageSquare,
  },
  {
    title: 'Playground',
    href: '/playground',
    icon: Play,
  },
];

export default function Sidebar({
  mobileOpen,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <motion.button
          type="button"
          aria-label="Close sidebar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
        />
      )}

      <motion.aside
        initial={false}
        animate={{
          x: mobileOpen ? 0 : undefined,
        }}
        className={`
          fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col
          border-r border-slate-200 bg-white
          transition-transform duration-300
          lg:static lg:z-auto lg:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand */}
        <div className="flex h-[76px] items-center justify-between border-b border-slate-100 px-5">
          <Link
            href="/"
            onClick={onClose}
            className="group flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-[15px] font-semibold tracking-tight text-slate-950">
                RAG PAF Studio
              </h1>
              <p className="text-[11px] text-slate-400">
                AI Knowledge Workspace
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-6">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Workspace
          </p>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || 
                (item.href !== '/dashboard' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5"
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-xl bg-slate-100"
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}

                  <span
                    className={`
                      relative z-10 flex h-8 w-8 items-center justify-center rounded-lg
                      transition-colors
                      ${
                        isActive
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-400 group-hover:text-slate-700'
                      }
                    `}
                  >
                    <Icon className="h-[17px] w-[17px]" />
                  </span>

                  <span
                    className={`
                      relative z-10 text-[13px] font-medium transition-colors
                      ${
                        isActive
                          ? 'text-slate-950'
                          : 'text-slate-500 group-hover:text-slate-800'
                      }
                    `}
                  >
                    {item.title}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Knowledge Section */}
          <p className="mb-3 mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Knowledge
          </p>

          <div className="space-y-1">
            <Link
              href="/knowledge-base"
              onClick={onClose}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition group-hover:text-slate-700">
                <FileText className="h-[17px] w-[17px]" />
              </span>

              <span className="text-[13px] font-medium">
                Documents
              </span>
            </Link>

            <Link
              href="/knowledge-base"
              onClick={onClose}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition group-hover:text-slate-700">
                <Upload className="h-[17px] w-[17px]" />
              </span>

              <span className="text-[13px] font-medium">
                Upload
              </span>
            </Link>
          </div>

          {/* System */}
          <p className="mb-3 mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            System
          </p>

          <Link
            href="/settings"
            onClick={onClose}
            className={`
              group flex items-center gap-3 rounded-xl px-3 py-2.5 transition
              ${
                pathname.startsWith('/settings')
                  ? 'bg-slate-100 text-slate-950'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }
            `}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition group-hover:text-slate-700">
              <Settings className="h-[17px] w-[17px]" />
            </span>

            <span className="text-[13px] font-medium">
              Settings
            </span>
          </Link>
        </div>

        {/* Bottom Card */}
        <div className="border-t border-slate-100 p-3">
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm">
                <Bot className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-800">
                  RAG Engine
                </p>
                <p className="text-[10px] text-slate-400">
                  Connected
                </p>
              </div>

              <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" />
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}