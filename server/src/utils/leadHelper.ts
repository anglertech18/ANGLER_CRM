import { PrismaClient, MovementType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Resolves the id of the single "Quadrant" SalesStage master record used for
 * all active pipeline leads (Q1-Q4). Sales Stage no longer tracks separate
 * Prospecting/Qualification/Proposal/Negotiation values for these leads —
 * `quadrant` alone carries that detail. Returns null if the master record
 * hasn't been created yet, so callers can no-op gracefully.
 */
export const getQuadrantStageId = async (): Promise<number | null> => {
    const stage = await prisma.salesStage.findFirst({ where: { name: 'Quadrant' }, select: { id: true } });
    return stage?.id ?? null;
};

/**
 * Resolves the `quadrant` value a new Lead should get from a source Sales Stage
 * (e.g. when a Lead is auto-created from an Enquiry or Call Tracker conversion,
 * with no BANT/score data yet to run the usual calculateQuadrant scoring).
 * Terminal stages map straight through: "Order Won" -> 'Order Won', "Order Lost"
 * -> 'Order Lost', "Nurturing" -> 'Nurturing' (with the qualification reset applied).
 * Any other stage (including the "Quadrant" master stage) defaults to 'Q1'.
 */
export const resolveLeadQuadrantFromSalesStage = async (salesStageId: number | null | undefined) => {
    let quadrant = 'Q1';
    let extra: Record<string, any> = {};

    if (salesStageId) {
        const stage = await prisma.salesStage.findUnique({ where: { id: Number(salesStageId) }, select: { name: true } });
        if (stage?.name === 'Order Won') {
            quadrant = 'Order Won';
            extra.order_won_at = new Date();
        } else if (stage?.name === 'Order Lost') {
            quadrant = 'Order Lost';
        } else if (stage?.name === 'Nurturing') {
            quadrant = 'Nurturing';
            extra = { ...getQualificationResetData() };
        }
    }

    return { quadrant, extra };
};

/**
 * Full reset — fields reset whenever a lead enters Nurturing (via Sales Stage,
 * manually or via the nightly cron's Q1 -> Nurturing degradation step). The
 * lead must be requalified — new Lead Score and BANT values entered — before
 * it can progress again.
 */
export const getQualificationResetData = () => {
    const now = new Date();
    return {
        // Lead Score criteria (reset to 0)
        reduce_cost_score: 0,
        efficiency_score: 0,
        automation_score: 0,
        others_score: 0,
        compliance_score: 0,
        established_need_score: 0,
        urgency_score: 0,
        budget_allocated_score: 0,
        decision_maker_score: 0,
        competition_score: 0,
        champion_score: 0,
        influencer_score: 0,
        lead_source_quality: 0,
        decision_contact_score: 0,
        lead_score: 0,

        // BANT Yes/No flags
        budget_yes_no: false,
        authority_yes_no: false,
        need_yes_no: false,
        timeline_yes_no: false,

        // Quadrant Age reset
        quadrant_start_date: now,
        quadrant_changed_at: now,
        quadrant_updated_at: now,

        requires_requalification: true
    };
};

/**
 * Partial reset applied by the nightly Auto-Degradation cron on Q4 -> Q3.
 * Only Timeline is reset; Lead Score, Budget, Authority, and Need are preserved.
 * Every auto-degradation step (partial or full) flags the lead for
 * requalification so the "Auto Degraded" indicator surfaces immediately.
 */
export const getQ4ToQ3ResetData = () => {
    const now = new Date();
    return {
        timeline_yes_no: false,
        quadrant_start_date: now,
        quadrant_changed_at: now,
        quadrant_updated_at: now,
        requires_requalification: true
    };
};

/**
 * Partial reset applied by the nightly Auto-Degradation cron on Q3 -> Q2.
 * Only Budget and Authority are reset; Lead Score, Need, and Timeline are preserved.
 */
export const getQ3ToQ2ResetData = () => {
    const now = new Date();
    return {
        budget_yes_no: false,
        authority_yes_no: false,
        quadrant_start_date: now,
        quadrant_changed_at: now,
        quadrant_updated_at: now,
        requires_requalification: true
    };
};

/**
 * Partial reset applied by the nightly Auto-Degradation cron on Q2 -> Q1.
 * All BANT values are reset; Lead Score is preserved.
 */
export const getQ2ToQ1ResetData = () => {
    const now = new Date();
    return {
        budget_yes_no: false,
        authority_yes_no: false,
        need_yes_no: false,
        timeline_yes_no: false,
        quadrant_start_date: now,
        quadrant_changed_at: now,
        quadrant_updated_at: now,
        requires_requalification: true
    };
};

/**
 * Centrally log any lead quadrant movement to LeadQuadrantHistory.
 * This should be called whenever a lead's quadrant is modified.
 */
export const logQuadrantMovement = async (params: {
    leadId: number;
    userId: number;
    oldQuadrant: string | null;
    newQuadrant: string | null;
    movementType?: MovementType;
}) => {
    const { leadId, userId, oldQuadrant, newQuadrant, movementType = 'MANUAL' } = params;

    // Only log if there's an actual change
    if (oldQuadrant === newQuadrant) return;

    try {
        await prisma.leadQuadrantHistory.create({
            data: {
                lead_id: leadId,
                user_id: userId,
                old_quadrant: oldQuadrant,
                new_quadrant: newQuadrant,
                movement_type: movementType,
                moved_at: new Date()
            }
        });
    } catch (error) {
        console.error('[logQuadrantMovement] Failed to log quadrant history:', error);
        // We don't throw here to avoid breaking the main operation if logging fails
    }
};
