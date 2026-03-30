# Auction Website

This project is a Vite React frontend backed by Vercel-style serverless API routes and Supabase.

## Prerequisites

- Node.js 20+
- A Supabase project with the required tables

## Environment

Create a local env file and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optionally also set `SUPABASE_URL`. The server code will use it first and fall back to `VITE_SUPABASE_URL`.

## Local Development

1. Install dependencies:
   `npm install`
2. Start the API layer on port `3000`:
   `npm run dev:api`
3. Start the Vite frontend on port `5173`:
   `npm run dev`

The frontend proxies `/api/*` requests to `http://localhost:3000`, so both processes need to be running for full local functionality.

## Useful Commands

- `npm run dev`
- `npm run dev:api`
- `npm run build`
- `npm run typecheck`
