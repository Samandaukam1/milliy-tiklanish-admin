'use client';

import { useRef, useState } from 'react';
import { Upload, X, Mic, Play } from 'lucide-react';
import { uploadToStorage } from '@/lib/storage';

interface ArticleAudioUploadProps {
  url?: string;
  onChange: (url: string | undefined) => void;
}

export function ArticleAudioUpload({ url, onChange }: ArticleAudioUploadProps) {
  const [preview, setPreview] = useState<string | undefined>(url);
  const [filename, setFilename] = useState<string | undefined>(
    url ? url.split('/').pop() : undefined
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setFilename(file.name);
    setUploading(true);

    try {
      const uploaded = await uploadToStorage('article-audio', file);
      setPreview(uploaded);
      onChange(uploaded);
    } catch (err) {
      onChange(localUrl);
      if (err instanceof Error && !err.message.includes('placeholder')) {
        setError(err.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(undefined);
    setFilename(undefined);
    onChange(undefined);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div>
      {preview ? (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mic size={16} className="text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-orange-900 truncate max-w-[240px]">
                  {filename ?? 'Audio fayl'}
                </p>
                <p className="text-xs text-orange-600 mt-0.5">
                  {uploading ? 'Yuklanmoqda...' : 'Maqola audio versiyasi'}
                </p>
              </div>
            </div>
            {!uploading && (
              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 text-orange-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Audioyi o'chirish"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Native audio player */}
          <audio controls src={preview} className="w-full h-9" />

          {uploading && (
            <div className="flex items-center gap-2 mt-2">
              <div className="animate-spin w-4 h-4 border-2 border-orange-200 border-t-orange-600 rounded-full flex-shrink-0" />
              <p className="text-xs text-orange-600">Supabase Storage ga yuklanmoqda...</p>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full h-24 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center gap-4 text-slate-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50/30 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <div className="animate-spin w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full" />
          ) : (
            <>
              <div className="flex flex-col items-center gap-1">
                <Upload size={22} />
                <span className="text-sm font-medium">Audio yuklash</span>
                <span className="text-xs text-slate-400">MP3, WAV, OGG, M4A</span>
              </div>
              <div className="w-px h-12 bg-slate-200" />
              <div className="flex flex-col items-center gap-1 text-slate-400">
                <Play size={16} />
                <span className="text-xs text-center leading-tight">
                  Tahririyat<br />radiosi
                </span>
              </div>
            </>
          )}
        </button>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

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
    </div>
  );
}
