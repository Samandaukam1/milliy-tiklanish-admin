# ✅ Quick Start Checklist

Complete these steps to get your admin dashboard fully operational with live Supabase data.

## Step 1: Project Already Running ✅

- [x] Next.js dev server is running on `http://localhost:3000/dashboard`
- [x] All pages are accessible and styled
- [x] Sidebar navigation is fully functional
- [x] Demo data is showing on articles page

## Step 2: Setup Supabase (5 minutes)

- [ ] Create a free account at [supabase.com](https://supabase.com)
- [ ] Create a new project
- [ ] Go to **Project Settings → API**
- [ ] Copy your **URL** and **anon** key
- [ ] Create `.env.local` file in project root:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  ```
- [ ] Restart dev server (Ctrl+C then `npm run dev`)

## Step 3: Setup Database (5 minutes)

- [ ] Open Supabase dashboard
- [ ] Go to **SQL Editor**
- [ ] Click **New Query**
- [ ] Open `sql/schema.sql` from your project
- [ ] Copy and paste the entire SQL content
- [ ] Click **Run**
- [ ] Verify 4 tables were created:
  - [ ] `categories`
  - [ ] `articles`
  - [ ] `users`
  - [ ] `media_files`

## Step 4: Test Live Data (2 minutes)

- [ ] Go to Supabase → **SQL Editor** → **New Query**
- [ ] Insert sample data:
  ```sql
  INSERT INTO categories (name_uz, name_uz_cy, name_ru, name_en, slug) VALUES
  ('Siyosat', 'Сиёсат', 'Политика', 'Politics', 'siyosat'),
  ('Sport', 'Спорт', 'Спорт', 'Sports', 'sport');
  ```
- [ ] Refresh `/articles` page in your dashboard
- [ ] See real data from Supabase appear!

## Step 5: Optional - Add Authentication (30 minutes)

- [ ] Go to Supabase → **Auth → Providers**
- [ ] Enable **Email** provider
- [ ] Follow [Supabase Auth Integration](https://supabase.com/docs/guides/auth)
- [ ] Add authentication to layout

## Step 6: Optional - Add Image Upload (30 minutes)

- [ ] Go to Supabase → **Storage**
- [ ] Create a new bucket called `articles`
- [ ] Make it public
- [ ] Update media page to use Supabase Storage

## Step 7: Customize Your Dashboard

- [ ] Update colors in `tailwind.config.ts`
- [ ] Change sidebar colors in `components/sidebar.tsx`
- [ ] Update logo/title text
- [ ] Customize card styling in pages

## Step 8: Ready for Production

- [ ] Run production build: `npm run build`
- [ ] Start production server: `npm start`
- [ ] Deploy to Vercel:
  - Push code to GitHub
  - Connect to Vercel
  - Add environment variables
  - Deploy!

---

## Useful Commands During Development

```bash
# Development server
npm run dev              # localhost:3000

# Production build
npm run build           # Creates optimized build
npm start               # Runs production server

# Code quality
npm run lint            # Run ESLint

# Database
# To reset database:
# 1. Go to Supabase Dashboard
# 2. Click Database → Reset (danger zone)
# 3. Run sql/schema.sql again
```

## File Locations Reference

- **Dashboard**: `/dashboard`
- **Articles**: `/articles`
- **Categories**: `/categories`
- **Media**: `/media`
- **Users**: `/users`

## Key Files to Know

- `app/(dashboard)/layout.tsx` - Dashboard structure with sidebar
- `components/sidebar.tsx` - Navigation menu
- `components/header.tsx` - Top bar with language switcher
- `lib/supabase.ts` - Database connection
- `types/index.ts` - TypeScript interfaces
- `sql/schema.sql` - Database structure

## Troubleshooting

### Dashboard shows "Supabase sozlanmagan" message
- ✅ This is normal - just means .env.local isn't configured
- Add your Supabase credentials to `.env.local`
- Restart dev server

### "Module not found" errors
```bash
rm -rf node_modules .next
npm install
npm run dev
```

### Build fails
```bash
npm run build -- --debug
```

### Can't connect to Supabase
1. Check `.env.local` has correct URL and key
2. Verify they're PUBLIC keys (not service keys)
3. Try restarting dev server

## Getting Help

1. **Next.js Issues**: [nextjs.org/docs](https://nextjs.org/docs)
2. **Supabase Issues**: [supabase.com/docs](https://supabase.com/docs)
3. **Tailwind Issues**: [tailwindcss.com](https://tailwindcss.com)
4. **TypeScript Issues**: [typescriptlang.org](https://www.typescriptlang.org)

---

**Start from Step 2 above and you'll have a fully functional admin dashboard with live database in ~15 minutes!**
