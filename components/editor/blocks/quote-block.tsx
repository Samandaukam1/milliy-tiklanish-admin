'use client';

import { ContentBlock, LangKey } from '@/types/blocks';

interface Props {
  block: ContentBlock;
  activeLang: LangKey;
  onChange: (updates: Partial<ContentBlock>) => void;
}

export function QuoteBlock({ block, activeLang, onChange }: Props) {
  const quoteField = `quote_${activeLang}` as keyof ContentBlock;

  return (
    <div className="space-y-3">
      {/* Quote text */}
      <div className="border-l-4 border-purple-400 pl-4 bg-purple-50/50 rounded-r-lg py-2">
        <textarea
          rows={3}
          value={(block[quoteField] as string) || ''}
          onChange={(e) => onChange({ [quoteField]: e.target.value })}
          placeholder="Iqtibos matnini kiriting..."
          className="w-full bg-transparent px-0 py-0 text-slate-800 placeholder-slate-400 focus:outline-none resize-none italic text-base leading-relaxed"
        />
      </div>

      {/* Attribution */}
      <input
        type="text"
        value={block.attribution || ''}
        onChange={(e) => onChange({ attribution: e.target.value })}
        placeholder="Manba / Muallif (ixtiyoriy)"
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
      />
    </div>
  );
}
