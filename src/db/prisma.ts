import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | null = null;
let lastDatabaseUrl: string | null = null;

function createPrismaClient(): PrismaClient {
  const currentDatabaseUrl = process.env.DATABASE_URL;

  // If we already have a client with the same URL, reuse it
  if (prisma && lastDatabaseUrl === currentDatabaseUrl) {
    return prisma;
  }

  // Disconnect existing client if URL changed
  if (prisma && lastDatabaseUrl !== currentDatabaseUrl) {
    prisma.$disconnect();
  }

  // Create new client with current DATABASE_URL
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: currentDatabaseUrl,
      },
    },
  });

  lastDatabaseUrl = currentDatabaseUrl || null;
  return prisma;
}

// Export a proxy that creates the client on first access
export default new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = createPrismaClient();
    return client[prop as keyof PrismaClient];
  },
});
