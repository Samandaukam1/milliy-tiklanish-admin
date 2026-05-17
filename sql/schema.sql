-- ============================================================
-- Milliy Tiklanish — Database Schema
-- Run this in the Supabase SQL editor to set up all tables.
-- ============================================================

-- Profiles table (linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  role      VARCHAR(50) DEFAULT 'editor', -- 'admin' | 'editor' | 'viewer'
  avatar_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_uz    VARCHAR(255) NOT NULL,
  name_uz_cy VARCHAR(255) NOT NULL DEFAULT '',
  name_ru    VARCHAR(255) NOT NULL DEFAULT '',
  name_en    VARCHAR(255) NOT NULL DEFAULT '',
  slug       VARCHAR(255) UNIQUE NOT NULL,
  description_uz    TEXT DEFAULT '',
  description_uz_cy TEXT DEFAULT '',
  description_ru    TEXT DEFAULT '',
  description_en    TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Migration: add new columns to existing categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description_uz    TEXT DEFAULT '';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description_uz_cy TEXT DEFAULT '';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description_ru    TEXT DEFAULT '';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description_en    TEXT DEFAULT '';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active  BOOLEAN NOT NULL DEFAULT true;

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- URL slug (auto-generated from title_uz, unique)
  slug          VARCHAR(500) UNIQUE,

  -- Multilingual titles
  title_uz      VARCHAR(500) NOT NULL,
  title_uz_cy   VARCHAR(500) NOT NULL DEFAULT '',
  title_ru      VARCHAR(500) NOT NULL DEFAULT '',
  title_en      VARCHAR(500) NOT NULL DEFAULT '',

  -- Multilingual summaries
  summary_uz    TEXT NOT NULL DEFAULT '',
  summary_uz_cy TEXT NOT NULL DEFAULT '',
  summary_ru    TEXT NOT NULL DEFAULT '',
  summary_en    TEXT NOT NULL DEFAULT '',

  -- Multilingual body (legacy plain-text fallback)
  content_uz    TEXT NOT NULL DEFAULT '',
  content_uz_cy TEXT NOT NULL DEFAULT '',
  content_ru    TEXT NOT NULL DEFAULT '',
  content_en    TEXT NOT NULL DEFAULT '',

  -- Media
  featured_image_url VARCHAR(500),
  audio_url          VARCHAR(500),

  -- Relations & flags
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  author_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_premium    BOOLEAN DEFAULT false,
  is_published  BOOLEAN DEFAULT false,
  view_count   INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Article blocks table
-- Each block's editor-specific fields are stored in `content` (JSONB).
-- Only 5 structural columns are required in the DB.
CREATE TABLE IF NOT EXISTS article_blocks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  type       VARCHAR(20) NOT NULL,  -- 'paragraph'|'heading'|'quote'|'image'|'audio'|'video'|'divider'
  content    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Media videos table (uploaded files + YouTube support)
CREATE TABLE IF NOT EXISTS media_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          VARCHAR(255) NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  type           VARCHAR(10) NOT NULL CHECK (type IN ('short', 'long')),
  video_source   VARCHAR(10) NOT NULL DEFAULT 'upload' CHECK (video_source IN ('upload', 'youtube')),
  video_url      VARCHAR(500) NOT NULL,
  thumbnail_url  VARCHAR(500),
  article_id     UUID REFERENCES articles(id) ON DELETE SET NULL,
  is_published   BOOLEAN DEFAULT false,
  sort_order     INTEGER DEFAULT 1,
  views_count    INTEGER DEFAULT 0,
  likes_count    INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE media_videos ADD COLUMN IF NOT EXISTS description    TEXT NOT NULL DEFAULT '';
ALTER TABLE media_videos ADD COLUMN IF NOT EXISTS video_source   VARCHAR(10) NOT NULL DEFAULT 'upload';
ALTER TABLE media_videos ADD COLUMN IF NOT EXISTS video_url      VARCHAR(500);
ALTER TABLE media_videos ADD COLUMN IF NOT EXISTS thumbnail_url  VARCHAR(500);
ALTER TABLE media_videos ADD COLUMN IF NOT EXISTS article_id     UUID;
ALTER TABLE media_videos ADD COLUMN IF NOT EXISTS views_count    INTEGER DEFAULT 0;
ALTER TABLE media_videos ADD COLUMN IF NOT EXISTS likes_count    INTEGER DEFAULT 0;
ALTER TABLE media_videos ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

UPDATE media_videos
SET video_url = video_path
WHERE (video_url IS NULL OR video_url = '')
  AND video_path IS NOT NULL
  AND video_path LIKE 'http%';

UPDATE media_videos
SET thumbnail_url = thumbnail_path
WHERE (thumbnail_url IS NULL OR thumbnail_url = '')
  AND thumbnail_path IS NOT NULL
  AND thumbnail_path LIKE 'http%';

ALTER TABLE media_videos DROP COLUMN IF EXISTS video_path;
ALTER TABLE media_videos DROP COLUMN IF EXISTS thumbnail_path;

-- Keep exactly one articles relationship: media_videos.article_id -> articles.id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'media_videos'
      AND column_name = 'linked_article_id'
  ) THEN
    EXECUTE '
      UPDATE media_videos
      SET article_id = COALESCE(article_id, linked_article_id)
      WHERE article_id IS NULL AND linked_article_id IS NOT NULL
    ';
  END IF;
END $$;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'media_videos'
      AND con.contype = 'f'
      AND con.confrelid = 'public.articles'::regclass
  LOOP
    EXECUTE format('ALTER TABLE media_videos DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE media_videos DROP COLUMN IF EXISTS linked_article_id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'media_videos'
      AND column_name = 'article_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute attr ON attr.attrelid = rel.oid AND attr.attnum = ANY (con.conkey)
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'media_videos'
      AND con.contype = 'f'
      AND attr.attname = 'article_id'
      AND con.confrelid = 'public.articles'::regclass
  ) THEN
    ALTER TABLE media_videos
      ADD CONSTRAINT media_videos_article_id_fkey
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_articles_category_id   ON articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_created_at    ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_is_published  ON articles(is_published);
CREATE INDEX IF NOT EXISTS idx_articles_audio_url     ON articles(audio_url) WHERE audio_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_article_blocks_article ON article_blocks(article_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_media_videos_type       ON media_videos(type);
CREATE INDEX IF NOT EXISTS idx_media_videos_article_id ON media_videos(article_id);
CREATE INDEX IF NOT EXISTS idx_media_videos_sort_order ON media_videos(type, sort_order);
CREATE INDEX IF NOT EXISTS idx_media_videos_published  ON media_videos(is_published);

-- ── Gazeta soni (Newspaper Issues) ───────────────────────────
CREATE TABLE IF NOT EXISTS issues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(500) NOT NULL,
  cover_image_url VARCHAR(500),       -- Latin cover image
  cover_image_cy_url VARCHAR(500),    -- Cyrillic cover image
  pdf_url         VARCHAR(500),       -- uploaded PDF
  publish_date    DATE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issues_publish_date ON issues(publish_date DESC);

-- ── Authors table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS authors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  image_url       VARCHAR(500),
  bio_uz          TEXT DEFAULT '',
  bio_uz_cy       TEXT DEFAULT '',
  bio_ru          TEXT DEFAULT '',
  bio_en          TEXT DEFAULT '',
  rating          NUMERIC(3,1) DEFAULT 0,  -- e.g. 4.5
  popularity      INTEGER DEFAULT 0,        -- score
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Editorial page content ────────────────────────────────────
CREATE TABLE IF NOT EXISTS editorial_page (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT DEFAULT '',
  team_members JSONB DEFAULT '[]'::jsonb,  -- [{name, role, photo_url}]
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Site settings (social links, etc.) ───────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  key   VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- Default social link keys
INSERT INTO site_settings (key, value) VALUES
  ('instagram_url', ''),
  ('telegram_url', ''),
  ('facebook_url', '')
ON CONFLICT (key) DO NOTHING;

-- ── Extend articles table ─────────────────────────────────────
ALTER TABLE articles ADD COLUMN IF NOT EXISTS tags      TEXT[] DEFAULT '{}';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS keywords  TEXT[] DEFAULT '{}';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS price     NUMERIC(10,2);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS issue_id  UUID REFERENCES issues(id) ON DELETE SET NULL;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS issue_sort_order INTEGER DEFAULT 0;

-- Extend profiles (authors) rating/popularity
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rating     NUMERIC(3,1) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS popularity INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_articles_issue_id ON articles(issue_id);
CREATE INDEX IF NOT EXISTS idx_articles_tags     ON articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_articles_keywords ON articles USING GIN(keywords);

-- ── Storage buckets (create in Supabase Dashboard → Storage) ──
-- Bucket: article-images    (public, 5 MB limit, image/* only)
-- Bucket: article-audio     (public, 50 MB limit, audio/* only)
-- Bucket: issue-pdfs        (public, 100 MB limit, application/pdf only)
-- Bucket: media-videos      (public, video/* only)
-- Bucket: media-thumbnails  (public, image/* only)

-- ── Row-Level Security policies (optional, enable per table) ──
-- ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE article_blocks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE media_videos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ============================================================
-- MIGRATION HELPERS
-- Run these in the Supabase SQL editor to bring an existing
-- database up to date. All statements are idempotent.
-- ============================================================

-- ── articles: add slug (required by article creation) ────────
ALTER TABLE articles ADD COLUMN IF NOT EXISTS slug VARCHAR(500) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);

-- ── article_blocks: create if it doesn't exist ───────────────
-- (covers databases that stored blocks as content_blocks JSONB
--  on the articles row instead of a separate table)
CREATE TABLE IF NOT EXISTS article_blocks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  type       VARCHAR(20) NOT NULL,
  content    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── article_blocks: add content column if table already exists
-- (covers databases created from an older flat-column schema)
ALTER TABLE article_blocks ADD COLUMN IF NOT EXISTS content JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ── article_blocks: rename block_type → type if needed ───────
-- Run this if your DB has 'block_type' instead of 'type'.
-- Check first: SELECT column_name FROM information_schema.columns
--              WHERE table_name='article_blocks';
-- If 'block_type' exists and 'type' does not, run:
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'article_blocks' AND column_name = 'block_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'article_blocks' AND column_name = 'type'
  ) THEN
    ALTER TABLE article_blocks RENAME COLUMN block_type TO type;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_article_blocks_article_id ON article_blocks(article_id, sort_order);

-- ── articles: other legacy renames ───────────────────────────
-- ALTER TABLE articles RENAME COLUMN featured_image TO featured_image_url;
-- ALTER TABLE articles ADD COLUMN IF NOT EXISTS audio_url VARCHAR(500);

-- ── media: rename old table name if upgrading from v1 ────────
-- ALTER TABLE youtube_media RENAME TO media;

-- ── media_videos: migrate legacy YouTube rows ────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'media'
  ) THEN
    INSERT INTO media_videos (
      id,
      title,
      description,
      type,
      video_source,
      video_url,
      article_id,
      is_published,
      sort_order,
      views_count,
      likes_count,
      comments_count,
      created_at,
      updated_at
    )
    SELECT
      media.id,
      media.title,
      '',
      media.type,
      'youtube',
      media.youtube_url,
      media.article_id,
      media.is_published,
      media.sort_order,
      0,
      0,
      0,
      media.created_at,
      media.updated_at
    FROM media
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ============================================================
-- MIGRATION v2 — Advanced Newspaper Features
-- Run these to upgrade an existing database.
-- All statements are idempotent.
-- ============================================================

-- Issues (Gazeta soni)
CREATE TABLE IF NOT EXISTS issues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(500) NOT NULL,
  cover_image_url VARCHAR(500),
  cover_image_cy_url VARCHAR(500),
  pdf_url         VARCHAR(500),
  publish_date    DATE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_issues_publish_date ON issues(publish_date DESC);

-- Authors
CREATE TABLE IF NOT EXISTS authors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  image_url  VARCHAR(500),
  bio_uz     TEXT DEFAULT '',
  bio_uz_cy  TEXT DEFAULT '',
  bio_ru     TEXT DEFAULT '',
  bio_en     TEXT DEFAULT '',
  rating     NUMERIC(3,1) DEFAULT 0,
  popularity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Editorial page
CREATE TABLE IF NOT EXISTS editorial_page (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description  TEXT DEFAULT '',
  team_members JSONB DEFAULT '[]'::jsonb,
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Site settings
CREATE TABLE IF NOT EXISTS site_settings (
  key   VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);
INSERT INTO site_settings (key, value) VALUES
  ('instagram_url', ''), ('telegram_url', ''), ('facebook_url', '')
ON CONFLICT (key) DO NOTHING;

-- Extend articles
ALTER TABLE articles ADD COLUMN IF NOT EXISTS tags               TEXT[] DEFAULT '{}';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS keywords           TEXT[] DEFAULT '{}';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS price              NUMERIC(10,2);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS issue_id           UUID REFERENCES issues(id) ON DELETE SET NULL;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS issue_sort_order   INTEGER DEFAULT 0;

-- Extend profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rating     NUMERIC(3,1) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS popularity INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_articles_issue_id ON articles(issue_id);
CREATE INDEX IF NOT EXISTS idx_articles_tags     ON articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_articles_keywords ON articles USING GIN(keywords);

-- ── issues: add missing cover image columns ──────────────────
-- Run this if your issues table was created without cover_image_cy_url.
ALTER TABLE issues ADD COLUMN IF NOT EXISTS cover_image_url    VARCHAR(500);
ALTER TABLE issues ADD COLUMN IF NOT EXISTS cover_image_cy_url VARCHAR(500);

-- ── issues: migrate from legacy cover_image_uz / cover_image_uz_cy ──
-- If an older schema used cover_image_uz / cover_image_uz_cy, copy
-- the data into the canonical column names (old columns are left intact).
DO $$
BEGIN
  -- cover_image_uz → cover_image_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'issues' AND column_name = 'cover_image_uz'
  ) THEN
    UPDATE issues
    SET cover_image_url = cover_image_uz
    WHERE cover_image_url IS NULL AND cover_image_uz IS NOT NULL;
  END IF;

  -- cover_image_uz_cy → cover_image_cy_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'issues' AND column_name = 'cover_image_uz_cy'
  ) THEN
    UPDATE issues
    SET cover_image_cy_url = cover_image_uz_cy
    WHERE cover_image_cy_url IS NULL AND cover_image_uz_cy IS NOT NULL;
  END IF;
END $$;

-- ── articles: add price & inline author columns ───────────────
-- Run these if your articles table was created before these
-- columns were introduced.  All statements are idempotent.
ALTER TABLE articles ADD COLUMN IF NOT EXISTS price             NUMERIC(10,2);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS author_name       VARCHAR(255);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS author_image_url  VARCHAR(500);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS author_bio_uz     TEXT DEFAULT '';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS author_bio_uz_cy  TEXT DEFAULT '';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS author_bio_ru     TEXT DEFAULT '';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS author_bio_en     TEXT DEFAULT '';

-- ── articles: migrate from legacy premium_price → price ──────
-- If an older schema stored the price as `premium_price`, copy
-- the data into `price` (old column is left intact).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'articles' AND column_name = 'premium_price'
  ) THEN
    UPDATE articles
    SET price = premium_price
    WHERE price IS NULL AND premium_price IS NOT NULL;
  END IF;
END $$;

-- ── Editorial recommendations ─────────────────────────────────
-- "Tahririyat tavsiya qiladi" — up to 10 articles shown in the
-- right-side sidebar of article reading pages.
CREATE TABLE IF NOT EXISTS editorial_recommendations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(article_id)
);

CREATE INDEX IF NOT EXISTS idx_editorial_rec_sort ON editorial_recommendations(sort_order ASC);

-- ============================================================
-- MIGRATION v3 — Reader Article Submissions
-- Run these to add reader-submitted article management.
-- All statements are idempotent.
-- ============================================================

-- ── reader_article_submissions table ─────────────────────────
CREATE TABLE IF NOT EXISTS reader_article_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Submission content
  title           VARCHAR(500) NOT NULL DEFAULT '',
  anons           TEXT NOT NULL DEFAULT '',   -- summary / lead
  body            TEXT NOT NULL DEFAULT '',   -- full article body

  -- Media
  cover_url       VARCHAR(500),

  -- Category
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,

  -- Author info (reader-provided)
  author_name     VARCHAR(255) NOT NULL DEFAULT '',
  author_bio      TEXT NOT NULL DEFAULT '',
  phone           VARCHAR(50) NOT NULL DEFAULT '',
  telegram        VARCHAR(100) NOT NULL DEFAULT '',

  -- Workflow status: 'new' | 'reviewing' | 'transferred' | 'rejected'
  status          VARCHAR(30) NOT NULL DEFAULT 'new',

  -- Link to the article created from this submission
  transferred_article_id UUID REFERENCES articles(id) ON DELETE SET NULL,

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reader_submissions_status     ON reader_article_submissions(status);
CREATE INDEX IF NOT EXISTS idx_reader_submissions_created_at ON reader_article_submissions(created_at DESC);

-- ── articles: mark articles that originated from a reader submission
ALTER TABLE articles ADD COLUMN IF NOT EXISTS source        VARCHAR(50);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS submission_id UUID REFERENCES reader_article_submissions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_articles_submission_id ON articles(submission_id);

-- ── Social settings (single-row table for "Biz bilan bo'ling" section)
CREATE TABLE IF NOT EXISTS social_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Section heading (multilingual)
  title_uz        VARCHAR(255) NOT NULL DEFAULT 'Biz bilan bo''ling',
  title_ru        VARCHAR(255) NOT NULL DEFAULT 'Будьте с нами',
  title_en        VARCHAR(255) NOT NULL DEFAULT 'Stay with us',

  -- Social network URLs
  telegram_url    VARCHAR(500) NOT NULL DEFAULT '',
  instagram_url   VARCHAR(500) NOT NULL DEFAULT '',
  youtube_url     VARCHAR(500) NOT NULL DEFAULT '',
  facebook_url    VARCHAR(500) NOT NULL DEFAULT '',
  twitter_url     VARCHAR(500) NOT NULL DEFAULT '',
  tiktok_url      VARCHAR(500) NOT NULL DEFAULT '',

  -- Visibility toggles
  telegram_enabled   BOOLEAN NOT NULL DEFAULT true,
  instagram_enabled  BOOLEAN NOT NULL DEFAULT true,
  youtube_enabled    BOOLEAN NOT NULL DEFAULT true,
  facebook_enabled   BOOLEAN NOT NULL DEFAULT false,
  twitter_enabled    BOOLEAN NOT NULL DEFAULT false,
  tiktok_enabled     BOOLEAN NOT NULL DEFAULT false,

  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Seed a default row so there is always exactly one
INSERT INTO social_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM social_settings);

-- Row-level security: allow read publicly, restrict writes to authenticated users
ALTER TABLE social_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "social_settings_read_public"
  ON social_settings FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "social_settings_write_authenticated"
  ON social_settings FOR ALL
  USING (auth.role() = 'authenticated');
