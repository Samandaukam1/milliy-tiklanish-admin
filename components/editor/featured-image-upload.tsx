'use client';

import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { uploadToStorage } from '@/lib/storage';

interface FeaturedImageUploadProps {
  url?: string;
  onChange: (url: string | undefined) => void;
}

export function FeaturedImageUpload({ url, onChange }: FeaturedImageUploadProps) {
  const [preview, setPreview] = useState<string | undefined>(url);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);

    try {
      const uploaded = await uploadToStorage('article-images', file, 'featured');
      setPreview(uploaded);
      onChange(uploaded);
    } catch (err) {
      // Keep local preview even if upload fails (Supabase not configured)
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
    onChange(undefined);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div>
      {preview ? (
        <div className="relative rounded-lg overflow-hidden border border-slate-200 group">
          <img src={preview} alt="Featured" className="w-full h-44 object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md text-slate-700 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
          >
            <X size={16} />
          </button>
          {uploading && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full h-36 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/30 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
          ) : (
            <>
              <Upload size={24} />
              <span className="text-sm font-medium">Asosiy rasm yuklash</span>
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
        }}
      />

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
