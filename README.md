# RmBg — Remove Image Backgrounds

> 🔗 **Live Demo**: https://rmbg.pages.dev

A beautiful, privacy-first image background removal tool. 100% runs in your browser — no images are uploaded to any server.

![RmBg Screenshot](https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1200&q=80)

## ✨ Features

- 🖥️ **100% Local Processing** — All AI inference runs in your browser via WebAssembly
- 🔒 **Complete Privacy** — Your images never leave your device
- ⚡ **Instant Results** — Get transparent PNGs in seconds
- 🎨 **Beautiful UI** — Dark mode, glassmorphism, smooth animations
- 📱 **Responsive** — Works on desktop and mobile

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 + Tailwind CSS |
| AI Engine | @imgly/background-removal (BRIA RMBG) |
| Deployment | Cloudflare Pages (GitHub Integration) |
| Backend (optional) | Cloudflare Workers + Remove.bg API |

## 🚀 Deploy to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Pages** → **Create a Project** → **Connect to Git**
2. Connect `liumc123/image-background-remover`
3. Configure:

   | Setting | Value |
   |---------|-------|
   | Production branch | `main` |
   | Build command | `npm run build` |
   | Build output directory | `.next` |
   | Environment variables | `NODE_VERSION = 20` |

4. Save and deploy — every push to `main` auto-deploys ✅

## 📁 Project Structure

```
image-background-remover/
├── frontend/              # Next.js frontend
│   ├── src/app/          # App router pages
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Main UI (drop zone, preview, download)
│   │   └── globals.css   # Tailwind + custom styles
│   ├── package.json
│   └── next.config.ts
├── worker/               # Optional Cloudflare Worker (Remove.bg API)
│   ├── index.js
│   ├── wrangler.toml
│   └── package.json
├── .github/workflows/    # CI/CD
│   └── deploy-worker.yml # Auto-deploys Worker on push
├── DEPLOY.md             # Full deployment guide
└── README.md
```

## 🔧 How It Works

The frontend uses `@imgly/background-removal` — a WebAssembly-based AI model that runs entirely in the browser:

```
User drops image → Browser downloads BRIA RMBG model (~20MB) → WASM inference → Transparent PNG
```

No data is sent to any server.

## 👤 Author

**Liu** — [@liumc123](https://github.com/liumc123)

## 📄 License

MIT
