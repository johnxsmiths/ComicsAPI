# 📚 Serverless Manga & Comic REST API Scraper Ecosystem

An enterprise-grade, production-ready Serverless Node.js REST API ecosystem for high-volume comic, manga, and manhua data retrieval across **23+ site providers**. Built with ES Modules, Strategy Pattern Scraper Registry, Cloudflare Cookie Jar session persistence, **wsrv.nl** global CDN image caching, dynamic Swagger UI documentation, and multi-format reader payloads (`images`, `pdf`, `epub`).

---

## ⚡ 1-Click One-Touch Cloud Deployments

Deploy this API directly to your Cloudflare, Vercel, or Netlify account in 1-click:

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/johnxsmiths/ComicsAPI)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/johnxsmiths/ComicsAPI)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/johnxsmiths/ComicsAPI)

---

## ⚡ Features

- 🚀 **23+ Scraper Providers**: MangaDex, Comick, Asura Scans, MangaPark, MangaNato, MangaPill, WeebCentral, MangaTaro, Comix, MangaKatana, VortexScans, MangaTown, MangaHere, LikeManga, MangaFire, MangaDot, MangaBall, Atsumaru, RawOtaku, Scans.gg, VyManga, LinkManga, MangaGo.
- 🛡️ **Cloudflare & Anti-Bot Bypass**: `axios-cookiejar-support` + `tough-cookie` session persistence and Puppeteer + `@sparticuz/chromium` headless fallback.
- 🖼️ **wsrv.nl Image Cache & CORS Bypass**: Automatic image optimization and WebP conversion via `https://wsrv.nl` edge network (300+ global datacenters).
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
├── wrangler.toml                             # Cloudflare Workers / Pages deployment config
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
        ├── api.js                            # AWS Lambda / Edge entry handlers
        └── swagger.js                        # Swagger UI HTML & OpenAPI 3.0 JSON spec
```

---

## 📡 REST API Reference

### 1. List Providers
```http
GET /api/scrape/providers
```

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

### 5. On-the-Fly Image Proxy (CORS & Hotlink Bypass)
```http
GET /api/proxy/image?url=https://example.com/cover.jpg&w=300&q=80&output=webp
```

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start Dev Mode with auto-reload (Nodemon)
npm run dev

# Run End-to-End verification test
node test.js
```

---

## 🚀 Cloud Deployment Options

### Option A: Cloudflare Workers / Pages (*1-Click Deploy*)

1. **Via Cloudflare Deploy Button**: Click the [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/johnxsmiths/ComicsAPI) button above.
2. **Via Wrangler CLI**:
   ```bash
   npx wrangler deploy
   ```

---

### Option B: Vercel

1. Click the [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/johnxsmiths/ComicsAPI) button above or run:
   ```bash
   npx vercel
   ```

---

### Option C: Netlify

1. Click the [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/johnxsmiths/ComicsAPI) button above or run:
   ```bash
   npx netlify deploy --build
   ```

---

### Option D: AWS Lambda (Serverless Framework)

```bash
npm run deploy
```

---

## 📄 License

MIT License - Open Source.
