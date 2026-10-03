"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateLeadScore = calculateLeadScore;
exports.calculateQuadrant = calculateQuadrant;
exports.getQuadrantDescription = getQuadrantDescription;
exports.getQuadrantColor = getQuadrantColor;
exports.isValidScore = isValidScore;
exports.getScoreBreakdown = getScoreBreakdown;
/**
 * Calculate total lead score from 14 qualification criteria (max 28 points)
 * Each criterion scores 0-2 points
 */
function calculateLeadScore(lead) {
    // Add defensive null/undefined check
    if (!lead || typeof lead !== 'object') {
        console.warn('calculateLeadScore received invalid lead object:', lead);
        return 0; // Default fallback
    }
    const scores = [
        // A. Organization Needs (5 items)
        lead.reduce_cost_score || 0,
        lead.efficiency_score || 0,
        lead.automation_score || 0,
        lead.others_score || 0,
        lead.compliance_score || 0,
        // B. BANT / Critical Qualification (4 items)
        lead.established_need_score || 0,
        lead.urgency_score || 0,
        lead.budget_allocated_score || 0,
        lead.decision_maker_score || 0,
        // C. Other Key Info (3 items)
        lead.competition_score || 0,
        lead.champion_score || 0,
        lead.influencer_score || 0,
        // D. Lead Source Details (2 items)
        lead.lead_source_quality || 0,
        lead.decision_contact_score || 0,
    ];
    return scores.reduce((sum, score) => sum + score, 0);
}
/**
 * Calculate quadrant based on Lead Score + BANT status
 *
 * Logic (highest-qualifying quadrant wins — Q4 > Q3 > Q2 > Q1):
 * - Q4 (Hot):         Score > 20 AND Budget=Yes, Authority=Yes, Need=Yes, Timeline=Yes
 * - Q3 (Warm):        Score > 10 AND Budget=Yes, Authority=Yes, Need=Yes
 * - Q2 (Progressing): Score > 10 AND Need=Yes, Timeline=Yes
 * - Q1 (Interested):  Everything else (newly qualified / not yet meeting Q2-Q4 criteria)
 */
function calculateQuadrant(lead) {
    // Add defensive null/undefined checks
    if (!lead || typeof lead !== 'object') {
        console.warn('calculateQuadrant received invalid lead object:', lead);
        return 'Q1'; // Default fallback
    }
    const score = lead.lead_score || 0;
    const { budget_yes_no, authority_yes_no, need_yes_no, timeline_yes_no } = lead;
    // Q4: Score > 20 AND all BANT = Yes
    if (score > 20 && budget_yes_no && authority_yes_no && need_yes_no && timeline_yes_no) {
        return 'Q4';
    }
    // Q3: Score > 10 AND Budget=Yes, Authority=Yes, Need=Yes
    if (score > 10 && budget_yes_no && authority_yes_no && need_yes_no) {
        return 'Q3';
    }
    // Q2: Score > 10 AND Need=Yes, Timeline=Yes
    if (score > 10 && need_yes_no && timeline_yes_no) {
        return 'Q2';
    }
    // Q1: initial qualification — no mandatory BANT required
    return 'Q1';
}
/**
 * Get quadrant description
 */
function getQuadrantDescription(quadrant) {
    const descriptions = {
        'Q4': 'Hot - Ready to close',
        'Q3': 'Warm - High potential',
        'Q2': 'Progressing - Nurturing needed',
        'Q1': 'Interested - Early stage'
    };
    return descriptions[quadrant] || 'Unknown';
}
/**
 * Get quadrant color for UI
 */
function getQuadrantColor(quadrant) {
    const colors = {
        'Q4': 'bg-red-100 text-red-800 border-red-300', // Hot
        'Q3': 'bg-orange-100 text-orange-800 border-orange-300', // Warm
        'Q2': 'bg-yellow-100 text-yellow-800 border-yellow-300', // Progressing
        'Q1': 'bg-blue-100 text-blue-800 border-blue-300' // Interested
    };
    return colors[quadrant] || 'bg-gray-100 text-gray-800 border-gray-300';
}
/**
 * Validate score (must be 0, 1, or 2)
 */
function isValidScore(score) {
    return [0, 1, 2].includes(score);
}
/**
 * Get score breakdown by section
 */
function getScoreBreakdown(lead) {
    return {
        organizationNeeds: {
            reduceCost: lead.reduce_cost_score || 0,
            efficiency: lead.efficiency_score || 0,
            automation: lead.automation_score || 0,
            others: lead.others_score || 0,
            compliance: lead.compliance_score || 0,
            total: (lead.reduce_cost_score || 0) + (lead.efficiency_score || 0) +
                (lead.automation_score || 0) + (lead.others_score || 0) + (lead.compliance_score || 0),
            max: 10
        },
        bantCritical: {
            establishedNeed: lead.established_need_score || 0,
            urgency: lead.urgency_score || 0,
            budgetAllocated: lead.budget_allocated_score || 0,
            decisionMaker: lead.decision_maker_score || 0,
            total: (lead.established_need_score || 0) + (lead.urgency_score || 0) +
                (lead.budget_allocated_score || 0) + (lead.decision_maker_score || 0),
            max: 8
        },
        otherInfo: {
            competition: lead.competition_score || 0,
            champion: lead.champion_score || 0,
            influencer: lead.influencer_score || 0,
            total: (lead.competition_score || 0) + (lead.champion_score || 0) +
                (lead.influencer_score || 0),
            max: 6
        },
        leadSource: {
            quality: lead.lead_source_quality || 0,
            decisionContact: lead.decision_contact_score || 0,
            total: (lead.lead_source_quality || 0) + (lead.decision_contact_score || 0),
            max: 4
        },
        overallTotal: calculateLeadScore(lead),
        overallMax: 28
    };
}
