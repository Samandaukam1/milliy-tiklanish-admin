'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  ExternalLink,
  Pencil,
  Eye,
  EyeOff,
  Film,
  Heart,
  Image as ImageIcon,
  Link2,
  Loader2,
  MessageCircle,
  Monitor,
  Plus,
  Smartphone,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Header } from '@/components/header';
import {
  deleteFromStorage,
  extractStoragePathFromPublicUrl,
  uploadAssetToStorage,
  type StorageBucket,
} from '@/lib/storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { MediaType, MediaVideo, MediaVideoSource } from '@/types';

const MEDIA_VIDEO_BUCKET: StorageBucket = 'media-videos';
const MEDIA_THUMBNAIL_BUCKET: StorageBucket = 'media-thumbnails';

interface ArticleOption {
  id: string;
  title: string;
}

type Feedback = {
  type: 'success' | 'error';
  text: string;
};

type FormErrorKey = 'title' | 'type' | 'video' | 'youtube_url';

interface MediaFormState {
  title: string;
  description: string;
  type: MediaType;
  video_source: MediaVideoSource;
  youtube_url: string;
  video_url: string;
  thumbnail_url: string;
  article_id: string;
  is_published: boolean;
  sort_order: number;
}

interface MediaFormSubmission extends MediaFormState {
  video_file: File | null;
  thumbnail_file: File | null;
}

type MediaRow = MediaVideo & {
  articles?: {
    title_uz: string;
  } | null;
};

const EMPTY_FORM: MediaFormState = {
  title: '',
  description: '',
  type: 'short',
  video_source: 'upload',
  youtube_url: '',
  video_url: '',
  thumbnail_url: '',
  article_id: '',
  is_published: false,
  sort_order: 1,
};

const DEMO_ARTICLES: ArticleOption[] = [
  { id: '1', title: 'Milliy iqtisodiyotning yangi imkoniyatlari' },
  { id: '2', title: "O'zbekiston siyosiy islohotlari 2026" },
  { id: '3', title: 'Yoshlar va sport: yangi avlod' },
  { id: '4', title: 'Texnologiya va innovatsiyalar' },
  { id: '5', title: "Madaniy meros: O'zbekiston tarixi" },
];

const DEMO_MEDIA: MediaVideo[] = [
  {
    id: 'demo-short-1',
    title: 'Prezident nutqidan 30 soniya',
    description: 'Qisqa format uchun tayyorlangan mobil video parcha.',
    type: 'short',
    video_source: 'upload',
    video_url: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4',
    thumbnail_url: 'https://picsum.photos/seed/milliy-short-1/360/640',
    article_id: '1',
    article_title: 'Milliy iqtisodiyotning yangi imkoniyatlari',
    is_published: true,
    sort_order: 1,
    views_count: 1284,
    likes_count: 231,
    comments_count: 18,
    created_at: '2026-05-01T09:15:00.000Z',
    updated_at: '2026-05-01T09:15:00.000Z',
  },
  {
    id: 'demo-short-2',
    title: 'Samarqand forumidan tezkor kadr',
    description: '9:16 vertikal formatda tayyorlangan tizer.',
    type: 'short',
    video_source: 'upload',
    video_url: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4',
    thumbnail_url: 'https://picsum.photos/seed/milliy-short-2/360/640',
    article_id: '2',
    article_title: "O'zbekiston siyosiy islohotlari 2026",
    is_published: false,
    sort_order: 2,
    views_count: 682,
    likes_count: 94,
    comments_count: 9,
    created_at: '2026-04-29T14:30:00.000Z',
    updated_at: '2026-04-29T14:30:00.000Z',
  },
  {
    id: 'demo-long-1',
    title: "O'zbekiston islohotlari: to'liq tahlil",
    description: 'Uzun formatdagi intervyu YouTube orqali ulangan.',
    type: 'long',
    video_source: 'youtube',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail_url: null,
    article_id: '2',
    article_title: "O'zbekiston siyosiy islohotlari 2026",
    is_published: true,
    sort_order: 1,
    views_count: 5408,
    likes_count: 607,
    comments_count: 74,
    created_at: '2026-04-27T12:10:00.000Z',
    updated_at: '2026-04-27T12:10:00.000Z',
  },
  {
    id: 'demo-long-2',
    title: 'Iqtisodiy islohotlar: studiya yozuvi',
    description: 'Tahririyat tomonidan yuklangan uzun video fayl.',
    type: 'long',
    video_source: 'upload',
    video_url: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4',
    thumbnail_url: 'https://picsum.photos/seed/milliy-long-2/640/360',
    article_id: '4',
    article_title: 'Texnologiya va innovatsiyalar',
    is_published: true,
    sort_order: 2,
    views_count: 2197,
    likes_count: 301,
    comments_count: 27,
    created_at: '2026-04-25T17:45:00.000Z',
    updated_at: '2026-04-25T17:45:00.000Z',
  },
];

function extractYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );

  return match ? match[1] : null;
}

function getYoutubeThumbnailUrl(url: string): string | null {
  const id = extractYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('uz-UZ').format(value);
}

function getFileNameFromUrl(url?: string | null): string {
  if (!url) return '';

  try {
    const parsed = new URL(url);
    return decodeURIComponent(parsed.pathname.split('/').pop() ?? '');
  } catch {
    return url.split('/').pop() ?? '';
  }
}

function getPreviewThumbnail(item: MediaVideo): string | null {
  if (item.thumbnail_url) return item.thumbnail_url;
  if (item.video_source === 'youtube') return getYoutubeThumbnailUrl(item.video_url);
  return null;
}

function StatusBadge({ published }: { published: boolean }) {
  return published ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      Nashr etilgan
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      Qoralama
    </span>
  );
}

function TypeBadge({ type }: { type: MediaType }) {
  return type === 'short' ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
      <Smartphone size={12} />
      Qisqa
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">
      <Monitor size={12} />
      Uzun
    </span>
  );
}

function SourceBadge({ source }: { source: MediaVideoSource }) {
  return source === 'upload' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
      <Upload size={11} />
      Fayl
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-[11px] font-medium text-red-700">
      <Link2 size={11} />
      YouTube
    </span>
  );
}

interface UploadSurfaceProps {
  label: string;
  hint: string;
  accept: string;
  kind: 'image' | 'video';
  previewUrl?: string | null;
  posterUrl?: string | null;
  fileName?: string | null;
  required?: boolean;
  note?: string;
  canRemove?: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
}

function UploadSurface({
  label,
  hint,
  accept,
  kind,
  previewUrl,
  posterUrl,
  fileName,
  required,
  note,
  canRemove,
  onSelect,
  onRemove,
}: UploadSurfaceProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isVideo = kind === 'video';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-800">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
      </div>

      {previewUrl ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {isVideo ? (
            <video
              controls
              preload="metadata"
              src={previewUrl}
              poster={posterUrl ?? undefined}
              className="h-64 w-full bg-slate-950 object-cover"
            />
          ) : (
            <img src={previewUrl} alt={label} className="h-56 w-full object-cover" />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">
                {fileName || (isVideo ? 'Yuklangan video fayl' : 'Yuklangan thumbnail')}
              </p>
              <p className="mt-1 text-xs text-slate-500">{note || hint}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Almashtirish
              </button>
              {canRemove && (
                <button
                  type="button"
                  onClick={onRemove}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  Olib tashlash
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-52 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 text-slate-500 transition-colors hover:border-blue-400 hover:bg-blue-50/40 hover:text-blue-700"
        >
          {isVideo ? <Film size={26} /> : <ImageIcon size={26} />}
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700">
              {isVideo ? 'Video fayl yuklash' : 'Thumbnail yuklash'}
            </p>
            <p className="mt-1 text-xs text-slate-400">{hint}</p>
          </div>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onSelect(file);
          event.target.value = '';
        }}
      />

      {note && !previewUrl && <p className="text-xs text-slate-500">{note}</p>}
    </div>
  );
}

interface MediaTableProps {
  items: MediaVideo[];
  emptyType: MediaType;
  onEdit: (item: MediaVideo) => void;
  onDelete: (item: MediaVideo) => void;
  onTogglePublish: (item: MediaVideo) => void;
}

function MediaTable({ items, emptyType, onEdit, onDelete, onTogglePublish }: MediaTableProps) {
  if (items.length === 0) {
    return (
      <div className="py-14 text-center text-slate-400">
        <div className="mb-4 flex justify-center">
          {emptyType === 'short' ? (
            <Smartphone size={34} className="text-slate-300" />
          ) : (
            <Monitor size={34} className="text-slate-300" />
          )}
        </div>
        <p className="text-sm font-medium text-slate-500">Hali video qo&apos;shilmagan</p>
        <p className="mt-1 text-xs text-slate-400">
          {emptyType === 'short'
            ? "Birinchi qisqa videoni yuklab qo'shing."
            : 'Uzun video uchun fayl yoki YouTube havola kiriting.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1120px]">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80">
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Preview</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Turi</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Sarlavha</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Maqola</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Holat</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Ko&apos;rish</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Layk</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Izoh</th>
            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Amallar</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {items.map((item) => {
            const preview = getPreviewThumbnail(item);

            return (
              <tr key={item.id} className="group transition-colors hover:bg-slate-50/80">
                <td className="px-4 py-4">
                  <div
                    className={`relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${
                      item.type === 'short' ? 'h-24 w-16' : 'h-16 w-28'
                    }`}
                  >
                    {preview ? (
                      <img src={preview} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        {item.video_source === 'youtube' ? <Link2 size={18} /> : <Film size={18} />}
                      </div>
                    )}

                    <div className="absolute bottom-1 right-1 rounded-full bg-slate-950/70 p-1 text-white">
                      {item.video_source === 'youtube' ? <Link2 size={11} /> : <Upload size={11} />}
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4 align-top">
                  <div className="flex flex-col gap-2">
                    <TypeBadge type={item.type} />
                    <SourceBadge source={item.video_source} />
                  </div>
                </td>

                <td className="px-4 py-4 align-top">
                  <div className="max-w-[300px] min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {item.description || 'Tavsif kiritilmagan'}
                    </p>
                    <a
                      href={item.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex max-w-full items-center gap-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700"
                    >
                      <ExternalLink size={12} />
                      <span className="truncate">
                        {item.video_source === 'youtube'
                          ? item.video_url.replace('https://', '')
                          : getFileNameFromUrl(item.video_url) || 'Video faylni ochish'}
                      </span>
                    </a>
                  </div>
                </td>

                <td className="px-4 py-4 align-top">
                  {item.article_title ? (
                    <div className="max-w-[220px]">
                      <p className="line-clamp-2 text-sm text-slate-700">{item.article_title}</p>
                    </div>
                  ) : (
                    <span className="text-xs italic text-slate-400">Bog&apos;lanmagan</span>
                  )}
                </td>

                <td className="px-4 py-4 align-top">
                  <div className="flex flex-col gap-2">
                    <StatusBadge published={item.is_published} />
                    <p className="text-xs text-slate-500">
                      #{item.sort_order} · {formatDate(item.created_at)}
                    </p>
                  </div>
                </td>

                <td className="px-4 py-4 align-top">
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-2 text-sm font-medium text-slate-700">
                    <BarChart3 size={14} className="text-slate-500" />
                    {formatNumber(item.views_count)}
                  </div>
                </td>

                <td className="px-4 py-4 align-top">
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-2 text-sm font-medium text-rose-700">
                    <Heart size={14} className="text-rose-500" />
                    {formatNumber(item.likes_count)}
                  </div>
                </td>

                <td className="px-4 py-4 align-top">
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-sm font-medium text-amber-700">
                    <MessageCircle size={14} className="text-amber-500" />
                    {formatNumber(item.comments_count)}
                  </div>
                </td>

                <td className="px-4 py-4 align-top">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      title="Tahrirlash"
                      className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onTogglePublish(item)}
                      title={item.is_published ? 'Qoralamaga qaytarish' : 'Nashr etish'}
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                    >
                      {item.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <a
                      href={item.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Videoni ochish"
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-700"
                    >
                      <ExternalLink size={16} />
                    </a>
                    <button
                      type="button"
                      onClick={() => onDelete(item)}
                      title="O'chirish"
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface MediaFormModalProps {
  open: boolean;
  initialType: MediaType;
  editItem: MediaVideo | null;
  articles: ArticleOption[];
  saving: boolean;
  onClose: () => void;
  onSave: (data: MediaFormSubmission) => Promise<void>;
}

function MediaFormModal({
  open,
  initialType,
  editItem,
  articles,
  saving,
  onClose,
  onSave,
}: MediaFormModalProps) {
  const [form, setForm] = useState<MediaFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<FormErrorKey, string>>>({});
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState('');
  const [videoFileName, setVideoFileName] = useState('');
  const [thumbnailFileName, setThumbnailFileName] = useState('');
  const videoObjectUrlRef = useRef<string | null>(null);
  const thumbnailObjectUrlRef = useRef<string | null>(null);

  const revokeObjectUrl = useCallback((value: string | null) => {
    if (value) URL.revokeObjectURL(value);
  }, []);

  const clearVideoObjectPreview = useCallback(() => {
    revokeObjectUrl(videoObjectUrlRef.current);
    videoObjectUrlRef.current = null;
  }, [revokeObjectUrl]);

  const clearThumbnailObjectPreview = useCallback(() => {
    revokeObjectUrl(thumbnailObjectUrlRef.current);
    thumbnailObjectUrlRef.current = null;
  }, [revokeObjectUrl]);

  useEffect(() => {
    return () => {
      clearVideoObjectPreview();
      clearThumbnailObjectPreview();
    };
  }, [clearThumbnailObjectPreview, clearVideoObjectPreview]);

  const initializeFormState = useCallback(() => {
    if (!open) {
      clearVideoObjectPreview();
      clearThumbnailObjectPreview();
      setVideoFile(null);
      setThumbnailFile(null);
      return;
    }

    clearVideoObjectPreview();
    clearThumbnailObjectPreview();

    if (editItem) {
      setForm({
        title: editItem.title,
        description: editItem.description,
        type: editItem.type,
        video_source: editItem.video_source,
        youtube_url: editItem.video_source === 'youtube' ? editItem.video_url : '',
        video_url: editItem.video_source === 'upload' ? editItem.video_url : '',
        thumbnail_url: editItem.thumbnail_url ?? '',
        article_id: editItem.article_id ?? '',
        is_published: editItem.is_published,
        sort_order: editItem.sort_order,
      });
      setVideoPreviewUrl(editItem.video_source === 'upload' ? editItem.video_url : '');
      setVideoFileName(editItem.video_source === 'upload' ? getFileNameFromUrl(editItem.video_url) : '');
      setThumbnailPreviewUrl(editItem.thumbnail_url ?? '');
      setThumbnailFileName(editItem.thumbnail_url ? getFileNameFromUrl(editItem.thumbnail_url) : '');
    } else {
      setForm({
        ...EMPTY_FORM,
        type: initialType,
        video_source: 'upload',
      });
      setVideoPreviewUrl('');
      setVideoFileName('');
      setThumbnailPreviewUrl('');
      setThumbnailFileName('');
    }

    setErrors({});
    setVideoFile(null);
    setThumbnailFile(null);
  }, [clearThumbnailObjectPreview, clearVideoObjectPreview, editItem, initialType, open]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        initializeFormState();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [initializeFormState]);

  const updateForm = <K extends keyof MediaFormState>(key: K, value: MediaFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));

    if (errors[key as FormErrorKey]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const handleTypeChange = (type: MediaType) => {
    setForm((prev) => ({
      ...prev,
      type,
      video_source: type === 'short' ? 'upload' : prev.video_source,
    }));
    setErrors((prev) => ({ ...prev, type: undefined, video: undefined, youtube_url: undefined }));
  };

  const handleSourceChange = (source: MediaVideoSource) => {
    setForm((prev) => ({ ...prev, video_source: source }));
    setErrors((prev) => ({ ...prev, video: undefined, youtube_url: undefined }));
  };

  const handleVideoFileSelect = (file: File) => {
    clearVideoObjectPreview();
    const nextPreview = URL.createObjectURL(file);
    videoObjectUrlRef.current = nextPreview;

    setVideoFile(file);
    setVideoPreviewUrl(nextPreview);
    setVideoFileName(file.name);
    setErrors((prev) => ({ ...prev, video: undefined }));
  };

  const handleThumbnailFileSelect = (file: File) => {
    clearThumbnailObjectPreview();
    const nextPreview = URL.createObjectURL(file);
    thumbnailObjectUrlRef.current = nextPreview;

    setThumbnailFile(file);
    setThumbnailPreviewUrl(nextPreview);
    setThumbnailFileName(file.name);
  };

  const handleRemoveVideo = () => {
    clearVideoObjectPreview();
    setVideoFile(null);
    setVideoPreviewUrl('');
    setVideoFileName('');
    setForm((prev) => ({
      ...prev,
      video_url: '',
    }));
  };

  const handleRemoveThumbnail = () => {
    clearThumbnailObjectPreview();
    setThumbnailFile(null);
    setThumbnailPreviewUrl('');
    setThumbnailFileName('');
    setForm((prev) => ({
      ...prev,
      thumbnail_url: '',
    }));
  };

  const validate = (): boolean => {
    const nextErrors: Partial<Record<FormErrorKey, string>> = {};

    if (!form.type) nextErrors.type = 'Video turi tanlanishi shart';
    if (!form.title.trim()) nextErrors.title = 'Sarlavha kiritilishi shart';

    if (form.type === 'short' && form.video_source !== 'upload') {
      nextErrors.video = "Qisqa video faqat yuklangan fayl bo'lishi kerak";
    }

    if (form.video_source === 'youtube') {
      if (form.type === 'short') {
        nextErrors.youtube_url = 'Qisqa video uchun YouTube havola ruxsat etilmaydi';
      } else if (!form.youtube_url.trim()) {
        nextErrors.youtube_url = 'YouTube havola kiritilishi shart';
      } else if (!extractYoutubeId(form.youtube_url)) {
        nextErrors.youtube_url = "Noto'g'ri YouTube havola";
      }
    } else if (!videoFile && !form.video_url) {
      nextErrors.video = 'Video fayl yuklanishi shart';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    await onSave({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      youtube_url: form.youtube_url.trim(),
      video_file: videoFile,
      thumbnail_file: thumbnailFile,
    });
  };

  const youtubePreview = getYoutubeThumbnailUrl(form.youtube_url);
  const thumbnailFallbackPreview = form.video_source === 'youtube' ? youtubePreview : null;
  const effectiveThumbnailPreview = thumbnailPreviewUrl || thumbnailFallbackPreview;
  const thumbnailHasCustomAsset = Boolean(thumbnailFile || form.thumbnail_url);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={saving ? undefined : onClose}
      />

      <div className="relative max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[28px] border border-white/70 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-6 py-5 backdrop-blur">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {editItem ? 'Videoni tahrirlash' : "Yangi video qo'shish"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {form.type === 'short'
                ? 'Qisqa videolar faqat upload qilinadi va 9:16 format tavsiya etiladi.'
                : 'Uzun videolar uchun upload yoki YouTube havola tanlang.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.15fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Asosiy sozlamalar</h3>

              <div className="mt-4 grid gap-5 lg:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-800">Video turi</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleTypeChange('short')}
                      className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                        form.type === 'short'
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Smartphone size={16} className="text-blue-600" />
                        Qisqa
                      </div>
                      <p className="mt-2 text-xs text-slate-500">Upload only · 9:16 tavsiya etiladi</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange('long')}
                      className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                        form.type === 'long'
                          ? 'border-violet-500 bg-violet-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Monitor size={16} className="text-violet-600" />
                        Uzun
                      </div>
                      <p className="mt-2 text-xs text-slate-500">Upload yoki YouTube</p>
                    </button>
                  </div>
                  {errors.type && <p className="text-xs text-red-600">{errors.type}</p>}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-800">Video manbasi</label>
                  {form.type === 'short' ? (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-800">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Qisqa videolar uchun YouTube havola bloklanadi</p>
                          <p className="mt-1 text-xs text-blue-700">Faqat yuklangan MP4, MOV yoki WebM fayl qabul qilinadi.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSourceChange('upload')}
                        className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                          form.video_source === 'upload'
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Upload size={16} />
                          Fayl upload
                        </div>
                        <p className={`mt-2 text-xs ${form.video_source === 'upload' ? 'text-slate-300' : 'text-slate-500'}`}>
                          Supabase Storage ga saqlanadi
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSourceChange('youtube')}
                        className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                          form.video_source === 'youtube'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Link2 size={16} />
                          YouTube URL
                        </div>
                        <p className={`mt-2 text-xs ${form.video_source === 'youtube' ? 'text-red-600' : 'text-slate-500'}`}>
                          Faqat uzun videolar uchun
                        </p>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-800">
                      Sarlavha <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(event) => updateForm('title', event.target.value)}
                      placeholder="Video sarlavhasini kiriting..."
                      className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:ring-2 focus:ring-blue-500 ${
                        errors.title ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
                      }`}
                    />
                    {errors.title && <p className="mt-2 text-xs text-red-600">{errors.title}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-800">Tavsif</label>
                    <textarea
                      value={form.description}
                      onChange={(event) => updateForm('description', event.target.value)}
                      rows={5}
                      placeholder="Qisqa tavsif yoki admin uchun izoh kiriting..."
                      className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-800">Bog&apos;liq maqola</label>
                    <select
                      value={form.article_id}
                      onChange={(event) => updateForm('article_id', event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Maqola tanlanmagan</option>
                      {articles.map((article) => (
                        <option key={article.id} value={article.id}>
                          {article.title}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-slate-500">Frontendda “Maqolani o‘qish” bog&apos;lanishi uchun ishlatiladi.</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-medium text-slate-800">Storage qoidalari</p>
                    <div className="mt-3 space-y-2 text-xs text-slate-500">
                      <p>Video bucket: <span className="font-medium text-slate-700">media-videos</span></p>
                      <p>Thumbnail bucket: <span className="font-medium text-slate-700">media-thumbnails</span></p>
                      <p>Qisqa video uchun 9:16 tavsiya etiladi.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="space-y-6">
                {form.video_source === 'upload' ? (
                  <div>
                    <UploadSurface
                      label="Video fayl"
                      hint={form.type === 'short' ? 'MP4, MOV, WebM · 9:16 tavsiya etiladi' : 'MP4, MOV, WebM · uzun video'}
                      accept="video/*"
                      kind="video"
                      previewUrl={videoPreviewUrl}
                      posterUrl={effectiveThumbnailPreview}
                      fileName={videoFileName}
                      required
                      note={
                        form.type === 'short'
                          ? 'Qisqa video uchun tashqi havola qabul qilinmaydi.'
                          : 'Uzun video fayli Supabase Storage ga yuklanadi.'
                      }
                      canRemove={Boolean(videoPreviewUrl)}
                      onSelect={handleVideoFileSelect}
                      onRemove={handleRemoveVideo}
                    />
                    {errors.video && <p className="mt-2 text-xs text-red-600">{errors.video}</p>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-800">
                      YouTube URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={form.youtube_url}
                      onChange={(event) => updateForm('youtube_url', event.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:ring-2 focus:ring-blue-500 ${
                        errors.youtube_url ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
                      }`}
                    />
                    {errors.youtube_url && <p className="text-xs text-red-600">{errors.youtube_url}</p>}

                    {youtubePreview && !errors.youtube_url && (
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <img src={youtubePreview} alt="YouTube preview" className="h-52 w-full object-cover" />
                        <div className="flex items-center justify-between gap-3 p-4">
                          <div>
                            <p className="text-sm font-medium text-slate-900">YouTube preview aniqlandi</p>
                            <p className="mt-1 text-xs text-slate-500">Alohida thumbnail yuklamasangiz, list preview shu ko&apos;rinishda chiqadi.</p>
                          </div>
                          <a
                            href={form.youtube_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-white"
                          >
                            Ochish
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <UploadSurface
                    label="Thumbnail"
                    hint="PNG, JPG, WebP · ixtiyoriy, lekin tavsiya etiladi"
                    accept="image/*"
                    kind="image"
                    previewUrl={effectiveThumbnailPreview}
                    fileName={thumbnailFileName || (thumbnailHasCustomAsset ? getFileNameFromUrl(form.thumbnail_url) : '')}
                    note={
                      thumbnailHasCustomAsset
                        ? 'Custom thumbnail saqlanadi.'
                        : form.video_source === 'youtube' && youtubePreview
                          ? 'Thumbnail yuklanmasa, YouTube preview ishlatiladi.'
                          : 'Thumbnail ixtiyoriy, lekin admin list preview uchun tavsiya etiladi.'
                    }
                    canRemove={thumbnailHasCustomAsset}
                    onSelect={handleThumbnailFileSelect}
                    onRemove={handleRemoveThumbnail}
                  />
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Nashr sozlamalari</h3>

              <div className="mt-4 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-800">Sort order</label>
                  <input
                    type="number"
                    min={1}
                    value={form.sort_order}
                    onChange={(event) => updateForm('sort_order', Math.max(1, parseInt(event.target.value, 10) || 1))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800">Holat</label>
                  <label className="mt-3 flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {form.is_published ? 'Nashr etilgan' : 'Qoralama'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        O&apos;chirilmagan holda keyinroq nashrga chiqarish mumkin.
                      </p>
                    </div>
                    <div className="relative flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={form.is_published}
                        onChange={(event) => updateForm('is_published', event.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-blue-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
                    </div>
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Checklist</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-200">
                <p>• Sarlavha majburiy.</p>
                <p>• Qisqa video uchun YouTube bloklanadi.</p>
                <p>• Upload video va thumbnail public URL ko&apos;rinishida saqlanadi.</p>
                <p>• Thumbnail ixtiyoriy, lekin list preview uchun foydali.</p>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {saving ? 'Saqlanmoqda...' : editItem ? 'Saqlash' : "Qo'shish"}
                </button>
              </div>
            </section>
          </aside>
        </form>
      </div>
    </div>
  );
}

export default function MediaPage() {
  const hasSupabase = isSupabaseConfigured();
  const [items, setItems] = useState<MediaVideo[]>(hasSupabase ? [] : DEMO_MEDIA);
  const [articles, setArticles] = useState<ArticleOption[]>(hasSupabase ? [] : DEMO_ARTICLES);
  const [loading, setLoading] = useState(hasSupabase);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<MediaType>('short');
  const [editItem, setEditItem] = useState<MediaVideo | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<MediaVideo | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const fetchData = useCallback(async () => {
    if (!hasSupabase) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [mediaRes, articlesRes] = await Promise.all([
        supabase
          .from('media_videos')
          .select('*, articles!article_id(title_uz)')
          .order('type', { ascending: true })
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false }),
        supabase
          .from('articles')
          .select('id, title_uz')
          .order('created_at', { ascending: false }),
      ]);

      if (mediaRes.error) throw new Error(mediaRes.error.message);
      if (articlesRes.error) throw new Error(articlesRes.error.message);

      const mediaRows = (mediaRes.data ?? []) as MediaRow[];
      const articleRows = (articlesRes.data ?? []) as { id: string; title_uz: string }[];

      setItems(
        mediaRows.map((row) => ({
          ...row,
          article_title: row.articles?.title_uz ?? undefined,
        }))
      );
      setArticles(articleRows.map((article) => ({ id: article.id, title: article.title_uz })));
    } catch (error) {
      setItems([]);
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Media videolarni yuklab bo\'lmadi.',
      });
    } finally {
      setLoading(false);
    }
  }, [hasSupabase]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        void fetchData();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  const shorts = items
    .filter((item) => item.type === 'short')
    .sort((left, right) => left.sort_order - right.sort_order || right.created_at.localeCompare(left.created_at));
  const longs = items
    .filter((item) => item.type === 'long')
    .sort((left, right) => left.sort_order - right.sort_order || right.created_at.localeCompare(left.created_at));

  const totalPublished = items.filter((item) => item.is_published).length;
  const totalViews = items.reduce((sum, item) => sum + item.views_count, 0);

  const openCreate = (type: MediaType) => {
    setEditItem(null);
    setModalType(type);
    setModalOpen(true);
  };

  const openEdit = (item: MediaVideo) => {
    setEditItem(item);
    setModalType(item.type);
    setModalOpen(true);
  };

  const handleSave = async (submission: MediaFormSubmission) => {
    const currentEditItem = editItem;
    const articleTitle = articles.find((article) => article.id === submission.article_id)?.title;
    const newUploads: Array<{ bucket: StorageBucket; path: string }> = [];
    const obsoleteUploads: Array<{ bucket: StorageBucket; path: string }> = [];

    const previousVideoPath =
      currentEditItem?.video_source === 'upload'
        ? extractStoragePathFromPublicUrl(MEDIA_VIDEO_BUCKET, currentEditItem.video_url)
        : null;
    const previousThumbnailPath =
      extractStoragePathFromPublicUrl(MEDIA_THUMBNAIL_BUCKET, currentEditItem?.thumbnail_url ?? null);

    let nextVideoUrl =
      submission.video_source === 'youtube'
        ? submission.youtube_url
        : submission.video_url;
    let nextThumbnailUrl = submission.thumbnail_url || null;

    setSaving(true);
    setFeedback(null);

    try {
      if (submission.video_source === 'upload' && submission.video_file) {
        const uploadedVideo = await uploadAssetToStorage(
          MEDIA_VIDEO_BUCKET,
          submission.video_file,
          submission.type === 'short' ? 'shorts' : 'longs'
        );
        newUploads.push({ bucket: MEDIA_VIDEO_BUCKET, path: uploadedVideo.path });
        nextVideoUrl = uploadedVideo.publicUrl;

        if (previousVideoPath && previousVideoPath !== uploadedVideo.path) {
          obsoleteUploads.push({ bucket: MEDIA_VIDEO_BUCKET, path: previousVideoPath });
        }
      }

      if (submission.video_source === 'youtube' && previousVideoPath) {
        obsoleteUploads.push({ bucket: MEDIA_VIDEO_BUCKET, path: previousVideoPath });
      }

      if (submission.thumbnail_file) {
        const uploadedThumbnail = await uploadAssetToStorage(
          MEDIA_THUMBNAIL_BUCKET,
          submission.thumbnail_file,
          submission.type === 'short' ? 'shorts' : 'longs'
        );
        newUploads.push({ bucket: MEDIA_THUMBNAIL_BUCKET, path: uploadedThumbnail.path });
        nextThumbnailUrl = uploadedThumbnail.publicUrl;

        if (previousThumbnailPath && previousThumbnailPath !== uploadedThumbnail.path) {
          obsoleteUploads.push({ bucket: MEDIA_THUMBNAIL_BUCKET, path: previousThumbnailPath });
        }
      } else if (!submission.thumbnail_url && previousThumbnailPath) {
        obsoleteUploads.push({ bucket: MEDIA_THUMBNAIL_BUCKET, path: previousThumbnailPath });
        nextThumbnailUrl = null;
      }

      const now = new Date().toISOString();
      const payload = {
        title: submission.title,
        description: submission.description,
        type: submission.type,
        video_source: submission.video_source,
        video_url: nextVideoUrl,
        thumbnail_url: nextThumbnailUrl,
        article_id: submission.article_id || null,
        is_published: submission.is_published,
        sort_order: submission.sort_order,
        updated_at: now,
      };

      if (hasSupabase) {
        if (currentEditItem) {
          const { error } = await supabase
            .from('media_videos')
            .update(payload)
            .eq('id', currentEditItem.id);

          if (error) throw new Error(error.message);

          setItems((prev) =>
            prev.map((item) =>
              item.id === currentEditItem.id
                ? {
                    ...item,
                    ...payload,
                    article_title: articleTitle,
                  }
                : item
            )
          );
          setFeedback({ type: 'success', text: 'Media yangilandi.' });
        } else {
          const { data, error } = await supabase
            .from('media_videos')
            .insert([{ ...payload }])
            .select('*')
            .single();

          if (error) throw new Error(error.message);

          const inserted = data as MediaVideo;
          setItems((prev) => [
            {
              ...inserted,
              article_title: articleTitle,
            },
            ...prev,
          ]);
          setFeedback({ type: 'success', text: 'Video muvaffaqiyatli yaratildi.' });
        }
      } else {
        if (currentEditItem) {
          setItems((prev) =>
            prev.map((item) =>
              item.id === currentEditItem.id
                ? {
                    ...item,
                    ...payload,
                    article_title: articleTitle,
                  }
                : item
            )
          );
          setFeedback({ type: 'success', text: 'Media yangilandi.' });
        } else {
          const createdAt = new Date().toISOString();
          setItems((prev) => [
            {
              id: `${Date.now()}`,
              title: payload.title,
              description: payload.description,
              type: payload.type,
              video_source: payload.video_source,
              video_url: payload.video_url,
              thumbnail_url: payload.thumbnail_url,
              article_id: payload.article_id,
              article_title: articleTitle,
              is_published: payload.is_published,
              sort_order: payload.sort_order,
              views_count: 0,
              likes_count: 0,
              comments_count: 0,
              created_at: createdAt,
              updated_at: createdAt,
            },
            ...prev,
          ]);
          setFeedback({ type: 'success', text: "Demo rejimda video qo'shildi." });
        }
      }

      setModalOpen(false);
      setEditItem(null);

      await Promise.allSettled(
        obsoleteUploads.map(({ bucket, path }) => deleteFromStorage(bucket, path))
      );
    } catch (error) {
      await Promise.allSettled(
        newUploads.map(({ bucket, path }) => deleteFromStorage(bucket, path))
      );

      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Videoni saqlab bo\'lmadi.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: MediaVideo) => {
    const videoPath =
      item.video_source === 'upload'
        ? extractStoragePathFromPublicUrl(MEDIA_VIDEO_BUCKET, item.video_url)
        : null;
    const thumbnailPath = extractStoragePathFromPublicUrl(
      MEDIA_THUMBNAIL_BUCKET,
      item.thumbnail_url ?? null
    );

    try {
      if (hasSupabase) {
        const { error } = await supabase.from('media_videos').delete().eq('id', item.id);
        if (error) throw new Error(error.message);
      }

      await Promise.allSettled([
        deleteFromStorage(MEDIA_VIDEO_BUCKET, videoPath),
        deleteFromStorage(MEDIA_THUMBNAIL_BUCKET, thumbnailPath),
      ]);

      setItems((prev) => prev.filter((current) => current.id !== item.id));
      setDeleteConfirm(null);
      setFeedback({ type: 'success', text: "Video o'chirildi." });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Videoni o\'chirib bo\'lmadi.',
      });
    }
  };

  const handleTogglePublish = async (item: MediaVideo) => {
    const nextPublished = !item.is_published;

    try {
      if (hasSupabase) {
        const { error } = await supabase
          .from('media_videos')
          .update({ is_published: nextPublished, updated_at: new Date().toISOString() })
          .eq('id', item.id);

        if (error) throw new Error(error.message);
      }

      setItems((prev) =>
        prev.map((current) =>
          current.id === item.id ? { ...current, is_published: nextPublished } : current
        )
      );
      setFeedback({
        type: 'success',
        text: nextPublished ? 'Video nashrga chiqarildi.' : 'Video qoralamaga qaytarildi.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Holatni yangilab bo\'lmadi.',
      });
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <Header title="Media" subtitle="Qisqa va uzun videolarni upload qilib boshqaring" />

      <div className="flex-1 space-y-8 p-8">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-sm">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">Media Control</p>
              <h2 className="mt-3 text-2xl font-semibold leading-tight">
                Upload qilingan short videolar va YouTube yoki fayl bilan bog&apos;langan long videolar bitta panelda.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                Short videolar faqat Supabase Storage ga yuklanadi. Long videolar esa upload yoki YouTube havola orqali yuritiladi. Thumbnail alohida saqlanadi va admin list preview&apos;da ko&apos;rinadi.
              </p>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Shorts</p>
                <p className="mt-2 text-sm text-slate-100">Upload only · 9:16 tavsiya</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Storage</p>
                <p className="mt-2 text-sm text-slate-100">media-videos va media-thumbnails</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Long Videos</p>
                <p className="mt-2 text-sm text-slate-100">Upload yoki YouTube qo&apos;llab-quvvatlanadi</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-2">
            {[
              { label: 'Jami video', value: items.length, tone: 'text-slate-900' },
              { label: 'Nashr etilgan', value: totalPublished, tone: 'text-green-700' },
              { label: 'Qisqa', value: shorts.length, tone: 'text-blue-700' },
              { label: 'Ko\'rishlar', value: totalViews, tone: 'text-violet-700', formatter: formatNumber },
            ].map(({ label, value, tone, formatter }) => (
              <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
                <p className={`mt-3 text-3xl font-semibold ${tone}`}>
                  {formatter ? formatter(value) : value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {!hasSupabase && (
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            <strong>Demo rejim:</strong> Supabase sozlanmagan. Yuklangan fayllar faqat shu sessiya ichida ko&apos;rinadi.
          </div>
        )}

        {feedback && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              feedback.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-green-200 bg-green-50 text-green-700'
            }`}
          >
            {feedback.text}
          </div>
        )}

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/80 to-transparent px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100">
                <Smartphone size={18} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Qisqa videolar</h2>
                <p className="mt-1 text-sm text-slate-500">Upload only · 9:16 tavsiya etiladi · {shorts.length} ta video</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openCreate('short')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Plus size={16} />
              Qisqa video qo&apos;shish
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-blue-600" />
            </div>
          ) : (
            <MediaTable
              items={shorts}
              emptyType="short"
              onEdit={openEdit}
              onDelete={setDeleteConfirm}
              onTogglePublish={handleTogglePublish}
            />
          )}
        </section>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-violet-50/80 to-transparent px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100">
                <Monitor size={18} className="text-violet-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Uzun videolar</h2>
                <p className="mt-1 text-sm text-slate-500">Upload yoki YouTube · {longs.length} ta video</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openCreate('long')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-violet-700"
            >
              <Plus size={16} />
              Uzun video qo&apos;shish
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-violet-600" />
            </div>
          ) : (
            <MediaTable
              items={longs}
              emptyType="long"
              onEdit={openEdit}
              onDelete={setDeleteConfirm}
              onTogglePublish={handleTogglePublish}
            />
          )}
        </section>
      </div>

      <MediaFormModal
        open={modalOpen}
        initialType={modalType}
        editItem={editItem}
        articles={articles}
        saving={saving}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />

          <div className="relative w-full max-w-md rounded-[28px] border border-white/70 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Videoni o&apos;chirish</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              <span className="font-medium text-slate-900">{deleteConfirm.title}</span> bazadan o&apos;chiriladi.
              Upload qilingan fayl va thumbnail ham best-effort tarzda storage&apos;dan olib tashlanadi.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                O&apos;chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
