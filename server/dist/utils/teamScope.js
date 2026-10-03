"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubordinateIds = getSubordinateIds;
exports.getTeamIds = getTeamIds;
exports.isInTeam = isInTeam;
const prisma_1 = require("../lib/prisma");
/**
 * All users that report to `managerId` directly or transitively (the full
 * downward reporting tree). Does NOT include `managerId` itself.
 *
 * Uses an iterative breadth-first walk over `reporting_manager_id` rather than a
 * recursive SQL CTE so it stays DB-version-agnostic and works with the Jest
 * prisma mock. The `collected` set makes it safe against accidental cycles in
 * the reporting graph.
 */
async function getSubordinateIds(managerId) {
    const collected = new Set();
    let frontier = [managerId];
    while (frontier.length) {
        const rows = await prisma_1.prisma.user.findMany({
            where: { reporting_manager_id: { in: frontier } },
            select: { id: true },
        });
        const next = [];
        for (const r of rows) {
            if (r.id !== managerId && !collected.has(r.id)) {
                collected.add(r.id);
                next.push(r.id);
            }
        }
        frontier = next;
    }
    return [...collected];
}
/**
 * The set of user ids a caller is allowed to see records for:
 *   - SalesPerson  -> just themselves
 *   - SalesManager -> themselves + their entire downward reporting tree
 *   - anything else (CEO / management access) -> `[]`, which every caller
 *     interprets as "no user restriction" (matches the previous per-controller
 *     `getTeamIds` contract).
 */
async function getTeamIds(user) {
    if (user.role === 'SalesPerson')
        return [user.id];
    if (user.role === 'SalesManager')
        return [user.id, ...(await getSubordinateIds(user.id))];
    return [];
}
/**
 * True when `targetId` is the manager themselves or anywhere in their downward
 * reporting tree. Use for "can this manager act on / view this user" gates.
 */
async function isInTeam(managerId, targetId) {
    if (managerId === targetId)
        return true;
    return (await getSubordinateIds(managerId)).includes(targetId);
}
