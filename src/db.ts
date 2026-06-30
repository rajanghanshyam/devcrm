import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import type { PrismaClient as PrismaClientType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

let _prisma: PrismaClientType | null = null;

function getPrismaInstance(): PrismaClientType {
  if (!_prisma) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PRISMA_DATABASE_URL || "postgres://39fa8947a0a7c93fc3ca5f596079dd20d678ac1cb93abbe4679e3e15ca18e1ec:sk_lGohgpWPo3Urls8VzjTok@db.prisma.io:5432/postgres?sslmode=require";
    if (!connectionString) {
      console.warn("WARNING: DATABASE_URL, POSTGRES_URL, or PRISMA_DATABASE_URL is not defined. Initializing Prisma client without adapter.");
      _prisma = new PrismaClient({
        log: ['error', 'warn'],
      });
    } else {
      const pool = new pg.Pool({ connectionString });
      const adapter = new PrismaPg(pool);
      _prisma = new PrismaClient({
        adapter,
        log: ['error', 'warn'],
      });
    }
  }
  return _prisma;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClientType };

export const prisma = new Proxy({} as PrismaClientType, {
  get(target, prop, receiver) {
    const instance = globalForPrisma.prisma || getPrismaInstance();
    if (process.env.NODE_ENV !== 'production' && !globalForPrisma.prisma) {
      globalForPrisma.prisma = instance;
    }
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

