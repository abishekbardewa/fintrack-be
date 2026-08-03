# FinTrack Backend

TypeScript / Express / MongoDB API for FinTrack.

## Requirements

- Node.js 20+
- MongoDB

## Setup

1. Create a local env file (for example `.env.development`).
2. Install and run:

```bash
npm install
npm run dev
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |

## API

### Health check

`GET /health`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "OK",
  "data": {
    "status": "healthy"
  }
}
```

## Project structure

```text
src/
  app.ts                 # Express app
  server.ts              # DB connect, listen, shutdown
  config/                # Env, logger, rate limits
  database/              # Mongo connection
  modules/               # Feature modules (auth, ...)
  shared/                # Errors, middleware, response helpers
  types/                 # Shared TypeScript types
```
