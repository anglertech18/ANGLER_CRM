"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaClient = void 0;
// Minimal mock of PrismaClient for unit tests
class PrismaClient {
    constructor() {
        this.weeklyReport = {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        };
        this.user = {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
        };
        this.lead = { findMany: jest.fn() };
        this.cashflowManagementCompany = { findMany: jest.fn() };
        this.billingForecastManagementCompany = { findMany: jest.fn() };
        this.userProductTarget = { findMany: jest.fn() };
        this.$queryRawUnsafe = jest.fn();
    }
}
exports.PrismaClient = PrismaClient;
