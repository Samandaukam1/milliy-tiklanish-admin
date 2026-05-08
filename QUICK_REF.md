# Quick Reference Guide

## Common Commands

```bash
# Install dependencies
npm install

# Development server (http://localhost:3000/dashboard)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Adding New Pages

1. Create a new folder in `app/(dashboard)/`
2. Create a `page.tsx` file
3. Import `{ Header }` component
4. Add route to sidebar in `components/sidebar.tsx`

Example:
```typescript
// app/(dashboard)/reports/page.tsx
import { Header } from '@/components/header';

export default function ReportsPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Reports" subtitle="View analytics" />
      {/* Your content */}
    </div>
  );
}
```

## Fetching from Supabase

```typescript
import { supabase } from '@/lib/supabase';
import { Article } from '@/types';

// Fetch articles
const { data, error } = await supabase
  .from('articles')
  .select('*')
  .order('created_at', { ascending: false });

// Insert
const { data, error } = await supabase
  .from('articles')
  .insert([{ title_uz: 'New Article', ... }]);

// Update
const { data, error } = await supabase
  .from('articles')
  .update({ is_published: true })
  .eq('id', articleId);

// Delete
const { data, error } = await supabase
  .from('articles')
  .delete()
  .eq('id', articleId);
```

## Form Styling Classes

```html
<!-- Input -->
<input 
  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
/>

<!-- Button -->
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
  Action
</button>

<!-- Card -->
<div className="bg-white rounded-lg border border-slate-200 p-6">
  Content
</div>
```

## TypeScript Types

All types are in `types/index.ts`:
- `Article` - Full article with multilingual fields
- `Category` - Category with translations
- `User` - Admin panel user
- `MediaFile` - Uploaded file metadata

## Environment Variables

Required for Supabase:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public API key

These should be in `.env.local` (create from `.env.local.example`)

## Color Palette

- **Primary**: Blue (`bg-blue-600`, `text-blue-600`)
- **Success**: Green (`bg-green-100`, `text-green-700`)
- **Warning**: Yellow (`bg-yellow-100`, `text-yellow-800`)
- **Danger**: Red (`bg-red-100`, `text-red-700`)
- **Neutral**: Slate (`bg-slate-900`, `text-slate-600`)

## Icons from Lucide

Used throughout:
- `Plus` - Add action
- `Edit2` - Edit action
- `Trash2` - Delete action
- `Eye` / `EyeOff` - Visibility toggle
- `LayoutDashboard` - Dashboard
- `FileText` - Articles
- etc.

See [lucide.dev](https://lucide.dev) for all icons.

## Multilingual Field Naming Convention

For content fields, always use this pattern:
- `field_uz` - Uzbek (Latin script)
- `field_uz_cy` - Uzbek (Cyrillic script)
- `field_ru` - Russian
- `field_en` - English

Examples:
- `title_uz`, `title_uz_cy`, `title_ru`, `title_en`
- `summary_uz`, `summary_uz_cy`, `summary_ru`, `summary_en`
- `content_uz`, `content_uz_cy`, `content_ru`, `content_en`

## Useful Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Lucide Icons](https://lucide.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Project Layout

```
/Users/macbookair/Desktop/milliy-tiklanish-admin/
├── app/                     # Next.js app directory
│   ├── (dashboard)/         # Dashboard group
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Not used (dashboard is main app)
├── components/              # React components
│   ├── header.tsx
│   ├── sidebar.tsx
│   └── ui/                  # Reusable UI components
├── lib/                     # Utility functions
│   └── supabase.ts
├── types/                   # TypeScript types
│   └── index.ts
├── sql/                     # Database schemas
│   └── schema.sql
├── public/                  # Static files
├── .env.local.example       # Environment template
├── next.config.ts           # Next.js config
├── tailwind.config.ts       # Tailwind config
├── tsconfig.json            # TypeScript config
├── package.json             # Dependencies
└── SETUP_GUIDE.md          # This guide
```

## Deployment Options

### Vercel (Recommended)
```bash
# Push to GitHub
git push

# Deploy from Vercel dashboard
# Add environment variables in project settings
```

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Traditional Server
```bash
npm run build
npm start
```
