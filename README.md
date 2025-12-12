# Earny - Fitness Credit Tracker

Earn credits through fitness activities, spend them watching YouTube and Twitch.

## Features

- Log fitness activities (gym, running, walking, biking)
- Earn credits based on activity type and duration/distance
- Track your credit balance
- Browser extension to spend credits watching videos
- Full transaction ledger

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Vercel Postgres
- **ORM**: Prisma
- **Auth**: NextAuth.js with Google OAuth
- **Styling**: Tailwind CSS

## Setup

### 1. Clone and Install

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required variables:
- `POSTGRES_PRISMA_URL` - Vercel Postgres connection string
- `POSTGRES_URL_NON_POOLING` - Vercel Postgres direct connection
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` - Your app URL (http://localhost:3000 for dev)

### 3. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-app.vercel.app/api/auth/callback/google` (production)

### 4. Initialize Database

```bash
npm run db:push
```

### 5. Run Development Server

```bash
npm run dev
```

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Import to Vercel

1. Go to [Vercel](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel will auto-detect Next.js

### 3. Add Vercel Postgres

1. In your Vercel project, go to Storage
2. Create a new Postgres database
3. Environment variables will be automatically added

### 4. Configure Environment Variables

Add these in Vercel project settings:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (your Vercel deployment URL)

### 5. Deploy

Push to main branch - Vercel will automatically deploy.

## Browser Extension

### Installation

1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension` folder

### Usage

1. Click the extension icon
2. Enter your Earny server URL (your Vercel deployment URL)
3. Log in through the popup
4. Navigate to YouTube or Twitch - the extension will track video time

## Configuration

### Activity Credits (`src/config/activities.ts`)

```typescript
export const ACTIVITY_CONFIG = {
  gym: { valuePerSession: 60 },
  run: { valuePerMile: 20, valuePerMinute: 2 },
  walk: { valuePerMile: 10, valuePerMinute: 1 },
  bike: { valuePerMile: 15, valuePerMinute: 1.5 },
};
```

### Spending Costs (`src/config/spending.ts`)

```typescript
export const SPENDING_CONFIG = {
  youtube: { costPerMinute: 1 },
  twitch: { costPerMinute: 1 },
};
```

## API Endpoints

- `GET /api/user` - Get current user info
- `GET /api/balance` - Get current balance
- `GET /api/activities` - Get activity config
- `POST /api/activities` - Log an activity
- `GET /api/transactions` - Get transaction history
- `POST /api/spend` - Spend credits (used by extension)

## License

MIT
