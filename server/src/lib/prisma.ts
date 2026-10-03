import { PrismaClient } from '../../prisma/v2-client';

const prisma = new PrismaClient();

export { prisma };
export * from '../../prisma/v2-client';
