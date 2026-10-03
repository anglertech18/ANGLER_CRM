import { prisma } from '../lib/prisma';

/**
 * All users that report to `managerId` directly or transitively (the full
 * downward reporting tree). Does NOT include `managerId` itself.
 *
 * Uses an iterative breadth-first walk over `reporting_manager_id` rather than a
 * recursive SQL CTE so it stays DB-version-agnostic and works with the Jest
 * prisma mock. The `collected` set makes it safe against accidental cycles in
 * the reporting graph.
 */
export async function getSubordinateIds(managerId: number): Promise<number[]> {
    const collected = new Set<number>();
    let frontier: number[] = [managerId];

    while (frontier.length) {
        const rows = await prisma.user.findMany({
            where: { reporting_manager_id: { in: frontier } },
            select: { id: true },
        });
        const next: number[] = [];
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
export async function getTeamIds(user: { id: number; role: string }): Promise<number[]> {
    if (user.role === 'SalesPerson') return [user.id];
    if (user.role === 'SalesManager') return [user.id, ...(await getSubordinateIds(user.id))];
    return [];
}

/**
 * True when `targetId` is the manager themselves or anywhere in their downward
 * reporting tree. Use for "can this manager act on / view this user" gates.
 */
export async function isInTeam(managerId: number, targetId: number): Promise<boolean> {
    if (managerId === targetId) return true;
    return (await getSubordinateIds(managerId)).includes(targetId);
}
