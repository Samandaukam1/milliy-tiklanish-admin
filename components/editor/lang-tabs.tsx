'use client';

import { LangKey, LANG_TABS } from '@/types/blocks';

interface LangTabsProps {
  active: LangKey;
  onChange: (lang: LangKey) => void;
  className?: string;
}

export function LangTabs({ active, onChange, className = '' }: LangTabsProps) {
  return (
    <div className={`flex border-b border-slate-200 ${className}`}>
      {LANG_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
            active === tab.key
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-700 bg-slate-50/50'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
