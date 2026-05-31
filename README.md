# iVote

> Secure in-house digital voting platform · Alpinesbolt  
> Blue: `#2f6ab2` · Grey: `#626e80` · White: `#f0f7ff`

---

## Architecture

```
ivote/                         ← pnpm monorepo root
├── apps/
│   ├── web/                   ← Vite + React 18 + TypeScript (browser)
│   ├── desktop/               ← Electron wrapper (macOS / Windows / Linux)
│   └── mobile/                ← Capacitor wrapper (Android / iOS)
├── server/                    ← Go 1.23 + Echo v4 + GORM + PostgreSQL
└── package.json               ← workspace root
```

---

## Stack

| Layer       | Technology                                      |
|-------------|------------------------------------------------|
| Frontend    | React 18, Vite, TypeScript, Tailwind CSS v3    |
| State       | Zustand (auth + draft), TanStack Query (server)|
| Forms       | React Hook Form + Zod validation               |
| API client  | Axios with Bearer token interceptor            |
| Backend     | Go 1.23, Echo v4                               |
| ORM         | GORM                                           |
| Database    | PostgreSQL 15+                                 |
| Auth        | JWT (HS256), bcrypt passwords, SHA-256 vote anonymisation |
| Desktop     | Electron 32                                    |
| Mobile      | Capacitor 6 (Android + iOS)                    |

---

## Prerequisites

- **Node.js** ≥ 20, **pnpm** ≥ 9
- **Go** ≥ 1.23
- **PostgreSQL** ≥ 15
- (Desktop) Electron build tools for your OS
- (Mobile) Android Studio or Xcode

---

## Quick Start

### 1 — Clone & install

```bash
git clone https://github.com/alpinesbolt/ivote.git
cd ivote
pnpm install
```

### 2 — Configure the server

```bash
cp server/.env.example server/.env
# Edit server/.env with your Postgres credentials and change all secrets
```

### 3 — Start the database

```bash
# macOS (Homebrew)
brew services start postgresql@15

# Or Docker
docker run -d \
  --name ivote-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=changeme \
  -e POSTGRES_DB=ivote \
  -p 5432:5432 \
  postgres:15-alpine
```

### 4 — Run the server (auto-migrates + seeds superadmin)

```bash
cd server
go run ./cmd/api
# ✅ Superadmin seeded: username="admin"  password="changeme123!"
# 🗳  iVote server running on :8080
```

> On first run, the superadmin is seeded from `SUPERADMIN_*` env vars.  
> **Change the password immediately in production.**

### 5 — Run the web app

```bash
# From repo root
pnpm dev
# → http://localhost:5173
```

---

## URLs

| URL                      | Who uses it          |
|--------------------------|----------------------|
| `/login`                 | Voter sign-in        |
| `/admin/login`           | Admin sign-in        |
| `/dashboard`             | Voter dashboard      |
| `/election/:id`          | Voter — cast vote    |
| `/admin/dashboard`       | Admin overview       |
| `/admin/elections`       | Election list        |
| `/admin/elections/create`| Multi-step create form|
| `/admin/elections/:id`   | Election detail & manage |
| `/admin/voters`          | Voter management     |
| `/admin/admins`          | Admin management (superadmin only) |

---

## Election Form — Multi-step Draft

The create-election form is a 5-step wizard:

| Step | Content |
|------|---------|
| 1    | Title, description, visibility (Public / Private) |
| 2    | Start + end datetime (15 min – 30 days enforced)  |
| 3    | Contestants (name, party, passport photo upload)   |
| 4    | Access — invite voters (private elections only)    |
| 5    | Review & publish, or save as draft                 |

Draft progress is persisted to `localStorage` via Zustand. You can leave the page mid-way and resume at the same step.

---

## Security Model

### Authentication
- **Admin** tokens issued at `/api/auth/admin/login` → separate URL (`/admin/login`)
- **Voter** tokens issued at `/api/auth/voter/login` → `/login`
- Both use JWT HS256 with configurable `JWT_SECRET`
- Passwords hashed with bcrypt (cost 10)

### Vote anonymisation
Each voter's UUID is run through `SHA-256(voterID + VOTE_PEPPER)` before being stored with a vote record. This means:
- No admin can query "which voter cast which vote"
- Duplicate-vote prevention still works (same hash every time for the same voter+pepper pair)
- Changing `VOTE_PEPPER` invalidates all hasVoted checks — only do this before any election data exists

### CORS
Only one origin is allowed, configured via `CORS_ORIGIN` in the server `.env`. The default is `http://localhost:5173`.

### Admin cap
A hard limit of **3 admins** is enforced in the service layer. Only the seeded superadmin can add or remove other admins. The superadmin account itself cannot be deleted.

---

## API Reference

### Auth
```
POST /api/auth/admin/login   { username, password }  → { token, admin }
POST /api/auth/voter/login   { username, password }  → { token, voter }
POST /api/auth/logout        (Bearer)
GET  /api/auth/me            (Bearer)
```

### Admin — Elections
```
GET    /api/elections                     list (paginated, filterable by status)
POST   /api/elections                     create
GET    /api/elections/:id                 get
PUT    /api/elections/:id                 update (draft only)
PATCH  /api/elections/:id/publish         publish
DELETE /api/elections/:id                 delete (draft/upcoming only)
GET    /api/elections/:id/results         live results
POST   /api/elections/:id/contestants     add contestant
PUT    /api/elections/:id/contestants/:cid
DELETE /api/elections/:id/contestants/:cid
POST   /api/elections/:id/invite          { voterId }
DELETE /api/elections/:id/invite/:voterId
```

### Admin — Voters & Admins
```
GET    /api/voters           list
POST   /api/voters           create
GET    /api/voters/:id
DELETE /api/voters/:id

GET    /api/admins           list  (superadmin only)
POST   /api/admins           create
DELETE /api/admins/:id
```

### Voter
```
GET  /api/voter/elections                   eligible elections
GET  /api/voter/elections/:id
GET  /api/voter/elections/:id/results
POST /api/voter/elections/:id/vote          { contestantId }
GET  /api/voter/elections/:id/my-vote       { voted, contestantId? }
```

### Upload
```
POST /api/upload/passport    multipart/form-data  → { url }
```

---

## Desktop (Electron)

```bash
# Dev (loads from Vite dev server)
pnpm dev:desktop

# Build distributable
pnpm build:desktop
# Output: apps/desktop/dist-electron/
```

In production, the Electron main process loads the built web files from `resources/web/index.html`. API calls still go to the Go server (configure `BASE_URL` accordingly).

---

## Mobile (Capacitor)

```bash
# 1. Build the web app
pnpm build

# 2. Sync to native projects (creates android/ and ios/ on first run)
cd apps/mobile
pnpm sync

# 3. Open in Android Studio / Xcode
pnpm open:android
pnpm open:ios

# 4. Or run directly on a connected device
pnpm run:android
pnpm run:ios
```

The mobile app points at the same Go server. Update `capacitor.config.ts` → `server.url` to your server's IP/hostname for device testing.

---

## Production Checklist

- [ ] Change `SUPERADMIN_PASSWORD` immediately after first run
- [ ] Set a strong `JWT_SECRET` (≥ 64 random bytes)
- [ ] Set a unique `VOTE_PEPPER` (≥ 32 random bytes) **before** any elections
- [ ] Set `CORS_ORIGIN` to your exact frontend domain
- [ ] Use `DB_SSLMODE=require` with a managed Postgres instance
- [ ] Serve static files and uploads behind a CDN / nginx
- [ ] Set `APP_ENV=production` to silence GORM query logging
- [ ] Enable HTTPS (TLS termination at nginx/load balancer level)

---

## Project by

**Alpinesbolt** — Innovation at Altitudes  
Built with Go, React, and ☕
