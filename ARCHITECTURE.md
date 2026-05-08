# Admin Dashboard Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER (Client)                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │           Dashboard Application (Next.js)           │  │
│  │                                                     │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │           Root Layout (layout.tsx)           │  │  │
│  │  │  ┌──────────────────────────────────────┐   │  │  │
│  │  │  │      Dashboard Layout (dashboard)    │   │  │  │
│  │  │  │  ┌──────────────────────────────┐    │   │  │  │
│  │  │  │  │    Sidebar Component          │    │   │  │  │
│  │  │  │  │  • Dashboard (/)              │    │   │  │  │
│  │  │  │  │  • Articles (/articles)       │    │   │  │  │
│  │  │  │  │  • Categories (/categories)   │    │   │  │  │
│  │  │  │  │  • Media (/media)             │    │   │  │  │
│  │  │  │  │  • Users (/users)             │    │   │  │  │
│  │  │  │  └──────────────────────────────┘    │   │  │  │
│  │  │  │                                       │   │  │  │
│  │  │  │  ┌──────────────────────────────┐    │   │  │  │
│  │  │  │  │   Page Content (dynamic)      │    │   │  │  │
│  │  │  │  │                               │    │   │  │  │
│  │  │  │  │  ┌──────────────────────┐    │    │   │  │  │
│  │  │  │  │  │ Header Component      │    │    │   │  │  │
│  │  │  │  │  │ • Title               │    │    │   │  │  │
│  │  │  │  │  │ • Language Switcher   │    │    │   │  │  │
│  │  │  │  │  │ • Profile             │    │    │   │  │  │
│  │  │  │  │  └──────────────────────┘    │    │   │  │  │
│  │  │  │  │                               │    │   │  │  │
│  │  │  │  │  ┌──────────────────────┐    │    │   │  │  │
│  │  │  │  │  │ Page-Specific Content│    │    │   │  │  │
│  │  │  │  │  │ (Tables, Cards, etc) │    │    │   │  │  │
│  │  │  │  │  └──────────────────────┘    │    │   │  │  │
│  │  │  │  └──────────────────────────────┘    │   │  │  │
│  │  │  └──────────────────────────────────────┘   │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  Libraries:                                                │
│  • React 19.2.4                                           │
│  • TypeScript 5                                           │
│  • Tailwind CSS 4                                         │
│  • Lucide React (icons)                                   │
│  • clsx (utilities)                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase (Backend)                       │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Supabase Client (lib/supabase.ts)         │  │
│  │         Uses: NEXT_PUBLIC_SUPABASE_URL              │  │
│  │               NEXT_PUBLIC_SUPABASE_ANON_KEY         │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                │
│                ┌───────────┼───────────┐                   │
│                │           │           │                   │
│                ▼           ▼           ▼                   │
│         ┌──────────┐┌──────────┐┌──────────┐              │
│         │Categories││ Articles  ││  Users   │              │
│         │          ││          ││          │              │
│         │- names   ││- content ││- roles   │              │
│         │- slugs   ││- status  ││- emails  │              │
│         │4 langs   ││4 langs   ││- active  │              │
│         └──────────┘└──────────┘└──────────┘              │
│                │                                           │
│                ▼                                           │
│         ┌──────────────────┐                              │
│         │  Media Files     │                              │
│         │                  │                              │
│         │- filename        │                              │
│         │- url             │                              │
│         │- type            │                              │
│         │- size            │                              │
│         └──────────────────┘                              │
│                                                             │
│  PostgreSQL Database (tables with RLS ready)               │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
milliy-tiklanish-admin/
│
├── 📂 app/                              # Next.js App Router
│   │
│   ├── 📂 (dashboard)/                  # Dashboard Group
│   │   ├── layout.tsx                   # Dashboard layout (sidebar + main)
│   │   ├── page.tsx                     # Dashboard homepage
│   │   │
│   │   ├── 📂 articles/
│   │   │   └── page.tsx                 # Articles management page
│   │   │
│   │   ├── 📂 categories/
│   │   │   └── page.tsx                 # Categories management page
│   │   │
│   │   ├── 📂 media/
│   │   │   └── page.tsx                 # Media manager page
│   │   │
│   │   └── 📂 users/
│   │       └── page.tsx                 # User management page
│   │
│   ├── layout.tsx                       # Root layout
│   ├── page.tsx                         # Default page (unused)
│   ├── globals.css                      # Global Tailwind styles
│   └── favicon.ico                      # App icon
│
├── 📂 components/                       # React Components
│   ├── sidebar.tsx                      # Navigation sidebar
│   ├── header.tsx                       # Top bar header
│   └── 📂 ui/                           # UI component directory
│
├── 📂 lib/                              # Utilities & Libraries
│   └── supabase.ts                      # Supabase client setup
│
├── 📂 types/                            # TypeScript Interfaces
│   └── index.ts                         # Article, Category, User, Media types
│
├── 📂 sql/                              # Database Scripts
│   └── schema.sql                       # PostgreSQL schema
│
├── 📂 public/                           # Static Assets
│
├── 📂 node_modules/                     # Dependencies
│
├── 📂 .next/                            # Next.js build output
│
├── 📄 Configuration Files:
│   ├── package.json                     # Dependencies & scripts
│   ├── tsconfig.json                    # TypeScript config
│   ├── next.config.ts                   # Next.js config
│   ├── tailwind.config.ts               # Tailwind CSS config
│   ├── postcss.config.mjs               # PostCSS config
│   ├── next-env.d.ts                    # Next.js type definitions
│   └── .eslintrc.json                   # ESLint config
│
└── 📚 Documentation Files:
    ├── PROJECT_SUMMARY.md               # This summary
    ├── QUICK_START.md                   # 5-minute quick start
    ├── SETUP_GUIDE.md                   # Complete setup guide
    ├── QUICK_REF.md                     # Developer reference
    ├── IMPLEMENTATION_COMPLETE.md       # Implementation details
    ├── README.md                        # Original README
    ├── .env.local.example               # Environment template
    ├── AGENTS.md                        # AI agents reference
    └── CLAUDE.md                        # Claude AI reference
```

## Component Tree

```
RootLayout
└── Dashboard Layout
    ├── Sidebar
    │   ├── Logo Section
    │   ├── Nav Items (5 routes)
    │   │   ├── Dashboard
    │   │   ├── Articles
    │   │   ├── Categories
    │   │   ├── Media
    │   │   └── Users
    │   └── Logout Button
    │
    └── Main Content Area
        ├── Dashboard Page
        │   ├── Header
        │   │   ├── Title
        │   │   ├── Language Switcher
        │   │   └── Profile Section
        │   └── Content
        │       ├── Stats Grid (4 cards)
        │       └── Activity Feed
        │
        ├── Articles Page
        │   ├── Header
        │   ├── Add Button
        │   └── Articles Table
        │
        ├── Categories Page
        │   ├── Header
        │   ├── Add Button
        │   └── Categories Grid
        │
        ├── Media Page
        │   ├── Header
        │   ├── Upload Button
        │   └── Media Grid
        │
        └── Users Page
            ├── Header
            ├── Add Button
            ├── Users Table
            └── Summary Stats
```

## Data Flow

```
User Action (Click, Type, Submit)
        │
        ▼
    React Component State
        │
        ▼
    Supabase Query (if needed)
        │
        ├─ Fetch: GET /articles
        ├─ Create: POST /articles
        ├─ Update: PUT /articles/:id
        └─ Delete: DELETE /articles/:id
        │
        ▼
    PostgreSQL Database
        │
        ├─ categories table
        ├─ articles table
        ├─ users table
        └─ media_files table
        │
        ▼
    Response Data
        │
        ▼
    Component Re-render
        │
        ▼
    UI Update
        │
        ▼
    User Sees Changes
```

## Feature Map

```
┌─────────────────────────────────────────────────────────┐
│          Admin Dashboard Features                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Dashboard (/)                                          │
│  ├─ Stats Cards (4)                                     │
│  │   ├─ Total Articles                                  │
│  │   ├─ Published Count                                 │
│  │   ├─ Total Users                                     │
│  │   └─ Media Files                                     │
│  └─ Activity Feed                                       │
│                                                         │
│  Articles (/articles)                                   │
│  ├─ List View (Table)                                   │
│  ├─ Multilingual Support (4 langs)                      │
│  ├─ Status Filter (Published/Draft)                     │
│  ├─ Edit Article                                        │
│  ├─ Delete Article                                      │
│  └─ Premium Badge                                       │
│                                                         │
│  Categories (/categories)                               │
│  ├─ Grid View                                           │
│  ├─ Multilingual Names                                  │
│  ├─ Slug Display                                        │
│  ├─ Edit Category                                       │
│  └─ Delete Category                                     │
│                                                         │
│  Media (/media)                                         │
│  ├─ Grid View                                           │
│  ├─ File Thumbnails                                     │
│  ├─ Type Badges                                         │
│  ├─ File Size Info                                      │
│  ├─ Download Files                                      │
│  └─ Delete Files                                        │
│                                                         │
│  Users (/users)                                         │
│  ├─ User List (Table)                                   │
│  ├─ Role Display                                        │
│  ├─ Status Indicator                                    │
│  ├─ Last Login Info                                     │
│  ├─ Edit User                                           │
│  ├─ Delete User                                         │
│  └─ Summary Stats                                       │
│                                                         │
│  Navigation                                             │
│  ├─ Sidebar (Left)                                      │
│  ├─ Language Switcher                                   │
│  └─ User Profile                                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Technology Stack

```
Frontend Layer          Styling Layer           Backend Layer
──────────────────────────────────────────────────────────
Next.js 16.2.4          Tailwind CSS 4           Supabase
React 19.2.4            PostCSS 4                PostgreSQL
TypeScript 5            clsx 2.1.1               Node.js Runtime
JavaScript ES2017+

UI Library              Icons                    Utilities
──────────────────────────────────────────────────────────
React DOM 19.2.4        Lucide React 1.8.0       clsx 2.1.1
Tailwind UI Components  20+ Icons Used           TypeScript Types

Development Tools
──────────────────────────────────────────────────────────
Turbopack (Fast builds)
ESLint (Code quality)
TypeScript Compiler
Tailwind CSS Compiler
```

## Multilingual Data Model

```
Article
│
├─ title_uz          ← Uzbek (Latin)
├─ title_uz_cy       ← Uzbek (Cyrillic)
├─ title_ru          ← Russian
├─ title_en          ← English
│
├─ summary_uz        ← Uzbek (Latin)
├─ summary_uz_cy     ← Uzbek (Cyrillic)
├─ summary_ru        ← Russian
├─ summary_en        ← English
│
├─ content_uz        ← Uzbek (Latin)
├─ content_uz_cy     ← Uzbek (Cyrillic)
├─ content_ru        ← Russian
├─ content_en        ← English
│
├─ category_id       → References: categories.id
├─ author_id         → References: users.id
├─ is_premium        ← Boolean
├─ is_published      ← Boolean
├─ view_count       ← Integer
├─ created_at        ← Timestamp
└─ updated_at        ← Timestamp
```

## Deployment Architecture

```
GitHub Repository
        │
        ├─ push
        │
        ▼
   Vercel (CI/CD)
        │
        ├─ npm install
        ├─ npm run build
        ├─ npm run start
        │
        ▼
   Production Server
        │
        ├─ Next.js App (Port 3000)
        ├─ Static Assets (CDN)
        │
        ▼
        └─ Connects to Supabase
            │
            ├─ PostgreSQL Database
            ├─ Auth System
            ├─ Storage (optional)
            │
            ▼
          Users Access via Browser
```

---

**This architecture ensures**:
- ✅ Scalability (separated concerns)
- ✅ Type Safety (full TypeScript)
- ✅ Performance (optimized Tailwind)
- ✅ Maintainability (clear structure)
- ✅ Security (validated inputs ready)
- ✅ Multilingual Support (built-in)
