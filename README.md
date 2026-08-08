# 📚 Serverless Manga & Comic REST API Scraper Ecosystem

An enterprise-grade, production-ready Serverless Node.js REST API ecosystem for high-volume comic, manga, and manhua data retrieval across **23+ site providers**. Built with ES Modules, Strategy Pattern Scraper Registry, Cloudflare Cookie Jar session persistence, **wsrv.nl** global CDN image caching, dynamic Swagger UI documentation, and multi-format reader payloads (`images`, `pdf`, `epub`).

---

## ⚡ Features

- 🚀 **23+ Scraper Providers**: MangaDex, Comick, Asura Scans, MangaPark, MangaNato, MangaPill, WeebCentral, MangaTaro, Comix, MangaKatana, VortexScans, MangaTown, MangaHere, LikeManga, MangaFire, MangaDot, MangaBall, Atsumaru, RawOtaku, Scans.gg, VyManga, LinkManga, MangaGo.
- 🛡️ **Cloudflare & Anti-Bot Bypass**: `axios-cookiejar-support` + `tough-cookie` session persistence and Puppeteer + `@sparticuz/chromium` headless fallback.
- 🖼️ **wsrv.nl Image Cache & CORS Bypass**: Automatic image optimization and WebP conversion via `https://wsrv.nl` edge network (300+ datacenters).
- 📖 **Multi-Format Reader Payloads**: Dynamic format detection (`images`, `pdf`, `epub`) for seamless mobile reader app integration (Flutter / React Native).
- ⚡ **Stream Batch Downloader**: Concurrency-limited streaming batch downloader (`p-limit`) with exponential backoff retries and quality options.
- 📑 **Interactive Swagger UI**: Real-time OpenAPI 3.0 documentation served at `/docs`.
- 🛠️ **Dev Environment**: Nodemon auto-reloading (`npm run dev`) + Serverless Offline support.

---

## 📂 Project Architecture

```
.
├── package.json                              # ES Module configuration & dependencies
├── serverless.yml                            # AWS Lambda + API Gateway framework definition
├── vercel.json                               # Vercel Serverless deployment config
├── netlify.toml                              # Netlify Functions deployment config
├── test.js                                   # Primary E2E test suite
└── src/
    ├── components/
    │   └── manga/
    │       ├── manga.controller.js          # HTTP request validation & status code mapping
    │       └── manga.service.js             # Business logic & parallel multi-site search
    ├── models/
    │   └── manga.model.js                    # Joi request validation & data contracts
    ├── scrapers/
    │   ├── base.scraper.js                   # Abstract base scraper with CookieJar & CF headers
    │   ├── scraper.registry.js               # Strategy Pattern registry mapping 23 providers
    │   ├── headless.helper.js                # Lambda-optimized Puppeteer + Chromium manager
    │   └── implementations/                  # 23 Scraper strategy files
    ├── utils/
    │   ├── imageProxy.js                     # wsrv.nl CDN cache & resize proxy builder
    │   ├── batchDownloader.js                # Concurrency-limited streaming batch downloader
    │   └── httpResponse.js                   # Standardized JSON response & CORS builder
    └── handlers/
        ├── api.js                            # AWS Lambda entry handlers
        └── swagger.js                        # Swagger UI HTML & OpenAPI 3.0 JSON spec
```

---

## 📡 REST API Reference

### 1. List Providers
```http
GET /api/scrape/providers
```
Returns list of all 23 active scraper providers with capability metadata.

### 2. Search Manga
```http
GET /api/scrape/search?query=Solo+Leveling&provider=asurascans
```
Or parallel multi-site search:
```http
GET /search?q=Solo+Leveling&sites=mangadex,asurascans,weebcentral
```

### 3. Manga Details & Chapter List
```http
GET /api/scrape/info?id=hellogin-00dcbf97&provider=asurascans
```

### 4. Fetch Chapter Pages
```http
GET /api/scrape/pages?id=hellogin-00dcbf97&chapterId=hellogin-00dcbf97/chapter/64&provider=asurascans
```
**Response Contract (`format: 'images' | 'pdf' | 'epub'`)**:
```json
{
  "success": true,
  "data": {
    "siteId": "asurascans",
    "mangaId": "hellogin-00dcbf97",
    "chapterId": "hellogin-00dcbf97/chapter/64",
    "chapterNumber": "64",
    "format": "images",
    "downloadUrl": null,
    "totalPages": 24,
    "pages": [
      {
        "page": 1,
        "url": "https://wsrv.nl/?url=https%3A%2F%2Fcdn.asurascans.com%2F...&q=80&output=webp"
      }
    ]
  }
}
```

### 5. On-the-Fly Image Proxy (CORS & Hotlink Bypass)
```http
GET /api/proxy/image?url=https://example.com/cover.jpg&w=300&q=80&output=webp
```
Redirects (302) to `wsrv.nl` edge CDN with long-term browser cache headers.

### 6. Batch Image Downloader
```http
POST /download/batch
Content-Type: application/json

{
  "images": [
    { "id": "p1", "url": "https://uploads.mangadex.org/covers/..." }
  ],
  "options": {
    "quality": 80,
    "format": "webp",
    "concurrency": 5
  }
}
```

---

## 🛠️ Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Dev Mode with Auto-Reload (Nodemon)
```bash
npm run dev
```

### 3. Run End-to-End Test Suite
```bash
node test.js
```

---

## 🚀 Deployment Options

### Option A: AWS Lambda (Serverless Framework)
```bash
npm run deploy
```
Deployed endpoints will automatically map via API Gateway.

---

### Option B: Deploying to Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. Connect & Deploy:
   ```bash
   vercel
   ```
   *Vercel will detect `vercel.json` and deploy Serverless functions automatically.*

---

### Option C: Deploying to Netlify

1. Install Netlify CLI:
   ```bash
   npm i -g netlify-cli
   ```
2. Connect & Deploy:
   ```bash
   netlify deploy --build
   ```
   *Netlify Functions will deploy using `netlify.toml`.*

---

### Option D: Cloudflare Pages / Workers

1. Ensure image requests pass through `/api/proxy/image` to utilize **wsrv.nl**'s 300+ global Cloudflare datacenters.
2. Deploy backend functions via Cloudflare Pages / Wrangler.

---

## 📄 License

MIT License - Open Source for Developers & Mobile App Builders.
