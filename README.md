# Noel Futsal — Sistem Booking & Manajemen Arena Futsal

Platform full-stack untuk pemesanan lapangan futsal secara online maupun offline (kasir), lengkap dengan sinkronisasi ketersediaan slot real-time, pembayaran Midtrans (Snap / VA / QRIS / E-Wallet), manajemen jadwal & blokir lapangan, pengelolaan refund, serta laporan pendapatan & utilisasi untuk Owner.

---

## Fitur Utama

### 1. Pelanggan (`user`) & Publik
- **Landing Page & Pencarian Jadwal:** Pencarian lapangan berdasarkan tanggal, jam main, dan jenis rumput (*Sintetis* / *Alami*).
- **Katalog & Detail Lapangan:** Filter multi-kriteria (jenis rumput, rentang harga, fasilitas), galeri foto arena, tarif per sesi, jam operasional, serta slot ketersediaan real-time.
- **Reservasi & Pembayaran Online:** Pemilihan slot berurutan (*contiguous*), ringkasan biaya sticky, integrasi **Midtrans Snap**, countdown pembayaran, dan halaman status pembayaran otomatis (*polling*).
- **History Booking & Profil:** Riwayat pemesanan, detail tiket/kode booking, pengajuan pembatalan/refund, serta pengaturan profil & kata sandi.

### 2. Petugas / Admin (`admin`)
- **Dashboard Operasional:** Ringkasan KPI harian/rentang tanggal, booking terbaru, dan metrik lapangan terpopuler.
- **Manajemen Lapangan & Fasilitas:** CRUD lapangan, upload foto & cover, pengaturan harga dinamis (`weekday`, `weekend`, `holiday`), jam operasional, serta toggle status aktif/nonaktif dengan proteksi booking mendatang.
- **Booking Offline (Kasir):** Wizard pembuatan reservasi langsung di tempat (pelanggan terdaftar maupun tamu) dengan pencatatan pembayaran tunai/transfer.
- **Jadwal & Blokir Slot:** Matriks jadwal harian seluruh lapangan, blokir jadwal (*maintenance*/event), dan panel detail reservasi.
- **Daftar Booking, Transaksi, Refund & Pengguna:** Tabel `DataTable` dengan filter, pencarian, *limit* per halaman (`10/20/50`), paginasi, panel detail slide-over (*drawer*), proses/tolak refund, manajemen akun & reset password, serta pengaturan sistem (TTL pembayaran, aturan refund).

### 3. Pemilik Arena (`owner`)
- **Dashboard Owner (Read-Only):** Pemantauan KPI pendapatan (Online vs Offline), utilisasi lapangan, dan tren performa.
- **Laporan Pendapatan:** Grafik pendapatan harian/bulanan (Recharts), rincian transaksi lunas, dan ekspor CSV.
- **Utilisasi Lapangan:** Heatmap jam ramai (*peak hours*) per hari dan tingkat keterisian lapangan.
- **Daftar Lapangan, Jadwal & Reservasi:** Tampilan *read-only* untuk mengawasi seluruh operasional arena.

---

## Tech Stack

### Backend (`bl-backend`)
- **Bahasa & Runtime:** Go `1.27`
- **Database & ORM:** MySQL `8.4`, GORM (`gorm.io/gorm`, `gorm.io/driver/mysql`)
- **Migrasi Database:** `golang-migrate/migrate/v4`
- **Cache & Session/Lock:** Redis `7.4` (`redis/go-redis/v9`)
- **Autentikasi & Keamanan:** JWT (`golang-jwt/jwt/v5`), `bcrypt` (`golang.org/x/crypto`), OTP email verification, HttpOnly refresh cookie
- **Validasi:** `go-playground/validator/v10`
- **Payment Gateway:** Midtrans Snap & webhook handler
- **Testing:** Go `testing`, `DATA-DOG/go-sqlmock`, `alicebob/miniredis/v2`

### Frontend (`bl-frontend`)
- **Framework & Bahasa:** React `19`, TypeScript `5.9`, Vite `8`
- **Styling & UI:** Tailwind CSS `v4` (`@tailwindcss/vite`), `lucide-react`, `sonner`
- **Routing:** React Router `v7` (`react-router-dom`)
- **State & Data Fetching:** TanStack Query `v5` (`@tanstack/react-query`), Zustand `v5`, Axios
- **Form & Validasi:** React Hook Form + Zod `v4` (`@hookform/resolvers`)
- **Visualisasi:** Recharts `v3`
- **Testing & Linting:** Vitest `v5`, Testing Library, MSW `v3`, ESLint `v10`, Oxlint, Prettier

---

## Struktur Direktori

```text
Saylendra-002/
├── bl-backend/                 # Layanan REST API Go
│   ├── cmd/                    # Entrypoint aplikasi (api, migrate)
│   ├── internal/
│   │   ├── app/                # Bootstrap router & dependency wiring
│   │   ├── config/             # Pembacaan env & konfigurasi
│   │   ├── infra/              # Koneksi MySQL, Redis, Email SMTP, Midtrans
│   │   ├── middleware/         # Auth JWT, RBAC, CORS, logging, rate-limit
│   │   └── modules/            # Modul domain:
│   │       ├── auth/           # Login, register, OTP, refresh token, user mgmt
│   │       ├── booking/        # Booking online/offline, ketersediaan slot, cancel
│   │       ├── field/          # Lapangan, fasilitas, harga, jam operasional
│   │       ├── payment/        # Midtrans Snap, callback/webhook, refund
│   │       ├── report/         # Dashboard, laporan pendapatan & utilisasi
│   │       ├── schedule/       # Blokir jadwal & matriks ketersediaan
│   │       └── setting/        # Pengaturan sistem global
│   ├── migrations/             # File migrasi SQL (up/down) & seed awal
│   ├── pkg/                    # Helper response, validator, error, dsb.
│   ├── uploads/                # Direktori penyimpanan foto lapangan lokal
│   ├── Dockerfile
│   └── Makefile
├── bl-frontend/                # Aplikasi SPA React + Vite
│   ├── public/
│   ├── src/
│   │   ├── app/                # Router, routes (public/user/admin/owner), pages
│   │   ├── components/         # Komponen UI reusable (ui, shared, layout)
│   │   ├── constants/          # Query keys, booking status, opsi konstan
│   │   ├── features/           # Fitur modular: auth, booking, fields, admin, owner
│   │   ├── hooks/              # Custom hooks umum (useDebounce, dll.)
│   │   ├── lib/                # Konfigurasi Axios & interceptor refresh token
│   │   ├── types/              # Tipe TypeScript global
│   │   └── utils/              # Formatter tanggal, mata uang, error helper
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── docs/                       # Dokumentasi teknis & task tracking
├── .env.example                # Template environment variables
├── docker-compose.dev.yml      # Stack development (MySQL, Redis, Backend, Frontend)
└── Makefile                    # Shortcut perintah backend dari root
```

---

## Cara Menjalankan Project

### Opsi 1: Menggunakan Docker Compose (Direkomendasikan)

1. Salin file `.env.example` menjadi `.env` di root (dan sesuaikan bila perlu):
   ```bash
   cp .env.example .env
   ```
2. Jalankan seluruh layanan (`mysql`, `redis`, `backend`, `frontend`):
   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```
3. Akses aplikasi:
   - **Frontend:** `http://localhost:5173`
   - **Backend API:** `http://localhost:8080/api/v1`

---

### Opsi 2: Menjalankan Secara Lokal (Tanpa Docker untuk App)

**Prasyarat:**
- Go `1.27+`
- Node.js `20+` (disarankan `24`) & npm
- MySQL `8.4` & Redis `7.4` aktif di mesin lokal

**1. Setup Environment Backend**
Salin `.env.example` ke `bl-backend/.env` dan sesuaikan kredensial MySQL, Redis, serta Midtrans:
```bash
cp .env.example bl-backend/.env
```

**2. Jalankan Backend (`bl-backend`)**
```bash
cd bl-backend
go mod download
go run ./cmd/api
```
> Server API akan berjalan pada port `8080` (`http://localhost:8080`) dan menerapkan migrasi database sesuai konfigurasi startup.

**3. Jalankan Frontend (`bl-frontend`)**
Buka terminal baru:
```bash
cd bl-frontend
npm install
npm run dev
```
> Aplikasi frontend berjalan pada `http://localhost:5173` dan secara default mem-proxy `/api` atau mengarah ke `VITE_API_URL` (`http://localhost:8080/api/v1`).

---

## Konfigurasi Environment (`.env`)

Variabel utama yang digunakan oleh backend (lihat [`.env.example`](.env.example)):

| Variabel | Deskripsi | Default Contoh |
| :--- | :--- | :--- |
| `APP_ENV` | Mode aplikasi (`development` / `production`) | `development` |
| `APP_PORT` | Port HTTP backend | `8080` |
| `TZ` | Zona waktu server | `Asia/Jakarta` |
| `DB_HOST`, `DB_PORT` | Host & port MySQL | `localhost`, `3306` |
| `DB_USER`, `DB_PASS`, `DB_NAME` | Kredensial & nama database MySQL | `app_user`, `app_password`, `football_booking` |
| `REDIS_ADDR`, `REDIS_PASS` | Alamat & password Redis | `localhost:6379`, `redis_password` |
| `JWT_SECRET` | Secret key JWT (minimal 32 karakter acak) | `change-me-with-at-least-32-random-bytes` |
| `JWT_ACCESS_TTL` | Masa berlaku access token | `15m` |
| `JWT_REFRESH_TTL` | Masa berlaku refresh token | `168h` |
| `MIDTRANS_SERVER_KEY` | Server key Midtrans | `change-me` |
| `MIDTRANS_CLIENT_KEY` | Client key Midtrans | `change-me` |
| `MIDTRANS_IS_PRODUCTION` | Mode produksi Midtrans (`true`/`false`) | `false` |
| `BOOKING_PAYMENT_TTL_MIN` | Batas waktu bayar booking online (menit) | `15` |
| `ALLOWED_ORIGINS` | Origin CORS yang diizinkan | `http://localhost:5173` |
| `SMTP_HOST`, `SMTP_PORT` | Konfigurasi SMTP untuk pengiriman OTP | `localhost`, `1025` |

Untuk frontend (`bl-frontend/.env` opsional):
- `VITE_API_URL=http://localhost:8080/api/v1`

---

## Akun Seed Bawaan (Development)

Berdasarkan migrasi `000020_seed_demo_users.up.sql` & `.env.example`, akun berikut tersedia untuk pengujian awal di environment development:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `admin12345` |
| **Owner** | `owner@example.com` | `owner12345` |
| **User (Pelanggan)** | `user@example.com` | `user12345` |

> **Catatan Keamanan:** Segera ganti password akun di atas dan perbarui `JWT_SECRET` sebelum deployment ke staging/production.

---

## Perintah Pengembangan & Pengujian

### Backend (`bl-backend`)
```bash
# Menjalankan seluruh unit & integration test Go
go test ./...

# Menjalankan linter (jika golangci-lint terpasang)
golangci-lint run

# Migrasi database manual
make migrate-up
make migrate-down

# Build binary API
go build -o bin/api ./cmd/api
```

### Frontend (`bl-frontend`)
```bash
# Typecheck TypeScript
npm run typecheck

# Linting (ESLint + Oxlint)
npm run lint

# Menjalankan unit & integration test (Vitest)
npm test

# Format kode dengan Prettier
npm run format

# Build produksi
npm run build
```
