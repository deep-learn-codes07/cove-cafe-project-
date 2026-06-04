# Cove cafe — Premium Digital Menu

A production-ready, QR-based cafe menu website. Vanilla HTML/CSS/JS frontend, Supabase backend (Database + Storage + Auth), deployed on Firebase Hosting.

## ✨ Features

- Premium dark glassmorphism design, mobile-first
- Home with hero, open/closed status, social, call & directions buttons
- Menu page with sticky category tabs, real-time search, lazy-loaded cards
- Item details modal (ingredients, allergens, WhatsApp order)
- Admin dashboard: login, CRUD items & categories, image upload, availability toggle
- QR code generator + share button
- SEO: meta tags, Open Graph, JSON-LD structured data
- Firebase Hosting config with caching headers

## 📁 Structure

```
cafe-menu/
├── index.html          # Home
├── menu.html           # Menu
├── admin.html          # Admin dashboard
├── css/
│   └── styles.css
├── js/
│   ├── supabase.js     # Supabase client + cafe config
│   ├── ui.js           # Shared helpers
│   ├── home.js
│   ├── menu.js
│   └── admin.js
├── supabase/
│   └── schema.sql
├── firebase.json
├── .firebaserc
└── README.md
```

## 🚀 Setup

### 1. Supabase

1. Create a project at https://supabase.com
2. SQL Editor → paste & run `supabase/schema.sql`
3. Storage → create public bucket named `menu-images`
4. Run `cafe-menu/supabase/schema.sql` in the Supabase SQL editor to create tables, storage bucket, and the required storage policies.
5. Authentication → Users → invite an admin user (email + password)
6. Copy your project URL & anon key into `js/supabase.js`:
   ```js
   export const SUPABASE_URL = "https://xxxx.supabase.co";
   export const SUPABASE_ANON_KEY = "eyJhbGc...";
   ```
7. Update the `CAFE` config (name, phone, WhatsApp, maps URL, hours) in the same file.

### 2. Firebase Hosting

```bash
npm i -g firebase-tools
firebase login
# Edit .firebaserc with your project id
firebase deploy --only hosting
```

The published URL serves:
- `/` → `index.html`
- `/menu` → `menu.html`
- `/admin` → `admin.html`

### 3. Add content

1. Visit `/admin`, sign in with the admin user you created
2. Add categories (already seeded), then create menu items with images
3. Toggle `Bestseller` to feature items on the home page
4. Toggle `Available` to hide items without deleting

## 🧪 Local preview

Any static server works. From the project root:

```bash
npx serve .
# or
python3 -m http.server 5173
```

## 🔒 Security

- Public role can only `SELECT` from menu tables
- All writes require Supabase Auth (admin login)
- Image uploads require auth; bucket is read-public
- `admin.html` is `noindex,nofollow`

## ⚡ Performance

- System fonts + Google Fonts preconnect
- `loading="lazy"` and `decoding="async"` on all images
- Skeleton placeholders during fetch
- Long-cache headers for static assets
- No build step → ships fast

## 📱 QR Code

The Home page has a QR button that renders a QR for `/menu` — print and place on tables.

## 📝 License

MIT — go make great coffee.
