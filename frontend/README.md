# RmBg Frontend

Next.js + Tailwind CSS frontend for the Image Background Remover.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local and set your API URL
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Production Build

```bash
npm run build
npm start
```

## Deploy to Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy .next/static
```
