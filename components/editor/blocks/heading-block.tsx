'use client';

import { ContentBlock, LangKey } from '@/types/blocks';

interface Props {
  block: ContentBlock;
  activeLang: LangKey;
  onChange: (updates: Partial<ContentBlock>) => void;
}

const HEADING_SIZES: Record<1 | 2 | 3, string> = {
  1: 'text-2xl font-bold',
  2: 'text-xl font-bold',
  3: 'text-lg font-semibold',
};

export function HeadingBlock({ block, activeLang, onChange }: Props) {
  const titleField = `title_${activeLang}` as keyof ContentBlock;
  const legacyTextField = `text_${activeLang}` as keyof ContentBlock;
  const level = (block.level ?? 2) as 1 | 2 | 3;
  const value = (block[titleField] as string) || (block[legacyTextField] as string) || '';

  return (
    <div className="space-y-3">
      {/* Level selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Daraja:</span>
        {([1, 2, 3] as const).map((lvl) => (
          <button
            key={lvl}
            type="button"
            onClick={() => onChange({ level: lvl })}
            className={`px-3 py-1 text-xs font-bold rounded border transition-colors ${
              level === lvl
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
            }`}
          >
            H{lvl}
          </button>
        ))}
      </div>

      {/* Text input */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange({ [titleField]: e.target.value, [legacyTextField]: e.target.value })}
        placeholder="Sarlavha matnini kiriting..."
        className={`w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${HEADING_SIZES[level]}`}
      />
    </div>
  );
}
