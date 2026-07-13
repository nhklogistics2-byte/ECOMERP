import { PrismaClient } from '@prisma/client'

// ── Database URL resolution ─────────────────────────────────────────────
// On Vercel (and other serverless platforms), DATABASE_URL may not be set.
// SQLite requires a `file:` URL. We fall back to /tmp/dev.db which is the
// only writable directory on Vercel serverless functions.
//
// NOTE: /tmp is ephemeral on serverless — data is lost between cold starts.
// For persistent data on Vercel, set DATABASE_URL to a real Postgres/MySQL
// connection string and update prisma/schema.prisma accordingly.
//
// We also run a lazy `prisma db push` on first connection so tables are
// created automatically if the database file is fresh.

const FALLBACK_DB_URL = 'file:/tmp/dev.db'

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (url && url.trim().length > 0) return url
  // Fall back to /tmp for serverless environments
  console.warn('[db] DATABASE_URL not set — falling back to', FALLBACK_DB_URL)
  return FALLBACK_DB_URL
}

// Set the env var BEFORE PrismaClient is instantiated so the client picks it up
process.env.DATABASE_URL = resolveDatabaseUrl()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  __dbPushDone?: boolean
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ── Lazy table creation ─────────────────────────────────────────────────
// On serverless platforms, /tmp starts empty on each cold start.
// We run `prisma db push` programmatically on the first request to ensure
// all tables exist. This is a no-op if tables already exist.

let dbPushPromise: Promise<void> | null = null

export async function ensureDbReady(): Promise<void> {
  if (globalForPrisma.__dbPushDone) return
  if (!dbPushPromise) {
    dbPushPromise = (async () => {
      try {
        const { execSync } = await import('child_process')
        // Run prisma db push silently — creates tables if they don't exist
        execSync('npx prisma db push --skip-generate --accept-data-loss 2>&1', {
          stdio: 'pipe',
          env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
          timeout: 30000,
        })
        globalForPrisma.__dbPushDone = true
        console.log('[db] Tables ensured via prisma db push')
      } catch (e) {
        // If db push fails, the app will still work — queries will just
        // return errors which the API routes catch and return empty arrays
        console.error('[db] prisma db push failed (non-fatal):', (e as Error).message?.slice(0, 200))
        globalForPrisma.__dbPushDone = true // don't retry on every request
      }
    })()
  }
  return dbPushPromise
}
