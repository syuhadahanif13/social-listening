# Raja Emas Indonesia — Social Listening Engine & Brand Intelligence

Sistem Social Listening dan Brand Intelligence untuk brand **Raja Emas Indonesia** yang terintegrasi dengan **Apify** (Actor: `trendsmcp/social-listening-mcp`), backend untuk **api.rajaemas.id**, database **MySQL** (`rei_listening`), serta dashboard monitoring interaktif.

---

## Fitur Utama

1. **Brand Social Monitoring**:
   - Memantau mentions, ulasan, dan sentimen brand di TikTok, YouTube, Google News, Twitter/X, Reddit, dan Google Search.
   - Analisis sentimen berbasis leksikon khusus bahasa Indonesia & Inggris untuk transaksi jual beli emas, perhiasan, kadar, dan pelayanan konsumen (Positif, Netral, Negatif).
2. **Normalisasi Metrik Tren (0 - 100)**:
   - Menghubungkan skor visibilitas antar-platform dan perhitungan pertumbuhan (% growth).
3. **Database Integration (MySQL)**:
   - Skema lengkap untuk tabel `brands`, `social_mentions`, `trend_metrics`, dan `listening_jobs`.
   - Auto-migration saat aplikasi dijalankan.
4. **Automated Scheduler (Cron)**:
   - Penjadwalan otomatis crawling data brand secara berkala (default: setiap 6 jam).
5. **Dashboard Visual Interaktif**:
   - UI modern bernuansa *Luxury Gold & Dark Theme* untuk visualisasi KPI, grafik perbandingan tren platform, rasio sentimen, dan feed mentions dengan filter real-time.
   - Tombol **"Scan Now"** untuk trigger scanning manual kapan saja.

---

## Arsitektur & Struktur Proyek

```
social-listening/
├── server.js                   # Entry point aplikasi & inisialisasi DB
├── package.json
├── .env.example                # Template konfigurasi environment
├── .env                        # Konfigurasi aktif (token, database, dll)
├── src/
│   ├── app.js                  # Express application & middleware
│   ├── config/
│   │   └── database.js         # Koneksi pool MySQL & healthcheck
│   ├── database/
│   │   ├── schema.sql          # DDL Skema tabel MySQL
│   │   └── migrator.js         # Auto-migration runner
│   ├── services/
│   │   ├── apifyService.js     # Integrasi Apify Actor & TrendsMCP
│   │   ├── sentimentService.js # Mesin analisis sentimen (ID/EN)
│   │   └── listeningService.js # Orkestrasi listening & penyimpanan data
│   ├── controllers/
│   │   ├── listeningController.js
│   │   ├── mentionsController.js
│   │   └── trendsController.js
│   ├── routes/
│   │   └── api.js              # Endpoint REST API
│   └── cron/
│       └── scheduler.js        # Background cron worker
└── public/
    ├── index.html              # Frontend Dashboard HTML
    ├── style.css               # Styling Dashboard (Gold Theme)
    └── app.js                  # Frontend Controller & Charts
```

---

## Konfigurasi Environment (`.env`)
 
Contoh konfigurasi environment pada file `.env`:
 
```env
PORT=3000
NODE_ENV=production
API_BASE_URL=https://api.rajaemas.id

# Database MySQL
DB_HOST=49.50.10.26
DB_PORT=3306
DB_USER=admin_listening
DB_PASSWORD=your_database_password
DB_NAME=rei_listening
DB_CONNECTION_LIMIT=10

# Apify Actor
APIFY_TOKEN=your_apify_api_token
APIFY_ACTOR=tri_angle/social-media-sentiment-analysis-tool

# TrendsMCP API Key (opsional dari trendsmcp.ai)
TRENDS_API_KEY=

# Brand Target
BRAND_NAME=Raja Emas Indonesia
BRAND_KEYWORDS="Raja Emas Indonesia, raja emas, rajaemas, jual beli emas raja emas"

# Cron Schedule (default: setiap 6 jam)
CRON_SCHEDULE="0 */6 * * *"
```

> **Catatan Penggunaan Database MySQL:**
> - Jika backend dijalankan langsung di server `49.50.10.26` (tempat `api.rajaemas.id` berjalan), ubah `DB_HOST=localhost` atau `127.0.0.1`.
> - Jika backend diakses dari laptop/komputer developer secara remote dan muncul pesan `Access denied for user 'admin_listening'@'<IP>'`, berikan hak akses remote di MySQL server dengan menjalankan perintah berikut di MySQL server:
> ```sql
> GRANT ALL PRIVILEGES ON rei_listening.* TO 'admin_listening'@'%' IDENTIFIED BY 'your_database_password';
> FLUSH PRIVILEGES;
> ```
> *Aplikasi telah dilengkapi fallback hybrid in-memory store agar tetap bisa berjalan dan diuji meskipun koneksi remote database sedang dibatasi oleh firewall/hak akses.*

---

## Integrasi Apify Actor (`trendsmcp/social-listening-mcp`)

Actor `trendsmcp/social-listening-mcp` adalah Actor bertipe **Standby MCP Server**.
1. Actor ini memeriksa variabel lingkungan `TRENDS_API_KEY`.
2. Pendaftaran API Key gratis (100 requests/bulan) dapat dilakukan di [trendsmcp.ai](https://trendsmcp.ai).
3. Setelah mendapatkan key, masukkan ke `TRENDS_API_KEY` di file `.env`.
4. Service `apifyService.js` menormalisasi feed data agar dapat diproses secara konsisten.

---

## Cara Menjalankan

### 1. Jalankan Server
```bash
npm start
```
Atau dalam mode development:
```bash
npm run dev
```

### 2. Buka Dashboard di Browser
- **Dashboard UI**: [http://localhost:3000/](http://localhost:3000/)
- **Health Check**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## Dokumentasi Endpoint REST API (untuk `api.rajaemas.id`)

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/health` | Status server, Apify, dan database MySQL |
| `GET` | `/api/brands` | Informasi target brand & kata kunci |
| `GET` | `/api/mentions` | Mengambil data mentions (query: `platform`, `sentiment`, `search`, `limit`, `offset`) |
| `GET` | `/api/trends` | Mengambil skor tren ternormalisasi (0 - 100) per platform |
| `GET` | `/api/sentiment/stats` | Rekapitulasi rasio sentimen (% Positif, Netral, Negatif) |
| `POST` | `/api/listening/trigger` | Memicu crawling & analisis sentimen secara on-demand |
| `GET` | `/api/listening/history` | Riwayat eksekusi job listening |

### Contoh Pemanggilan API:

#### 1. Filter Mentions Sentimen Positif di TikTok
```bash
curl "http://localhost:3000/api/mentions?platform=tiktok&sentiment=positive"
```

#### 2. Trigger Scan Manual
```bash
curl -X POST "http://localhost:3000/api/listening/trigger" \
  -H "Content-Type: application/json" \
  -d '{"brand": "Raja Emas Indonesia"}'
```
