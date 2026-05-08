export type LangKey = 'uz' | 'uz_cy' | 'ru' | 'en';

export const LANG_TABS: { key: LangKey; label: string }[] = [
  { key: 'uz', label: "O'zbekcha" },
  { key: 'uz_cy', label: 'Ўзбекча' },
  { key: 'ru', label: 'Русский' },
  { key: 'en', label: 'English' },
];

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'quote'
  | 'image'
  | 'audio'
  | 'video'
  | 'divider';

export interface ContentBlock {
  id: string;
  type: BlockType;

  // paragraph + heading
  text_uz?: string;
  text_uz_cy?: string;
  text_ru?: string;
  text_en?: string;
  title_uz?: string;
  title_uz_cy?: string;
  title_ru?: string;
  title_en?: string;
  level?: 1 | 2 | 3; // heading level

  // quote
  quote_uz?: string;
  quote_uz_cy?: string;
  quote_ru?: string;
  quote_en?: string;
  attribution?: string;

  // image / audio / video (uploaded)
  media_url?: string;
  caption_uz?: string;
  caption_uz_cy?: string;
  caption_ru?: string;
  caption_en?: string;

  // video (external URL or same as media_url after upload)
  video_url?: string;

  // runtime-only: local object URL for preview before upload
  _localUrl?: string;
}

// Shared form data shape used by both new & edit article pages
export interface ArticleFormData {
  title_uz: string;
  title_uz_cy: string;
  title_ru: string;
  title_en: string;

  summary_uz: string;
  summary_uz_cy: string;
  summary_ru: string;
  summary_en: string;

  category_id: string;
  is_premium: boolean;
  is_published: boolean;
  featured_image_url?: string;
  audio_url?: string;
  content_blocks: ContentBlock[];

  // Author profile
  author_name?: string;
  author_image_url?: string;
  author_bio_uz?: string;
  author_bio_uz_cy?: string;
  author_bio_ru?: string;
  author_bio_en?: string;

  // Part 1: Tags & Keywords
  tags?: string[];
  keywords?: string[];

  // Part 2: Issue
  issue_id?: string;

  // Part 5: Premium price
  price?: number;
}

export const EMPTY_ARTICLE_FORM: ArticleFormData = {
  title_uz: '',
  title_uz_cy: '',
  title_ru: '',
  title_en: '',
  summary_uz: '',
  summary_uz_cy: '',
  summary_ru: '',
  summary_en: '',
  category_id: '',
  is_premium: false,
  is_published: false,
  featured_image_url: undefined,
  audio_url: undefined,
  content_blocks: [],
  author_name: '',
  author_image_url: undefined,
  author_bio_uz: '',
  author_bio_uz_cy: '',
  author_bio_ru: '',
  author_bio_en: '',
  tags: [],
  keywords: [],
  issue_id: undefined,
  price: undefined,
};
