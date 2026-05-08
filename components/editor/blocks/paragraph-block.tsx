'use client';

import { ContentBlock, LangKey } from '@/types/blocks';

interface Props {
  block: ContentBlock;
  activeLang: LangKey;
  onChange: (updates: Partial<ContentBlock>) => void;
}

export function ParagraphBlock({ block, activeLang, onChange }: Props) {
  const field = `text_${activeLang}` as keyof ContentBlock;

  return (
    <textarea
      rows={6}
      value={(block[field] as string) || ''}
      onChange={(e) => onChange({ [field]: e.target.value })}
      placeholder="Paragraf matnini kiriting..."
      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
    />
  );
}
