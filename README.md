# Taiti - Game Points Tracker

A web application to track points for your games. Built with Next.js, React, TailwindCSS, and PostgreSQL (Neon).

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL via Neon
- **ORM**: Prisma
- **Deployment**: Vercel

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/billsusanto/taiti.git
cd taiti
npm install
```

### 2. Set Up Database (Neon)

1. Create a free account at [Neon](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Update `.env` with your `DATABASE_URL`

### 3. Initialize Database

```bash
npx prisma db push
npm run dev
```

### 4. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

## Game Rules

*(To be defined - user will provide rules)*

## Project Structure

```
taiti/
├── prisma/
│   └── schema.prisma    # Database schema
├── src/
│   ├── app/            # Next.js App Router pages
│   ├── components/     # React components
│   ├── lib/            # Utilities & Prisma client
│   └── generated/      # Prisma generated types
└── public/             # Static assets
```
