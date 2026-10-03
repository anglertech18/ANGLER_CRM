-- AlterTable
ALTER TABLE `activitylog` MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'Sent';

-- AlterTable
ALTER TABLE `leadquadranthistory` MODIFY `movement_type` ENUM('AUTO', 'MANUAL') NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE `partner` MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'Active';

-- AlterTable
ALTER TABLE `planofaction` MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'Pending';

-- AlterTable
ALTER TABLE `user` MODIFY `role` ENUM('CEO', 'SalesManager', 'SalesPerson') NOT NULL DEFAULT 'SalesPerson',
    MODIFY `status` ENUM('INVITED', 'ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'INVITED',
    MODIFY `department` VARCHAR(191) NOT NULL DEFAULT 'IM';

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_reporting_manager_id_fkey` FOREIGN KEY (`reporting_manager_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Privilege` ADD CONSTRAINT `Privilege_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SBU` ADD CONSTRAINT `SBU_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `State` ADD CONSTRAINT `State_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `Country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `City` ADD CONSTRAINT `City_state_id_fkey` FOREIGN KEY (`state_id`) REFERENCES `State`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Persona` ADD CONSTRAINT `Persona_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Persona` ADD CONSTRAINT `Persona_eit_service_id_fkey` FOREIGN KEY (`eit_service_id`) REFERENCES `EitService`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Persona` ADD CONSTRAINT `Persona_im_service_id_fkey` FOREIGN KEY (`im_service_id`) REFERENCES `ImService`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserProductTarget` ADD CONSTRAINT `UserProductTarget_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserProductTarget` ADD CONSTRAINT `UserProductTarget_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserServiceTarget` ADD CONSTRAINT `UserServiceTarget_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_lead_owner_id_fkey` FOREIGN KEY (`lead_owner_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_sales_sbu_id_fkey` FOREIGN KEY (`sales_sbu_id`) REFERENCES `SBU`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_job_title_id_fkey` FOREIGN KEY (`job_title_id`) REFERENCES `JobTitle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_lead_source_id_fkey` FOREIGN KEY (`lead_source_id`) REFERENCES `LeadSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_industry_id_fkey` FOREIGN KEY (`industry_id`) REFERENCES `Industry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `Country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_state_id_fkey` FOREIGN KEY (`state_id`) REFERENCES `State`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `City`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_eit_service_id_fkey` FOREIGN KEY (`eit_service_id`) REFERENCES `EitService`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_im_service_id_fkey` FOREIGN KEY (`im_service_id`) REFERENCES `ImService`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_persona_id_fkey` FOREIGN KEY (`persona_id`) REFERENCES `Persona`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_avatar_id_fkey` FOREIGN KEY (`avatar_id`) REFERENCES `Avatar`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_where_find_them_id_fkey` FOREIGN KEY (`where_find_them_id`) REFERENCES `LeadSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_follow_up_activity_id_fkey` FOREIGN KEY (`follow_up_activity_id`) REFERENCES `Activity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_next_activity_id_fkey` FOREIGN KEY (`next_activity_id`) REFERENCES `Activity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_sales_stage_id_fkey` FOREIGN KEY (`sales_stage_id`) REFERENCES `SalesStage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_call_tracker_id_fkey` FOREIGN KEY (`call_tracker_id`) REFERENCES `CallTracker`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadContact` ADD CONSTRAINT `LeadContact_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadContact` ADD CONSTRAINT `LeadContact_avatar_id_fkey` FOREIGN KEY (`avatar_id`) REFERENCES `Avatar`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadContact` ADD CONSTRAINT `LeadContact_persona_id_fkey` FOREIGN KEY (`persona_id`) REFERENCES `Persona`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadDocument` ADD CONSTRAINT `LeadDocument_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadDocument` ADD CONSTRAINT `LeadDocument_follow_up_log_id_fkey` FOREIGN KEY (`follow_up_log_id`) REFERENCES `FollowUpLog`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpLog` ADD CONSTRAINT `FollowUpLog_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpLog` ADD CONSTRAINT `FollowUpLog_activity_id_fkey` FOREIGN KEY (`activity_id`) REFERENCES `Activity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpLog` ADD CONSTRAINT `FollowUpLog_next_activity_id_fkey` FOREIGN KEY (`next_activity_id`) REFERENCES `Activity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpLog` ADD CONSTRAINT `FollowUpLog_sales_stage_id_fkey` FOREIGN KEY (`sales_stage_id`) REFERENCES `SalesStage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FollowUpLog` ADD CONSTRAINT `FollowUpLog_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadQuadrantHistory` ADD CONSTRAINT `LeadQuadrantHistory_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadScore` ADD CONSTRAINT `LeadScore_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallLog` ADD CONSTRAINT `CallLog_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallLog` ADD CONSTRAINT `CallLog_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallActivityLog` ADD CONSTRAINT `CallActivityLog_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwatKeyClosure` ADD CONSTRAINT `SwatKeyClosure_swat_performance_id_fkey` FOREIGN KEY (`swat_performance_id`) REFERENCES `SwatPerformance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KraEntry` ADD CONSTRAINT `KraEntry_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PomodoroSession` ADD CONSTRAINT `PomodoroSession_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PricingNegotiationLog` ADD CONSTRAINT `PricingNegotiationLog_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PricingNegotiationLog` ADD CONSTRAINT `PricingNegotiationLog_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallTracker` ADD CONSTRAINT `CallTracker_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallTracker` ADD CONSTRAINT `CallTracker_eit_service_id_fkey` FOREIGN KEY (`eit_service_id`) REFERENCES `EitService`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallTracker` ADD CONSTRAINT `CallTracker_im_service_id_fkey` FOREIGN KEY (`im_service_id`) REFERENCES `ImService`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallTracker` ADD CONSTRAINT `CallTracker_industry_id_fkey` FOREIGN KEY (`industry_id`) REFERENCES `Industry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallTracker` ADD CONSTRAINT `CallTracker_source_of_db_id_fkey` FOREIGN KEY (`source_of_db_id`) REFERENCES `SourceOfDB`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallTracker` ADD CONSTRAINT `CallTracker_email_status_id_fkey` FOREIGN KEY (`email_status_id`) REFERENCES `EmailStatus`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallTracker` ADD CONSTRAINT `CallTracker_call_status_id_fkey` FOREIGN KEY (`call_status_id`) REFERENCES `CallStatus`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallTracker` ADD CONSTRAINT `CallTracker_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwatPerformance` ADD CONSTRAINT `SwatPerformance_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwatPerformance` ADD CONSTRAINT `SwatPerformance_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BulkUploadStaging` ADD CONSTRAINT `BulkUploadStaging_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_lead_source_id_fkey` FOREIGN KEY (`lead_source_id`) REFERENCES `LeadSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `Country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_state_id_fkey` FOREIGN KEY (`state_id`) REFERENCES `State`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `City`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_validated_by_id_fkey` FOREIGN KEY (`validated_by_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_allocated_to_id_fkey` FOREIGN KEY (`allocated_to_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_sales_stage_id_fkey` FOREIGN KEY (`sales_stage_id`) REFERENCES `SalesStage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeeklyReport` ADD CONSTRAINT `WeeklyReport_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanOfAction` ADD CONSTRAINT `PlanOfAction_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partner` ADD CONSTRAINT `Partner_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partner` ADD CONSTRAINT `Partner_source_id_fkey` FOREIGN KEY (`source_id`) REFERENCES `LeadSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ManagerCompanies` ADD CONSTRAINT `_ManagerCompanies_A_fkey` FOREIGN KEY (`A`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ManagerCompanies` ADD CONSTRAINT `_ManagerCompanies_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CollateralToLead` ADD CONSTRAINT `_CollateralToLead_A_fkey` FOREIGN KEY (`A`) REFERENCES `Collateral`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CollateralToLead` ADD CONSTRAINT `_CollateralToLead_B_fkey` FOREIGN KEY (`B`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

