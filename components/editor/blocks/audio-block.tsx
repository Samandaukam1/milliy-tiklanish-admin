'use client';

import { useRef, useState } from 'react';
import { Upload, X, Music } from 'lucide-react';
import { ContentBlock, LangKey } from '@/types/blocks';
import { uploadToStorage } from '@/lib/storage';

interface Props {
  block: ContentBlock;
  activeLang: LangKey;
  onChange: (updates: Partial<ContentBlock>) => void;
}

export function AudioBlock({ block, activeLang, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const captionField = `caption_${activeLang}` as keyof ContentBlock;
  const audioUrl = block._localUrl || block.media_url;

  const handleFile = async (file: File) => {
    setError(null);
    const localUrl = URL.createObjectURL(file);
    onChange({ _localUrl: localUrl });
    setUploading(true);

    try {
      const url = await uploadToStorage('article-audio', file);
      onChange({ media_url: url, _localUrl: localUrl });
    } catch (err) {
      onChange({ media_url: localUrl, _localUrl: localUrl });
      if (err instanceof Error && !err.message.includes('placeholder')) {
        setError(err.message);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {audioUrl ? (
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-orange-700">
              <Music size={16} />
              <span className="text-sm font-medium">Audio fayl yuklangan</span>
            </div>
            <button
              type="button"
              onClick={() => onChange({ media_url: undefined, _localUrl: undefined })}
              className="text-slate-500 hover:text-red-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <audio controls src={audioUrl} className="w-full h-10" />
          {uploading && (
            <p className="text-xs text-orange-600 mt-2 animate-pulse">Yuklanmoqda...</p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full h-28 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50/30 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <div className="animate-spin w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full" />
          ) : (
            <>
              <Upload size={22} />
              <span className="text-sm font-medium">Audio yuklash</span>
              <span className="text-xs text-slate-400">MP3, WAV, OGG, M4A</span>
            </>
          )}
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      <input
        type="text"
        value={(block[captionField] as string) || ''}
        onChange={(e) => onChange({ [captionField]: e.target.value })}
        placeholder="Audio nomi / tavsifi (ixtiyoriy)"
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      />
    </div>
  );
}
