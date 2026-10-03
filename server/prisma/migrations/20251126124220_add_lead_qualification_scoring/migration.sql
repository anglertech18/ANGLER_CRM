-- AlterTable
ALTER TABLE `lead` ADD COLUMN `automation_score` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `budget_allocated_score` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `champion_score` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `competition_score` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `compliance_score` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `decision_contact_score` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `decision_maker_score` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `efficiency_score` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `established_need_score` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `influencer_score` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `lead_source_quality` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `reduce_cost_score` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `urgency_score` INTEGER NOT NULL DEFAULT 0;
