"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOrCreateClientCompany = void 0;
const prisma_1 = require("../lib/prisma");
/**
 * Finds an existing Client Company Master record by name (case-insensitive,
 * relying on MySQL's default collation) or creates a new one.
 *
 * This is the single source of truth for auto-creating client companies from
 * Lead creation/conversion flows (Lead Form, Call Tracker, Enquiry, etc).
 * The Company Master (`prisma.company`) must never be auto-populated — it is
 * manual-entry only.
 */
const findOrCreateClientCompany = async (name) => {
    if (!name || !name.trim())
        return null;
    const normalized = name.trim();
    const existing = await prisma_1.prisma.clientCompany.findFirst({
        where: { name: normalized }
    });
    if (existing)
        return existing.id;
    try {
        const created = await prisma_1.prisma.clientCompany.create({
            data: { name: normalized, is_active: true }
        });
        return created.id;
    }
    catch (e) {
        // Race condition or duplicate — retry find
        const retry = await prisma_1.prisma.clientCompany.findFirst({ where: { name: normalized } });
        return retry ? retry.id : null;
    }
};
exports.findOrCreateClientCompany = findOrCreateClientCompany;
