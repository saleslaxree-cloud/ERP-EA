import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
    datasourceUrl: process.env.DATABASE_URL,
  })

// Always reuse the same PrismaClient instance to prevent connection pool exhaustion
globalForPrisma.prisma = db