'use client';

import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { ContentBlock, LangKey } from '@/types/blocks';
import { uploadToStorage } from '@/lib/storage';

interface Props {
  block: ContentBlock;
  activeLang: LangKey;
  onChange: (updates: Partial<ContentBlock>) => void;
}

export function ImageBlock({ block, activeLang, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const captionField = `caption_${activeLang}` as keyof ContentBlock;
  const displayUrl = block._localUrl || block.media_url;

  const handleFile = async (file: File) => {
    setError(null);
    const localUrl = URL.createObjectURL(file);
    onChange({ _localUrl: localUrl });
    setUploading(true);

    try {
      const url = await uploadToStorage('article-images', file, 'images');
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
      {displayUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-slate-200 group">
          <img
            src={displayUrl}
            alt="Block image"
            className="w-full max-h-72 object-cover"
          />
          <button
            type="button"
            onClick={() => onChange({ media_url: undefined, _localUrl: undefined })}
            className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md text-slate-700 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
          >
            <X size={16} />
          </button>
          {uploading && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full h-32 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-green-400 hover:text-green-600 hover:bg-green-50/30 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <div className="animate-spin w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full" />
          ) : (
            <>
              <Upload size={22} />
              <span className="text-sm font-medium">Rasm yuklash</span>
              <span className="text-xs text-slate-400">PNG, JPG, WebP</span>
            </>
          )}
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
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
        placeholder="Rasm tavsifi / caption (ixtiyoriy)"
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      />
    </div>
  );
}
