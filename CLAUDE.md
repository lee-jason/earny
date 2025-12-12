# Earny

A fitness credit tracking application that rewards physical activity with screen time. Users earn credits by logging fitness activities and spend them watching videos on YouTube and Twitch.

## Tech Stack

- **Frontend/Backend**: Next.js 16 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5 (Auth.js) with Google OAuth
- **Styling**: Tailwind CSS v4
- **Browser Extension**: Chrome (Manifest v3) and Firefox (Manifest v2)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth route handler
│   │   ├── activities/          # Log fitness activities (earn credits)
│   │   ├── balance/             # Get user balance
│   │   ├── spend/               # Spend credits (used by extension)
│   │   ├── transactions/        # Transaction history
│   │   └── user/                # User info
│   ├── dashboard/               # Main dashboard
│   ├── ledger/                  # Transaction history page
│   └── login/                   # Login page
├── components/                  # React components
├── config/
│   ├── activities.ts            # Fitness activity definitions & credit values
│   └── spending.ts              # Credit spending rates
└── lib/
    ├── auth.ts                  # NextAuth configuration
    ├── cors.ts                  # CORS helpers for extension
    └── prisma.ts                # Prisma client singleton

extension/                       # Chrome extension (Manifest v3)
extension-firefox/               # Firefox extension (Manifest v2)
prisma/
├── schema.prisma               # Database schema
└── migrations/                 # Migration files
```

## Local Development

### Prerequisites
- Node.js 20+
- Docker (for PostgreSQL)

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment file and configure:
   ```bash
   cp .env.example .env
   ```

3. Start PostgreSQL with Docker:
   ```bash
   docker compose up -d postgres
   ```

4. Run migrations:
   ```bash
   npm run db:migrate
   ```

5. Start the dev server:
   ```bash
   npm run dev
   ```

### Full Docker Development

To run everything in Docker (app + database):
```bash
docker compose up
```

This starts:
- PostgreSQL on port 5432
- Next.js dev server on port 3000

## Database & Migrations

### Prisma Commands

```bash
npm run db:migrate     # Create and apply migrations (development)
npm run db:push        # Push schema changes without migrations
npm run db:studio      # Open Prisma Studio GUI
```

### Schema

The database uses `POSTGRES_PRISMA_URL` for the connection string (not `DATABASE_URL`).

Key models:
- **User**: Has a `balance` field (credits) and relations to transactions
- **Transaction**: Records earning (fitness) and spending (video watching)
- **Account/Session**: NextAuth.js authentication models

### Production Migrations

To run migrations against production:

1. Create `.env.production` with your production database URL:
   ```
   POSTGRES_PRISMA_URL="your-production-connection-string"
   ```

2. Run:
   ```bash
   npm run db:migrate:prod
   ```

Note: Prisma auto-loads `.env` first. The `db:migrate:prod` script uses `dotenv-cli` with `-o` flag to override with `.env.production` values.

Migrations also run automatically on push to `main` via GitHub Actions (`.github/workflows/migrate.yml`). Add `POSTGRES_PRISMA_URL_PRODUCTION` to your GitHub repository secrets.

## Browser Extension

### Overview

The extension monitors video playback on YouTube and Twitch, deducting credits while users watch. When credits reach zero, the video is paused.

### Architecture

- **background.js**: Service worker that manages credit tracking, balance checks, and API communication
- **content.js**: Injected into YouTube/Twitch pages to detect video playback and pause videos
- **popup/**: Extension popup UI showing balance and status
- **config.js**: API base URL configuration

### Key Behaviors

1. Detects video play/pause events on YouTube and Twitch
2. Deducts credits every minute while video is playing
3. Checks balance every minute during playback
4. **Pauses video and shows overlay when balance <= 0**
5. Uses AuthJS session cookies for authentication

### Loading the Extension

**Chrome:**
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` folder

**Firefox:**
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select any file in `extension-firefox/`

### Updating the Extension

When making changes to the extension code, **always update both versions**:
- `extension/` - Chrome (Manifest v3)
- `extension-firefox/` - Firefox (Manifest v2)

The main differences between versions:
- Chrome uses `manifest_version: 3` with a service worker (`background.js`)
- Firefox uses `manifest_version: 2` with a background script

After updating, sync the shared files (`content.js`, `config.js`, `popup/*`) to both directories.

### API Endpoints Used

- `GET /api/balance` - Fetch current credit balance
- `POST /api/spend` - Deduct credits for video watching
