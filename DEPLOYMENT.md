# 🚀 Deployment Guide

This guide will help you deploy your AI Meal Planner to production using free hosting services.

## 📋 Prerequisites

- GitHub account
- OpenAI API key
- Vercel account
- Neon account

## 🎯 Deployment Architecture

- **Frontend + API**: Vercel (free tier)
- **Database**: Neon PostgreSQL (free tier)

## 🚀 Step-by-Step Deployment

### 1. Set Up Database (Neon)

1. Go to [console.neon.tech](https://console.neon.tech) (you're already signed up!)
2. Select your project or create a new one
3. Go to "Connection Details" tab
4. Copy the **Connection String** (starts with `postgresql://`)
5. The URL format: `postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb`

### 2. Deploy to Vercel

1. Go to [Vercel.com](https://vercel.com) and sign up
2. Click "New Project" → Import from GitHub
3. Select your `ai-meal-planner` repository
4. Configure the project:
   - **Framework Preset**: SvelteKit
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.svelte-kit` (auto-detected)

### 3. Configure Environment Variables

In Vercel dashboard → Project Settings → Environment Variables:

| Variable         | Value                 | Description         |
| ---------------- | --------------------- | ------------------- |
| `OPENAI_API_KEY` | `your_openai_api_key` | Your OpenAI API key |
| `DATABASE_URL`   | `postgresql://...`    | Neon database URL   |
| `NODE_ENV`       | `production`          | Environment setting |

### 4. Deploy Database Schema

After Vercel deployment, you need to run Prisma migrations:

```bash
# Install Vercel CLI
npm i -g vercel

# Run database migrations
vercel env pull .env.local
npx prisma db push
npx prisma db seed
```

### Debug Commands

```bash
# Test database connection
npx prisma db push

# Check environment variables
vercel env ls

# View deployment logs
vercel logs [deployment-url]
```

## 📞 Support

- [Vercel Documentation](https://vercel.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [SvelteKit Deployment](https://kit.svelte.dev/docs/adapter-vercel)
