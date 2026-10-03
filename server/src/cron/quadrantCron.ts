import cron from 'node-cron';
import { PrismaClient, MovementType } from '@prisma/client';
import dayjs from 'dayjs';
import {
    getQualificationResetData,
    getQ4ToQ3ResetData,
    getQ3ToQ2ResetData,
    getQ2ToQ1ResetData,
    getQuadrantStageId
} from '../utils/leadHelper';

const prisma = new PrismaClient();

export const startQuadrantCron = () => {
    // Run every day at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('Running Quadrant Auto-Degradation Cron...');

        try {
            // 1. Fetch active leads with products
            const leads = await prisma.lead.findMany({
                where: {
                    is_farming: false,
                    product_id: { not: null },
                    quadrant: {
                        not: null,
                        notIn: ['Nurturing', 'Order Won']
                    }
                },
                include: {
                    product: true
                }
            });

            for (const lead of leads) {
                if (!lead.product || !lead.quadrant) continue;

                const product = lead.product;
                // Use quadrant_changed_at (date lead entered current quadrant),
                // fallback to quadrant_start_date (set by older compiled server), then created_at
                const lastMovement = dayjs(lead.quadrant_changed_at || lead.quadrant_start_date || lead.created_at);
                const daysDiff = dayjs().diff(lastMovement, 'day');

                let targetDays = 0;
                let nextQuadrant = "";

                // Determine threshold based on current quadrant
                switch (lead.quadrant) {
                    case 'Q4':
                        targetDays = product.q4_to_q3_days;
                        nextQuadrant = 'Q3';
                        break;
                    case 'Q3':
                        targetDays = product.q3_to_q2_days;
                        nextQuadrant = 'Q2';
                        break;
                    case 'Q2':
                        targetDays = product.q2_to_q1_days;
                        nextQuadrant = 'Q1';
                        break;
                    case 'Q1':
                        targetDays = product.q1_to_nurturing_days;
                        nextQuadrant = 'Nurturing';
                        break;
                    default:
                        continue;
                }

                // If threshold > 0 and daysDiff >= threshold, degrade
                if (targetDays > 0 && daysDiff >= targetDays) {
                    // Selective (partial) reset per step. Only Q1 -> Nurturing performs
                    // a full reset (Lead Score + all BANT); every step flags the lead
                    // for requalification so the "Auto Degraded" indicator appears.
                    let resetData: Record<string, any>;
                    switch (lead.quadrant) {
                        case 'Q4':
                            resetData = getQ4ToQ3ResetData();
                            break;
                        case 'Q3':
                            resetData = getQ3ToQ2ResetData();
                            break;
                        case 'Q2':
                            resetData = getQ2ToQ1ResetData();
                            break;
                        case 'Q1':
                        default:
                            resetData = getQualificationResetData();
                            break;
                    }

                    // Sales Stage synchronization: reaching Nurturing forces Sales Stage =
                    // Nurturing (matching the manual Sales Stage change behavior in
                    // leadController.ts); degrading within Q1-Q4 keeps the single
                    // "Quadrant" stage.
                    if (nextQuadrant === 'Nurturing') {
                        const nurturingStage = await prisma.salesStage.findFirst({
                            where: { name: 'Nurturing' },
                            select: { id: true }
                        });
                        if (nurturingStage) {
                            resetData.sales_stage_id = nurturingStage.id;
                        }
                    } else {
                        const quadrantStageId = await getQuadrantStageId();
                        if (quadrantStageId) {
                            resetData.sales_stage_id = quadrantStageId;
                        }
                    }

                    await prisma.$transaction(async (tx) => {
                        await tx.lead.update({
                            where: { id: lead.id },
                            data: {
                                quadrant: nextQuadrant,
                                ...resetData
                            }
                        });

                        await tx.leadQuadrantHistory.create({
                            data: {
                                lead_id: lead.id,
                                old_quadrant: lead.quadrant,
                                new_quadrant: nextQuadrant,
                                movement_type: MovementType.AUTO,
                                trigger_days: targetDays,
                                moved_at: new Date()
                            }
                        });
                    });
                    console.log(`Lead ID ${lead.id} automatically degraded from ${lead.quadrant} to ${nextQuadrant}`);
                }
            }
            console.log('Quadrant Degradation Cron Completed.');
        } catch (error) {
            console.error('Error in Quadrant Cron:', error);
        }
    });
};
