'use client';

import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { BlockType } from '@/types/blocks';

const BLOCK_LABELS: Record<BlockType, string> = {
  paragraph: 'Paragraf',
  heading: 'Sarlavha',
  quote: 'Iqtibos',
  image: 'Rasm',
  audio: 'Audio',
  video: 'Video',
  divider: 'Ajratuvchi',
};

const BLOCK_BADGE: Record<BlockType, string> = {
  paragraph: 'bg-slate-100 text-slate-700',
  heading: 'bg-blue-100 text-blue-700',
  quote: 'bg-purple-100 text-purple-700',
  image: 'bg-green-100 text-green-700',
  audio: 'bg-orange-100 text-orange-700',
  video: 'bg-red-100 text-red-700',
  divider: 'bg-slate-100 text-slate-500',
};

interface BlockWrapperProps {
  type: BlockType;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  children: React.ReactNode;
}

export function BlockWrapper({
  type,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  children,
}: BlockWrapperProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${BLOCK_BADGE[type]}`}>
          {BLOCK_LABELS[type]}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title="Yuqoriga"
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronUp size={16} />
          </button>
          <button
            type="button"
            title="Pastga"
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronDown size={16} />
          </button>
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <button
            type="button"
            title="O'chirish"
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      {type !== 'divider' && <div className="p-4">{children}</div>}
      {type === 'divider' && (
        <div className="px-4 py-5">
          <hr className="border-slate-300" />
        </div>
      )}
    </div>
  );
}
