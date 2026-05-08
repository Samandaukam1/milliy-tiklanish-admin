# Milliy Tiklanish Admin Dashboard

A modern, scalable admin panel for managing "Milliy Tiklanish gazetasi" (National News Gazette) with multilingual support using Next.js 16, TypeScript, Tailwind CSS, and Supabase.

## 🚀 Features

- **Modern Admin Dashboard** - Clean, minimal, premium UI design
- **Multilingual Support** - Content in Uzbek (Latin & Cyrillic), Russian, and English
- **Articles Management** - Create, edit, publish articles with rich metadata
- **Category Management** - Organize content by categories
- **Media Manager** - Upload and manage images, videos, and documents
- **User Management** - Control team access with role-based permissions
- **Real-time Supabase Integration** - Direct database connection for live data
- **Responsive Design** - Works on desktop and tablet devices

## 📋 Project Structure

```
app/
├── (dashboard)/
│   ├── layout.tsx          # Dashboard layout with sidebar
│   ├── page.tsx            # Dashboard homepage
│   ├── articles/
│   │   └── page.tsx        # Articles management
│   ├── categories/
│   │   └── page.tsx        # Categories management
│   ├── media/
│   │   └── page.tsx        # Media manager
│   └── users/
│       └── page.tsx        # User management

components/
├── sidebar.tsx             # Navigation sidebar
├── header.tsx              # Top header bar
└── ui/                     # Reusable UI components

lib/
└── supabase.ts            # Supabase client setup

types/
└── index.ts               # TypeScript interfaces

sql/
└── schema.sql             # Database schema
```

## 🛠️ Tech Stack

- **Framework**: Next.js 16.2.4 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Icons**: Lucide React
- **Utilities**: clsx

## ⚙️ Prerequisites

- Node.js 18+ (recommended Node 20+)
- npm or yarn
- Supabase account (free tier available at https://supabase.com)

## 🔧 Installation

### 1. Clone/Setup the Project

```bash
# The project is already created with Next.js
# Just install dependencies
npm install
```

### 2. Configure Supabase

Create a `.env.local` file in the root directory:

```bash
# Copy the example file
cp .env.local.example .env.local
```

Then fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**How to get these values:**
1. Go to https://supabase.com and create a new project
2. Navigate to Project Settings → API
3. Copy the URL and `anon` (public) key

### 3. Setup Database Schema

1. Open Supabase dashboard
2. Go to SQL Editor
3. Create a new query
4. Copy the contents of `sql/schema.sql`
5. Run the query

This will create all necessary tables:
- `categories` - Article categories
- `articles` - Main articles with multilingual fields
- `users` - Admin panel users
- `media_files` - Uploaded media

## 🚀 Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard) in your browser.

### Dashboard Routes

- `/dashboard` - Dashboard homepage
- `/articles` - Articles manager
- `/categories` - Categories manager
- `/media` - Media manager
- `/users` - User management

## 📝 Database Schema

### Articles Table

Supports multilingual content:
- `title_uz`, `title_uz_cy`, `title_ru`, `title_en`
- `summary_uz`, `summary_uz_cy`, `summary_ru`, `summary_en`
- `content_uz`, `content_uz_cy`, `content_ru`, `content_en`
- `is_premium` - Premium article flag
- `is_published` - Publication status
- `created_at`, `updated_at` - Timestamps

### Categories Table

- `name_uz`, `name_uz_cy`, `name_ru`, `name_en` - Category names in different languages
- `slug` - URL-friendly identifier

### Users Table

- `email` - User email
- `full_name` - Display name
- `role` - One of: `admin`, `editor`, `viewer`
- `is_active` - Account status

### Media Files Table

- `filename` - Original filename
- `url` - CDN/Storage URL
- `type` - `image`, `video`, or `document`
- `size` - File size in bytes

## 🎨 Design System

The UI follows these principles:
- **Spacing**: Consistent 4px grid system
- **Colors**: Slate for neutral, blue for primary, green for success
- **Typography**: Clear hierarchy with proper font sizes
- **Borders**: Subtle 1px borders in slate-200
- **Shadows**: Minimal, used on hover states

## 📦 Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🔐 Security Notes

- The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is intentionally public (it's meant for client-side use)
- Set up Row Level Security (RLS) in Supabase for data protection
- Implement authentication before deploying to production
- Use Supabase Auth for user management and authentication

## 🧪 Testing Demo Data

If Supabase is not configured:
- The app shows demo data automatically
- This is useful for UI testing and development
- Demo data appears in the articles page

## 📚 Next Steps

1. **Add Authentication** - Integrate Supabase Auth
2. **Add Article Editor** - Create rich text editor for content
3. **Image Upload** - Integrate Supabase Storage for media
4. **Real-time Updates** - Add Supabase realtime subscriptions
5. **Dark Mode** - Add theme switcher
6. **API Routes** - Create server-side API routes if needed

## 🐛 Troubleshooting

### "Supabase sozlanmagan" warning

This is normal during development. To fix:
1. Create a Supabase project
2. Add environment variables to `.env.local`
3. Restart the dev server

### Tables not appearing in Supabase

Make sure you ran the SQL schema script in your Supabase SQL Editor.

### Build errors

Try these steps:
```bash
rm -rf .next node_modules
npm install
npm run build
```

## 📄 License

This project is part of Milliy Tiklanish gazetasi.

## 📞 Support

For issues or questions, contact the development team.
