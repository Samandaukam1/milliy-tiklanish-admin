import type { ContentBlock } from './blocks';

// Supabase Auth-linked profile
export interface Profile {
  id: string;
  full_name?: string;
  role: 'admin' | 'editor' | 'viewer';
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Row in the article_blocks table
export interface ArticleBlock {
  id: string;
  article_id: string;
  sort_order: number;
  type: string;

  text_uz?: string;
  text_uz_cy?: string;
  text_ru?: string;
  text_en?: string;
  title_uz?: string;
  title_uz_cy?: string;
  title_ru?: string;
  title_en?: string;
  level?: number;

  quote_uz?: string;
  quote_uz_cy?: string;
  quote_ru?: string;
  quote_en?: string;
  attribution?: string;

  media_url?: string;
  caption_uz?: string;
  caption_uz_cy?: string;
  caption_ru?: string;
  caption_en?: string;

  video_url?: string;
  created_at: string;
}

// Multilingual article structure
export interface Article {
  id: string;
  title_uz: string;
  title_uz_cy: string;
  title_ru: string;
  title_en: string;

  summary_uz: string;
  summary_uz_cy: string;
  summary_ru: string;
  summary_en: string;

  content_uz: string;
  content_uz_cy: string;
  content_ru: string;
  content_en: string;

  category_id: string;
  category?: Category;

  is_premium: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  featured_image_url?: string;

  author_id?: string;
  view_count: number;
  audio_url?: string;
  article_blocks?: ArticleBlock[];
  content_blocks?: ContentBlock[]; // legacy JSONB fallback

  // Inline author profile (stored directly on the article row)
  author_name?: string;
  author_image_url?: string;
  author_bio_uz?: string;
  author_bio_uz_cy?: string;
  author_bio_ru?: string;
  author_bio_en?: string;

  // Part 1: Tags & Keywords
  tags?: string[];
  keywords?: string[];

  // Part 2: Issue link
  issue_id?: string;
  issue_sort_order?: number;

  // Part 5: Premium
  price?: number;

  // Reader submission tracking
  source?: string;
  submission_id?: string;
}

export interface Category {
  id: string;
  name_uz: string;
  name_uz_cy: string;
  name_ru: string;
  name_en: string;
  slug: string;
  description_uz?: string;
  description_uz_cy?: string;
  description_ru?: string;
  description_en?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'editor' | 'viewer';
  created_at: string;
  last_login?: string;
  is_active: boolean;
}

export type MediaType = 'short' | 'long';
export type MediaVideoSource = 'upload' | 'youtube';

export interface MediaVideo {
  id: string;
  title: string;
  description: string;
  type: MediaType;
  video_source: MediaVideoSource;
  video_url: string;
  thumbnail_url?: string | null;
  article_id?: string | null;
  article_title?: string;
  is_published: boolean;
  sort_order: number;
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
}

export interface YoutubeMedia {
  id: string;
  title: string;
  type: 'short' | 'long';
  youtube_url: string;
  article_id: string;
  article_title?: string;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at?: string;
}

// Part 2: Newspaper Issue
export interface Issue {
  id: string;
  title: string;
  cover_image_url?: string;
  cover_image_cy_url?: string;
  pdf_url?: string;
  publish_date?: string;
  created_at: string;
  updated_at: string;
  articles?: Article[];
}

// Part 6: Author
export interface Author {
  id: string;
  name: string;
  image_url?: string;
  bio_uz?: string;
  bio_uz_cy?: string;
  bio_ru?: string;
  bio_en?: string;
  rating: number;
  popularity: number;
  created_at: string;
  updated_at: string;
}

// Part 7: Editorial team member
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  photo_url?: string;
}

// Social settings — single row in public.social_settings
export interface SocialSettings {
  id: string;

  // Section title (multilingual)
  title_uz: string;
  title_ru: string;
  title_en: string;

  // URLs
  telegram_url: string;
  instagram_url: string;
  youtube_url: string;
  facebook_url: string;
  twitter_url: string;
  tiktok_url: string;

  // Visibility toggles
  telegram_enabled: boolean;
  instagram_enabled: boolean;
  youtube_enabled: boolean;
  facebook_enabled: boolean;
  twitter_enabled: boolean;
  tiktok_enabled: boolean;

  updated_at: string;
}

// Part 7: Editorial page
export interface EditorialPage {
  id: string;
  description: string;
  team_members: TeamMember[];
  updated_at: string;
}

// Part 8: Site settings
export interface SiteSetting {
  key: string;
  value: string;
}

// Part 9: Editorial recommendations ("Tahririyat tavsiya qiladi")
export interface EditorialRecommendation {
  id: string;
  article_id: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  article?: Article;
}

// Part 10: Reader Article Submissions
export type ReaderSubmissionStatus = 'new' | 'reviewing' | 'transferred' | 'rejected';

export interface ReaderSubmission {
  id: string;
  title: string;
  anons: string;
  body: string;
  cover_url?: string;
  category_id?: string;
  category?: Category;
  author_name: string;
  author_bio: string;
  phone: string;
  telegram: string;
  status: ReaderSubmissionStatus;
  transferred_article_id?: string;
  created_at: string;
  updated_at: string;
}
