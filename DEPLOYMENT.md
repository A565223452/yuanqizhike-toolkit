# YuanqiZhiKe Toolkit - Deployment Guide

## Overview

This is a pure static HTML/CSS/JavaScript website. No build process or backend server is required. It can be deployed to any static hosting service.

---

## Option 1: Cloudflare Pages (Recommended)

### Method A: Git Integration

1. Push the entire `yuanqi-toolkit/` folder to a Git repository (GitHub, GitLab, or Bitbucket)
2. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
3. Navigate to **Workers & Pages** > **Create application** > **Pages**
4. Connect your Git repository
5. Configure build settings:
   - **Framework preset**: None
   - **Build command**: (leave empty)
   - **Build output directory**: `/` (root)
   - **Root Directory**: Leave blank or set to project root
6. Click **Save and Deploy**

### Method B: Direct Upload via Cloudflare CLI

1. Install Wrangler CLI:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

3. Create `wrangler.toml` in the project root:
```toml
name = "yuanqi-toolkit"
pages_build_output_dir = "."
```

4. Deploy:
```bash
wrangler pages deploy ./yuanqi-toolkit --project-name=yuanqi-toolkit
```

---

## Option 2: GitHub Pages

1. Create a new repository on GitHub
2. Push all files to the `main` branch:
```bash
git init
git add .
git commit -m "Initial commit: YuanqiZhiKe Toolkit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/yuanqi-toolkit.git
git push -u origin main
```

3. Go to repository **Settings** > **Pages**
4. Set **Source** to `main` branch, root folder
5. Your site will be available at: `https://YOUR_USERNAME.github.io/yuanqi-toolkit/`

---

## Option 3: Netlify

### Drag-and-Drop Method

1. Go to [Netlify](https://www.netlify.com)
2. Sign up / Log in
3. Drag the entire `yuanqi-toolkit/` folder onto the upload area
4. Your site is live instantly!

### Git Integration

1. Push to Git repository
2. Connect repository on Netlify
3. Build settings:
   - **Build command**: (leave empty)
   - **Publish directory**: `.` (root)

---

## Option 4: Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Navigate to project folder and deploy:
```bash
cd yuanqi-toolkit
vercel
```

3. Follow the prompts. No build step is needed.

---

## Option 5: Any HTTP Server

Since this is a static site, you can serve it with any HTTP server:

### Python
```bash
cd yuanqi-toolkit
python -m http.server 8080
```

### Node.js
```bash
npx serve yuanqi-toolkit
```

### PHP
```bash
cd yuanqi-toolkit
php -S localhost:8080
```

---

## SSL / HTTPS

All recommended hosting providers (Cloudflare Pages, GitHub Pages, Netlify, Vercel) provide free SSL certificates automatically. No additional configuration is needed.

---

## Pre-Deployment Checklist

- [ ] All HTML files use correct relative paths
- [ ] CSS and JS files are in the `assets/` directory
- [ ] Tool ZIP files are placed in their respective `tools/` folders
- [ ] Privacy Policy, Cookie Notice, and License pages are linked correctly
- [ ] Analytics placeholder is configured with real tracking IDs
- [ ] All links are tested and working
- [ ] Mobile responsiveness verified on multiple devices
- [ ] Download buttons trigger the license modal correctly

---

## Post-Deployment

1. Visit your deployed site and verify all pages load correctly
2. Test the download flow: click Download > accept license > file downloads
3. Check mobile view on phones and tablets
4. Verify SSL certificate is active (HTTPS)
5. Update analytics tracking IDs in `index.html` and `assets/js/main.js`