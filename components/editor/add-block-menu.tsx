'use client';

import { useState } from 'react';
import {
  Plus,
  AlignLeft,
  Heading,
  Quote,
  ImageIcon,
  Music,
  Video,
  Minus,
} from 'lucide-react';
import { BlockType } from '@/types/blocks';

const BLOCK_OPTIONS: {
  type: BlockType;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { type: 'paragraph', label: 'Paragraf', icon: AlignLeft, color: 'text-slate-600' },
  { type: 'heading', label: 'Sarlavha', icon: Heading, color: 'text-blue-600' },
  { type: 'quote', label: 'Iqtibos', icon: Quote, color: 'text-purple-600' },
  { type: 'image', label: 'Rasm', icon: ImageIcon, color: 'text-green-600' },
  { type: 'audio', label: 'Audio', icon: Music, color: 'text-orange-600' },
  { type: 'video', label: 'Video', icon: Video, color: 'text-red-600' },
  { type: 'divider', label: 'Ajratuvchi', icon: Minus, color: 'text-slate-400' },
];

interface AddBlockMenuProps {
  onAdd: (type: BlockType) => void;
}

export function AddBlockMenu({ onAdd }: AddBlockMenuProps) {
  const [open, setOpen] = useState(false);

  const handleAdd = (type: BlockType) => {
    onAdd(type);
    setOpen(false);
  };

  return (
    <div className="relative mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors font-medium text-sm"
      >
        <Plus size={18} />
        Blok qo&apos;shish
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          {/* Menu */}
          <div className="absolute bottom-full mb-2 left-0 right-0 z-20 bg-white rounded-xl border border-slate-200 shadow-xl p-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">
              Blok turini tanlang
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
              {BLOCK_OPTIONS.map(({ type, label, icon: Icon, color }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleAdd(type)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <Icon size={18} className={color} />
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
