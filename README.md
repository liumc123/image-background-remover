# Image Background Remover

Remove image backgrounds with one click. Powered by Remove.bg API + Cloudflare Workers.

## Tech Stack

- **Backend**: Cloudflare Workers
- **API**: Remove.bg
- **Frontend**: Vanilla HTML/CSS/JS

## Quick Start

### 1. Configure API Key

Set your Remove.bg API key in the Worker environment variables:

```bash
# wrangler.toml
[vars]
REMOVE_BG_API_KEY = "your_api_key_here"
```

Get your API key at [remove.bg](https://www.remove.bg/api)

### 2. Deploy Worker

```bash
cd worker
npm install
npx wrangler deploy
```

### 3. Open Frontend

Simply open `frontend/index.html` in your browser.

Or deploy the frontend to Cloudflare Pages:

```bash
cd frontend
npx wrangler pages deploy .
```

## API

### POST /remove-bg

Remove background from an image.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `image` (image file)

**Response:**
- Content-Type: `image/png`
- Returns the processed image with transparent background.

## License

MIT