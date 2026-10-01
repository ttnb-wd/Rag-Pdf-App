'use client';

import {
  Bell,
  Menu,
  Search,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({
  onMenuClick,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex w-full items-center justify-between gap-4">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden items-center gap-2 sm:flex">
            <Sparkles className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-400">
              AI Knowledge Workspace
            </span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <button
            type="button"
            className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400 transition hover:border-slate-300 hover:text-slate-700 md:flex"
          >
            <Search className="h-4 w-4" />

            <span className="text-xs">
              Search
            </span>

            <kbd className="ml-4 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400">
              ⌘ K
            </kbd>
          </button>

          {/* Notification */}
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />

            <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-slate-900" />
          </button>

          {/* Avatar */}
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
            aria-label="User profile"
          >
            R
          </button>
        </div>
      </div>
    </header>
  );
}