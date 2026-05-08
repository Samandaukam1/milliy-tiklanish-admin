'use client';

import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { ContentBlock, LangKey } from '@/types/blocks';

interface Props {
  block: ContentBlock;
  activeLang: LangKey;
  onChange: (updates: Partial<ContentBlock>) => void;
}

function getYoutubeEmbedUrl(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

function isValidYoutubeUrl(url: string): boolean {
  return getYoutubeEmbedUrl(url) !== null;
}

export function VideoBlock({ block, activeLang, onChange }: Props) {
  const [inputValue, setInputValue] = useState(block.video_url || '');
  const captionField = `caption_${activeLang}` as keyof ContentBlock;

  const embedUrl = block.video_url ? getYoutubeEmbedUrl(block.video_url) : null;
  const isTyping = inputValue !== block.video_url;
  const showError = inputValue.length > 0 && !isValidYoutubeUrl(inputValue);

  const handleUrlCommit = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) {
      onChange({ video_url: undefined, media_url: undefined, _localUrl: undefined });
    } else if (isValidYoutubeUrl(trimmed)) {
      onChange({ video_url: trimmed, media_url: trimmed, _localUrl: undefined });
    }
  };

  const handleRemove = () => {
    setInputValue('');
    onChange({ video_url: undefined, media_url: undefined, _localUrl: undefined });
  };

  return (
    <div className="space-y-3">
      {/* URL input — always visible so the value can be edited */}
      <div>
        <div className="flex items-center gap-2">
          {/* YouTube wordmark */}
          <span className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-red-600">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            YouTube
          </span>
          <input
            type="url"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={(e) => handleUrlCommit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleUrlCommit(inputValue);
              }
            }}
            placeholder="https://www.youtube.com/watch?v=... yoki youtu.be/..."
            className={`flex-1 px-3 py-2 border rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-colors ${
              showError
                ? 'border-red-400 bg-red-50 focus:ring-red-400'
                : embedUrl
                ? 'border-green-400 bg-green-50 focus:ring-green-400'
                : 'border-slate-300 focus:ring-red-400'
            }`}
          />
          {(inputValue || block.video_url) && (
            <button
              type="button"
              onClick={handleRemove}
              className="flex-shrink-0 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Videoni o'chirish"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {showError && (
          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1.5">
            <AlertCircle size={12} className="flex-shrink-0" />
            Noto&apos;g&apos;ri YouTube URL. youtube.com yoki youtu.be manzilini kiriting.
          </p>
        )}

        {isTyping && !showError && inputValue && (
          <p className="mt-1.5 text-xs text-slate-400">
            Enter bosing yoki maydondan chiqing — embed ko&apos;rsatiladi.
          </p>
        )}
      </div>

      {/* Live embed preview */}
      {embedUrl && !isTyping && (
        <div className="rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-100">
          <iframe
            src={embedUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      )}

      {/* Caption */}
      <input
        type="text"
        value={(block[captionField] as string) || ''}
        onChange={(e) => onChange({ [captionField]: e.target.value })}
        placeholder="Video tavsifi (ixtiyoriy)"
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
      />
    </div>
  );
}
