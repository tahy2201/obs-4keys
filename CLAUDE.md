# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a 4 Keys DevOps metrics dashboard built with Next.js 15 and TypeScript. It analyzes GitHub repository data to provide insights into key software delivery performance metrics including lead time for changes and PR throughput.

## Common Commands

### Development
```bash
npm run dev                 # Start development server with turbopack
npm run build              # Build for production
npm run start              # Start production server
npm run lint               # Run Next.js linting
```

### Database
```bash
npx prisma migrate dev     # Run database migrations
npx prisma generate        # Generate Prisma client
```

### Data Sync Scripts
```bash
npm run build:scripts      # Build TypeScript scripts
npm run run:sync           # Sync GitHub data to database
npm run run:categorize     # Categorize review comments using AI
```

### Code Quality
Uses Biome for formatting and linting:
- Line width: 120 characters
- Double quotes for strings
- Semicolons as needed
- Space indentation

## Architecture

### Database Layer
- **Prisma ORM** with PostgreSQL
- Database schema in `prisma/schema.prisma`
- Models: User, Repository, PullRequest, Review, ReviewComment, Deployment, Issue
- Tracks GitHub data with proper relationships and indexes

### API Layer
- Next.js API routes in `src/app/api/`
- Key endpoints:
  - `/api/metrics/lead-time/timeseries` - Lead time metrics
  - `/api/metrics/pr-count/timeseries` - PR count metrics
  - `/api/fetch-prs` - GitHub data fetching

### Frontend Layer
- **Next.js 15** with App Router
- **Ant Design** for UI components with `antd-style` for styling
- **React Hooks** for state management
- **Chart.js** and **Recharts** for data visualization

### Key Components
- `MetricsFilters` - Time range and granularity controls
- `MetricsSummary` - Statistical summary display
- `MetricsChart` - Time series visualization
- Custom hooks: `useLeadTimeMetrics`, `usePRCountMetrics`

### Data Sync Architecture
- `scripts/sync-github-data.ts` - Main sync script using Octokit
- Fetches PRs, reviews, comments, and related data
- Calculates lead time metrics (creation to merge time)
- Handles rate limiting and error recovery

## Environment Setup

Copy `env.sample` to `.env.local` and configure:
- `DATABASE_URL` - PostgreSQL connection string
- `GITHUB_API_TOKEN` - GitHub personal access token
- `DEFAULT_REPO_OWNER` - GitHub repository owner
- `DEFAULT_REPO_NAME` - GitHub repository name
- `GEMINI_API_KEY` - For AI comment categorization

## Key Features

### 4 Keys Metrics Focus
- **Lead Time for Changes**: Time from PR creation to merge
- **PR Throughput**: Number of PRs over time with daily/weekly/monthly granularity
- Time series analysis with configurable date ranges
- Statistical summaries and trend visualization

### GitHub Integration
- Comprehensive GitHub API integration
- Syncs PRs, reviews, comments, users, and labels
- Handles GitHub rate limiting and pagination
- Incremental sync based on last sync timestamp

### Data Analysis
- Time-based filtering with JST timezone support
- Granular metrics (daily, weekly, monthly)
- Lead time calculations in seconds
- Review comment categorization using AI