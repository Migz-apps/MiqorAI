import { PrismaClient } from "@prisma/client";
import { logger } from "./logger.js";

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

export async function connectDb(): Promise<void> {
  await prisma.$connect();
  logger.info("PostgreSQL connected");
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
