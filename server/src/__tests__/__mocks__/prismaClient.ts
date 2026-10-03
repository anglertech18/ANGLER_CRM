// Minimal mock of PrismaClient for unit tests
export class PrismaClient {
  weeklyReport = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  user = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  };
  lead = { findMany: jest.fn() };
  cashflowManagementCompany = { findMany: jest.fn() };
  billingForecastManagementCompany = { findMany: jest.fn() };
  userProductTarget = { findMany: jest.fn() };
  $queryRawUnsafe = jest.fn();
}
