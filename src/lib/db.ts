import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Database URL — use env var first, fallback to Neon connection for Vercel deployment
function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }
  // Fallback: this ensures the deployed app always has a working DB connection
  // even if Vercel runtime env vars are not set
  return 'postgresql://neondb_owner:npg_V0CoL3SDNcKm@ep-noisy-bonus-app8563v.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require'
}

function getDirectUrl() {
  if (process.env.DIRECT_URL) {
    return process.env.DIRECT_URL
  }
  return 'postgresql://neondb_owner:npg_V0CoL3SDNcKm@ep-noisy-bonus-app8563v.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require'
}

// Set env vars if not already set (needed for Prisma client which reads from process.env)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = getDatabaseUrl()
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = getDirectUrl()
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
  })

// Always reuse the same PrismaClient instance to prevent connection pool exhaustion
globalForPrisma.prisma = db
