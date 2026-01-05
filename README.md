# Two Person Chat

A simple, real-time chat application for two people built with Next.js and deployable to Vercel.

## Features

- Real-time messaging with polling
- **Persistent storage with Vercel KV** (messages saved globally)
- Clean and modern UI
- Username selection
- Responsive design
- Works across different countries seamlessly

## Getting Started

### Development

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deploy to Vercel

#### Step 1: Create Vercel KV Database

1. Go to [vercel.com](https://vercel.com) and sign in
2. Go to **Storage** tab
3. Click **Create Database**
4. Select **KV** (Redis)
5. Choose a name (e.g., "chat-messages")
6. Click **Create**

#### Step 2: Deploy Your App

**Option A: Via Vercel Dashboard (Recommended)**

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click **New Project**
4. Import your repository
5. In **Environment Variables**, the KV variables will be **automatically added**
6. Click **Deploy**

**Option B: Via Vercel CLI**

1.**Messages are persistent** and stored in Vercel KV (Redis)
- Messages are kept globally synchronized
- Works perfectly for users in different countries (India, Ireland, anywhere!)
- Free tier includes 256MB storage
- Last 100 messages are kept automaticallyour KV database:
```bash
vercel link
vercel env pull .env.local
```

3. Deploy:
```bash
vercel --prod
```

That's it! Your chat will work globally with persistent messages.

## Notes

- This app uses in-memory storage, so messages will reset when the server restarts
- For persistent storage, consider integrating:
  - Vercel KV (Redis)
  - Vercel Postgres
  - MongoDB Atlas
  - Supabase

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- React
- CSS Modules

- Vercel KV (Redis) for persistent storage