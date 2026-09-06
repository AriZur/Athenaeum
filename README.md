# Library Management System

A library circulation and catalog management system built with React, TypeScript, Tailwind CSS, and Supabase.

---

## 🚀 Deploy to Vercel

This project is fully configured and optimized for zero-config deployment to **Vercel**.

### Method 1: Deploy via Vercel Dashboard (Recommended)

1. Push or import your repository to **GitHub**, **GitLab**, or **Bitbucket**.
2. Go to your [Vercel Dashboard](https://vercel.com/new).
3. Click **"Add New"** > **"Project"** and select this repository.
4. Vercel automatically detects the **Vite** framework preset:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. *(Optional)* Under **Environment Variables**, configure your own Supabase instance:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Public Key
   *(Note: The app includes built-in defaults, so it functions immediately even if these variables are omitted).*
6. Click **Deploy**.

---

### Method 2: Deploy using Vercel CLI

```bash
# 1. Install Vercel CLI (if not already installed)
npm install -g vercel

# 2. Log in and deploy from project directory
vercel

# 3. For production release:
vercel --prod
```

---

## 🛠️ Included Vercel Configuration (`vercel.json`)

- **SPA Rewrites**: Automatically directs all client-side URL routes (e.g. `/rentals`, `/books`, `/members`) to `/index.html` to prevent 404 errors on page refresh.
- **Static Asset Optimization**: Caches built scripts and styles in `/assets/` with `Cache-Control: public, max-age=31536000, immutable`.
- **Clean URLs**: Clean URL resolution without trailing slashes.

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```
