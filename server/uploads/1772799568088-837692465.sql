-- phpMyAdmin SQL Dump
-- version 4.8.5
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 25, 2026 at 07:05 AM
-- Server version: 10.1.38-MariaDB
-- PHP Version: 7.2.15

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `crm`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity`
--

CREATE TABLE `activity` (
  `id` int(11) NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `activity`
--

INSERT INTO `activity` (`id`, `name`, `is_active`) VALUES
(1, 'Call', 1),
(2, 'Email', 1),
(3, 'Meeting', 1),
(4, 'Demo', 1),
(5, 'Follow-up', 1);

-- --------------------------------------------------------

--
-- Table structure for table `activitylog`
--

CREATE TABLE `activitylog` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Sent',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `activitylog`
--

INSERT INTO `activitylog` (`id`, `user_id`, `type`, `status`, `notes`, `created_at`) VALUES
(1, 3, 'LinkedIn Sent', 'Sent', NULL, '2026-02-24 00:00:00.000');

-- --------------------------------------------------------

--
-- Table structure for table `avatar`
--

CREATE TABLE `avatar` (
  `id` int(11) NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `avatar`
--

INSERT INTO `avatar` (`id`, `name`, `is_active`) VALUES
(1, 'Decision Maker', 1),
(2, 'Technical', 1),
(3, 'Professional', 1);

-- --------------------------------------------------------

--
-- Table structure for table `callactivitylog`
--

CREATE TABLE `callactivitylog` (
  `id` int(11) NOT NULL,
  `call_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action_type` enum('CREATE','UPDATE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_date` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `callactivitylog`
--

INSERT INTO `callactivitylog` (`id`, `call_id`, `user_id`, `action_type`, `action_date`, `created_at`) VALUES
(1, 1, 3, 'CREATE', '2026-02-23 18:30:00.000', '2026-02-24 11:49:10.562'),
(2, 1, 3, 'UPDATE', '2026-02-24 00:00:00.000', '2026-02-24 11:49:40.663');

-- --------------------------------------------------------

--
-- Table structure for table `calllog`
--

CREATE TABLE `calllog` (
  `id` int(11) NOT NULL,
  `lead_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `start_time` datetime(3) NOT NULL,
  `end_time` datetime(3) DEFAULT NULL,
  `duration_sec` int(11) DEFAULT NULL,
  `outcome` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `recording_url` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bant_snapshot` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `callstatus`
--

CREATE TABLE `callstatus` (
  `id` int(11) NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `callstatus`
--

INSERT INTO `callstatus` (`id`, `name`, `is_active`) VALUES
(1, 'Not Connected', 1),
(2, 'Connected', 1),
(3, 'Follow Up Required', 1),
(4, 'Interested', 1),
(5, 'Not Interested', 1),
(6, 'Call Back Later', 1),
(7, 'Converted to Lead', 1);

-- --------------------------------------------------------

--
-- Table structure for table `calltracker`
--

CREATE TABLE `calltracker` (
  `id` int(11) NOT NULL,
  `date` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `product_id` int(11) DEFAULT NULL,
  `industry_id` int(11) DEFAULT NULL,
  `source_of_db_id` int(11) DEFAULT NULL,
  `company_name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_person_name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `designation` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_address` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mobile_no` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `business_potential` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_status_id` int(11) DEFAULT NULL,
  `linkedin_sent` tinyint(1) NOT NULL DEFAULT '0',
  `call_status_id` int(11) DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `next_follow_up_date` datetime(3) DEFAULT NULL,
  `moved_to_quad` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quadrant_moved_date` datetime(3) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `is_converted` tinyint(1) NOT NULL DEFAULT '0',
  `converted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `calltracker`
--

INSERT INTO `calltracker` (`id`, `date`, `product_id`, `industry_id`, `source_of_db_id`, `company_name`, `location`, `contact_person_name`, `designation`, `email_address`, `mobile_no`, `business_potential`, `email_status_id`, `linkedin_sent`, `call_status_id`, `remarks`, `next_follow_up_date`, `moved_to_quad`, `quadrant_moved_date`, `user_id`, `is_converted`, `converted_at`, `created_at`, `updated_at`) VALUES
(1, '2026-02-24 00:00:00.000', 2, 1, NULL, '3dtech', 'chennai', 'xyz', 'manager', 'manager@gmail.com', '8484758383', '23', NULL, 1, NULL, 'test', '2026-02-25 00:00:00.000', NULL, NULL, 3, 0, NULL, '2026-02-24 11:49:10.492', '2026-02-24 11:49:40.587');

-- --------------------------------------------------------

--
-- Table structure for table `city`
--

CREATE TABLE `city` (
  `id` int(11) NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `state_id` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `city`
--

INSERT INTO `city` (`id`, `name`, `state_id`, `is_active`) VALUES
(1, 'San Francisco', 1, 1),
(2, 'Mumbai', 2, 1);

-- --------------------------------------------------------

--
-- Table structure for table `collateral`
--

CREATE TABLE `collateral` (
  `id` int(11) NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `company`
--

CREATE TABLE `company` (
  `id` int(11) NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `company`
--

INSERT INTO `company` (`id`, `name`, `is_active`) VALUES
(1, 'Angler Technologies', 1),
(2, 'trinetra', 1);

-- --------------------------------------------------------

--
-- Table structure for table `country`
--

CREATE TABLE `country` (
  `id` int(11) NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `country`
--

INSERT INTO `country` (`id`, `name`, `is_active`) VALUES
(1, 'India', 1),
(2, 'USA', 1);

-- --------------------------------------------------------

--
-- Table structure for table `department`
--

CREATE TABLE `department` (
  `id` int(11) NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `eitservice`
--

CREATE TABLE `eitservice` (
  `id` int(11) NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `count_type` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `eitservice`
--

INSERT INTO `eitservice` (`id`, `name`, `count_type`, `is_active`) VALUES
(1, 'Implementation Support', 'Mandays', 1),
(2, 'Annual Maintenance', 'Mandays', 1),
(3, 'Training Services', 'Mandays', 1);

-- --------------------------------------------------------

--
-- Table structure for table `emailstatus`
--

CREATE TABLE `emailstatus` (
  `id` int(11) NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `followuplog`
--

CREATE TABLE `followuplog` (
  `id` int(11) NOT NULL,
  `lead_id` int(11) NOT NULL,
  `activity_id` int(11) DEFAULT NULL,
  `date` datetime(3) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `imservice`
--

CREATE TABLE `imservice` (
  `id` int(11) NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `count_type` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `imservice`
--

INSERT INTO `imservice` (`id`, `name`, `count_type`, `is_active`) VALUES
(1, 'Security Audit', 'Nodes', 1),
(2, 'IT Infrastructure Management', 'Nodes', 1),
(3, 'Cloud Migration', 'Nodes', 1);

-- --------------------------------------------------------

--
-- Table structure for table `industry`
--

CREATE TABLE `industry` (
  `id` int(11) NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `industry`
--

INSERT INTO `industry` (`id`, `name`, `is_active`) VALUES
(1, 'Technology', 1),
(2, 'Healthcare', 1),
(3, 'Finance', 1);

-- --------------------------------------------------------

--
-- Table structure for table `jobtitle`
--

CREATE TABLE `jobtitle` (
  `id` int(11) NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `jobtitle`
--

INSERT INTO `jobtitle` (`id`, `name`, `is_active`) VALUES
(1, 'CEO', 1),
(2, 'Sales Manager', 1),
(3, 'VP Sales', 1),
(4, 'CTO', 1),
(5, 'IT Manager', 1);

-- --------------------------------------------------------

--
-- Table structure for table `kraentry`
--

CREATE TABLE `kraentry` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `calls_target` int(11) NOT NULL,
  `calls_actual` int(11) NOT NULL,
  `notes` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lead`
--

CREATE TABLE `lead` (
  `id` int(11) NOT NULL,
  `created_by_id` int(11) NOT NULL,
  `sales_sbu_id` int(11) DEFAULT NULL,
  `lead_owner_id` int(11) DEFAULT NULL,
  `salutation` enum('Mr','Mrs','Ms','Dr') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_id` int(11) DEFAULT NULL,
  `job_title_id` int(11) DEFAULT NULL,
  `avatar_id` int(11) DEFAULT NULL,
  `lead_source_id` int(11) DEFAULT NULL,
  `industry_id` int(11) DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `country_id` int(11) DEFAULT NULL,
  `state_id` int(11) DEFAULT NULL,
  `city_id` int(11) DEFAULT NULL,
  `pin_code` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `other_info` text COLLATE utf8mb4_unicode_ci,
  `annual_turnover` decimal(65,30) DEFAULT NULL,
  `mobile_number` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `whatsapp_number` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_or_service` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `eit_service_id` int(11) DEFAULT NULL,
  `im_service_id` int(11) DEFAULT NULL,
  `persona_id` int(11) DEFAULT NULL,
  `where_find_them_id` int(11) DEFAULT NULL,
  `telecalling_qualified` tinyint(1) NOT NULL DEFAULT '0',
  `device_count` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employee_count` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vendor_count` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branch_unit` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `license_count` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `custom_count_type` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requirement_desc` text COLLATE utf8mb4_unicode_ci,
  `pain_points` text COLLATE utf8mb4_unicode_ci,
  `pain_points_files` text COLLATE utf8mb4_unicode_ci,
  `demo_completed` tinyint(1) NOT NULL DEFAULT '0',
  `pilot_provided` tinyint(1) NOT NULL DEFAULT '0',
  `demo_done_authority` tinyint(1) NOT NULL DEFAULT '0',
  `post_demo_feedback_sent` tinyint(1) NOT NULL DEFAULT '0',
  `post_demo_feedback_received` tinyint(1) NOT NULL DEFAULT '0',
  `post_demo_feedback_file` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `probing_discussion_authority` tinyint(1) NOT NULL DEFAULT '0',
  `direct_visit_authority` tinyint(1) NOT NULL DEFAULT '0',
  `pilot_given` tinyint(1) NOT NULL DEFAULT '0',
  `mgmt_call_completed` tinyint(1) NOT NULL DEFAULT '0',
  `utilized_mgmt_urgency` tinyint(1) NOT NULL DEFAULT '0',
  `utilized_presales_timeline` tinyint(1) NOT NULL DEFAULT '0',
  `authority_champion_influencer_identified` tinyint(1) NOT NULL DEFAULT '0',
  `competitor_details` text COLLATE utf8mb4_unicode_ci,
  `opportunities_values` text COLLATE utf8mb4_unicode_ci,
  `order_won_attachment` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `order_value` decimal(65,30) DEFAULT NULL,
  `lead_score` int(11) NOT NULL DEFAULT '0',
  `reduce_cost_score` int(11) NOT NULL DEFAULT '0',
  `efficiency_score` int(11) NOT NULL DEFAULT '0',
  `automation_score` int(11) NOT NULL DEFAULT '0',
  `others_score` int(11) NOT NULL DEFAULT '0',
  `others_score_label` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `established_need_score` int(11) NOT NULL DEFAULT '0',
  `urgency_score` int(11) NOT NULL DEFAULT '0',
  `budget_allocated_score` int(11) NOT NULL DEFAULT '0',
  `decision_maker_score` int(11) NOT NULL DEFAULT '0',
  `competition_score` int(11) NOT NULL DEFAULT '0',
  `champion_score` int(11) NOT NULL DEFAULT '0',
  `influencer_score` int(11) NOT NULL DEFAULT '0',
  `lead_source_quality` int(11) NOT NULL DEFAULT '0',
  `decision_contact_score` int(11) NOT NULL DEFAULT '0',
  `budget_yes_no` tinyint(1) NOT NULL DEFAULT '0',
  `budget_allocated` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approval_stage` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `authority_yes_no` tinyint(1) NOT NULL DEFAULT '0',
  `decision_maker` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `need_yes_no` tinyint(1) NOT NULL DEFAULT '0',
  `pain_points_desc` text COLLATE utf8mb4_unicode_ci,
  `timeline_yes_no` tinyint(1) NOT NULL DEFAULT '0',
  `expected_closure_date` datetime(3) DEFAULT NULL,
  `quadrant` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quadrant_updated_at` datetime(3) DEFAULT NULL,
  `quadrant_start_date` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `last_positive_movement_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `follow_up_activity_id` int(11) DEFAULT NULL,
  `follow_up_datetime` datetime(3) DEFAULT NULL,
  `sales_stage_id` int(11) DEFAULT NULL,
  `next_activity_id` int(11) DEFAULT NULL,
  `next_activity_datetime` datetime(3) DEFAULT NULL,
  `is_farming` tinyint(1) NOT NULL DEFAULT '0',
  `farming_moved_at` datetime(3) DEFAULT NULL,
  `call_tracker_id` int(11) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `lead`
--

INSERT INTO `lead` (`id`, `created_by_id`, `sales_sbu_id`, `lead_owner_id`, `salutation`, `first_name`, `last_name`, `company_id`, `job_title_id`, `avatar_id`, `lead_source_id`, `industry_id`, `address`, `country_id`, `state_id`, `city_id`, `pin_code`, `other_info`, `annual_turnover`, `mobile_number`, `whatsapp_number`, `email`, `website`, `product_or_service`, `product_id`, `eit_service_id`, `im_service_id`, `persona_id`, `where_find_them_id`, `telecalling_qualified`, `device_count`, `employee_count`, `vendor_count`, `branch_unit`, `license_count`, `custom_count_type`, `requirement_desc`, `pain_points`, `pain_points_files`, `demo_completed`, `pilot_provided`, `demo_done_authority`, `post_demo_feedback_sent`, `post_demo_feedback_received`, `post_demo_feedback_file`, `probing_discussion_authority`, `direct_visit_authority`, `pilot_given`, `mgmt_call_completed`, `utilized_mgmt_urgency`, `utilized_presales_timeline`, `authority_champion_influencer_identified`, `competitor_details`, `opportunities_values`, `order_won_attachment`, `order_value`, `lead_score`, `reduce_cost_score`, `efficiency_score`, `automation_score`, `others_score`, `others_score_label`, `established_need_score`, `urgency_score`, `budget_allocated_score`, `decision_maker_score`, `competition_score`, `champion_score`, `influencer_score`, `lead_source_quality`, `decision_contact_score`, `budget_yes_no`, `budget_allocated`, `approval_stage`, `authority_yes_no`, `decision_maker`, `need_yes_no`, `pain_points_desc`, `timeline_yes_no`, `expected_closure_date`, `quadrant`, `quadrant_updated_at`, `quadrant_start_date`, `last_positive_movement_at`, `follow_up_activity_id`, `follow_up_datetime`, `sales_stage_id`, `next_activity_id`, `next_activity_datetime`, `is_farming`, `farming_moved_at`, `call_tracker_id`, `created_at`, `updated_at`) VALUES
(1, 3, 1, 3, 'Mr', 'Michael', 'Chen', 1, 4, 1, 4, 1, '123 Tech Street, Suite 100', 2, 1, 1, '94102', NULL, '5000000.000000000000000000000000000000', '9876543210', '9876543210', 'michael.chen@techcorp.com', 'www.techcorp.com', 'Product', 2, NULL, NULL, 1, 4, 1, '100', '250', NULL, NULL, NULL, NULL, 'Looking for CRM Software to manage sales pipeline', 'Critical: Manual processes causing delays', NULL, 1, 1, 0, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, '$75,000', 'Board Approved', 1, 'Michael Chen - CTO', 1, 'Urgent need for sales automation. Current system outdated, losing deals', 1, '2026-03-26 11:19:02.265', 'Q2', '2026-02-24 11:46:54.826', '2026-02-24 11:46:54.828', '2026-02-24 11:46:54.828', 3, NULL, 3, 4, NULL, 0, NULL, NULL, '2026-02-24 11:19:02.298', '2026-02-24 11:46:54.844'),
(2, 2, 1, 2, 'Ms', 'Sarah', 'Williams', 2, 3, 1, 3, 3, '456 Finance Ave', 1, 2, 2, '400001', NULL, '3000000.000000000000000000000000000000', '9876543211', NULL, 'sarah.williams@globalsolutions.com', 'www.globalsolutions.com', 'EitService', NULL, 2, NULL, NULL, 3, 1, NULL, '150', NULL, NULL, NULL, NULL, 'Exploring ERP options for finance automation', 'Need better reporting capabilities', NULL, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, 45, 0, 0, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 1, 'Sarah Williams - VP Sales', 1, 'Looking to improve efficiency', 1, '2026-05-25 11:19:02.570', 'Q2', NULL, '2026-02-24 11:19:02.574', '2026-02-24 11:19:02.574', 1, NULL, 2, 2, NULL, 0, NULL, NULL, '2026-02-24 11:19:02.574', '2026-02-24 11:19:02.574'),
(3, 3, 1, 3, 'Mr', 'David', 'Johnson', 1, 5, 2, 2, 2, '789 Health Plaza', 2, 1, 1, '94103', NULL, '1000000.000000000000000000000000000000', '9876543212', NULL, 'david.johnson@healthcorp.com', NULL, 'ImService', NULL, NULL, 2, NULL, 2, 0, NULL, '50', NULL, NULL, NULL, NULL, 'Initial inquiry about CRM', 'Exploring options', NULL, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, 15, 0, 0, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 0, NULL, 0, NULL, 0, NULL, 'Q4', NULL, '2026-02-24 11:19:02.637', '2026-02-24 11:19:02.637', 1, NULL, 1, 1, NULL, 0, NULL, NULL, '2026-02-24 11:19:02.637', '2026-02-24 11:19:02.637');

-- --------------------------------------------------------

--
-- Table structure for table `leadcontact`
--

CREATE TABLE `leadcontact` (
  `id` int(11) NOT NULL,
  `lead_id` int(11) NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `designation` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_mobile` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `whatsapp` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `leaddocument`
--

CREATE TABLE `leaddocument` (
  `id` int(11) NOT NULL,
  `lead_id` int(11) NOT NULL,
  `follow_up_log_id` int(11) DEFAULT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `leadquadranthistory`
--

CREATE TABLE `leadquadranthistory` (
  `id` int(11) NOT NULL,
  `lead_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `old_quadrant` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_quadrant` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `movement_type` enum('AUTO','MANUAL') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MANUAL',
  `moved_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `leadquadranthistory`
--

INSERT INTO `leadquadranthistory` (`id`, `lead_id`, `user_id`, `old_quadrant`, `new_quadrant`, `movement_type`, `moved_at`) VALUES
(1, 1, 3, 'Q1', 'Q2', 'MANUAL', '2026-02-24 11:46:54.768');

-- --------------------------------------------------------

--
-- Table structure for table `leadscore`
--

CREATE TABLE `leadscore` (
  `id` int(11) NOT NULL,
  `lead_id` int(11) NOT NULL,
  `score` int(11) NOT NULL,
  `breakdown` text COLLATE utf8mb4_unicode_ci,
  `updated_by` int(11) NOT NULL,
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `leadsource`
--

CREATE TABLE `leadsource` (
  `id` int(11) NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `leadsource`
--

INSERT INTO `leadsource` (`id`, `name`, `is_active`) VALUES
(1, 'Referral', 1),
(2, 'Cold Call', 1),
(3, 'LinkedIn', 1),
(4, 'Website', 1);

-- --------------------------------------------------------

--
-- Table structure for table `persona`
--

CREATE TABLE `persona` (
  `id` int(11) NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `persona`
--

INSERT INTO `persona` (`id`, `name`, `product_id`, `is_active`) VALUES
(1, 'Decision Maker', 2, 1),
(2, 'Influencer', 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `pomodorosession`
--

CREATE TABLE `pomodorosession` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `start_time` datetime(3) NOT NULL,
  `end_time` datetime(3) DEFAULT NULL,
  `duration_sec` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pricingnegotiationlog`
--

CREATE TABLE `pricingnegotiationlog` (
  `id` int(11) NOT NULL,
  `lead_id` int(11) NOT NULL,
  `date` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `details` text COLLATE utf8mb4_unicode_ci,
  `created_by` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `privilege`
--

CREATE TABLE `privilege` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `module_name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `can_add` tinyint(1) NOT NULL DEFAULT '0',
  `can_edit` tinyint(1) NOT NULL DEFAULT '0',
  `can_delete` tinyint(1) NOT NULL DEFAULT '0',
  `can_view` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `privilege`
--

INSERT INTO `privilege` (`id`, `user_id`, `module_name`, `can_add`, `can_edit`, `can_delete`, `can_view`) VALUES
(1, 1, 'Leads', 1, 1, 1, 1),
(2, 1, 'Calls', 1, 1, 1, 1),
(3, 1, 'Reports', 1, 1, 1, 1),
(4, 1, 'Masters', 1, 1, 1, 1),
(5, 1, 'Users', 1, 1, 1, 1),
(6, 1, 'Dashboard', 1, 1, 1, 1),
(7, 2, 'Leads', 1, 1, 1, 1),
(8, 2, 'Calls', 1, 1, 1, 1),
(9, 2, 'Reports', 1, 1, 1, 1),
(10, 2, 'Masters', 1, 1, 1, 1),
(11, 2, 'Users', 1, 1, 1, 1),
(12, 2, 'Dashboard', 1, 1, 1, 1),
(13, 3, 'Leads', 1, 1, 0, 1),
(14, 3, 'Calls', 1, 1, 0, 1),
(15, 3, 'Reports', 1, 1, 0, 1),
(16, 3, 'Masters', 1, 1, 0, 1),
(17, 3, 'Users', 0, 1, 0, 1),
(18, 3, 'Dashboard', 1, 1, 0, 1),
(19, 2, 'UserMaster', 1, 1, 1, 1),
(20, 2, 'PrivilegeMaster', 0, 0, 0, 0);

-- --------------------------------------------------------

--
-- Table structure for table `product`
--

CREATE TABLE `product` (
  `id` int(11) NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `count_type` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `q4_to_q3_days` int(11) NOT NULL DEFAULT '0',
  `q3_to_q2_days` int(11) NOT NULL DEFAULT '0',
  `q2_to_q1_days` int(11) NOT NULL DEFAULT '0',
  `q1_to_nurturing_days` int(11) NOT NULL DEFAULT '0',
  `device_q4_multiplier` double NOT NULL DEFAULT '1',
  `device_q3_multiplier` double NOT NULL DEFAULT '1',
  `device_q2_multiplier` double NOT NULL DEFAULT '1',
  `device_q1_multiplier` double NOT NULL DEFAULT '1',
  `lead_q4_multiplier` double NOT NULL DEFAULT '1',
  `lead_q3_multiplier` double NOT NULL DEFAULT '1',
  `lead_q2_multiplier` double NOT NULL DEFAULT '1',
  `lead_q1_multiplier` double NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `product`
--

INSERT INTO `product` (`id`, `name`, `count_type`, `is_active`, `q4_to_q3_days`, `q3_to_q2_days`, `q2_to_q1_days`, `q1_to_nurturing_days`, `device_q4_multiplier`, `device_q3_multiplier`, `device_q2_multiplier`, `device_q1_multiplier`, `lead_q4_multiplier`, `lead_q3_multiplier`, `lead_q2_multiplier`, `lead_q1_multiplier`) VALUES
(1, 'Time Check', NULL, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1),
(2, 'Aura', NULL, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `salesstage`
--

CREATE TABLE `salesstage` (
  `id` int(11) NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `salesstage`
--

INSERT INTO `salesstage` (`id`, `name`, `is_active`) VALUES
(1, 'Prospecting', 1),
(2, 'Qualification', 1),
(3, 'Proposal', 1),
(4, 'Negotiation', 1),
(5, 'Order Won', 1),
(6, 'Lost', 1);

-- --------------------------------------------------------

--
-- Table structure for table `sbu`
--

CREATE TABLE `sbu` (
  `id` int(11) NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_id` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sbu`
--

INSERT INTO `sbu` (`id`, `name`, `company_id`, `is_active`) VALUES
(1, 'North Region', 1, 1),
(2, 'South Region', 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `sourceofdb`
--

CREATE TABLE `sourceofdb` (
  `id` int(11) NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sourceofdb`
--

INSERT INTO `sourceofdb` (`id`, `name`, `is_active`) VALUES
(1, 'Cold Database', 1),
(2, 'Referral', 1),
(3, 'Website', 1),
(4, 'Event', 1),
(5, 'LinkedIn', 1),
(6, 'Purchased Data', 1);

-- --------------------------------------------------------

--
-- Table structure for table `state`
--

CREATE TABLE `state` (
  `id` int(11) NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `country_id` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `state`
--

INSERT INTO `state` (`id`, `name`, `country_id`, `is_active`) VALUES
(1, 'California', 2, 1),
(2, 'Maharashtra', 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `swatkeyclosure`
--

CREATE TABLE `swatkeyclosure` (
  `id` int(11) NOT NULL,
  `swat_performance_id` int(11) NOT NULL,
  `closure_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `swatperformance`
--

CREATE TABLE `swatperformance` (
  `id` int(11) NOT NULL,
  `bde_name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `calls_target` int(11) NOT NULL DEFAULT '0',
  `calls_achieved` int(11) NOT NULL DEFAULT '0',
  `calls_remarks` text COLLATE utf8mb4_unicode_ci,
  `activities_target` int(11) NOT NULL DEFAULT '0',
  `activities_achieved` int(11) NOT NULL DEFAULT '0',
  `activities_remarks` text COLLATE utf8mb4_unicode_ci,
  `q1_lead_gen_target` int(11) NOT NULL DEFAULT '0',
  `q1_lead_gen_achieved` int(11) NOT NULL DEFAULT '0',
  `q1_lead_gen_remarks` text COLLATE utf8mb4_unicode_ci,
  `q1_to_q2` int(11) NOT NULL DEFAULT '0',
  `q2_to_q3` int(11) NOT NULL DEFAULT '0',
  `q3_to_q4` int(11) NOT NULL DEFAULT '0',
  `q4_to_order` int(11) NOT NULL DEFAULT '0',
  `q4_to_q3` int(11) NOT NULL DEFAULT '0',
  `q3_to_q2` int(11) NOT NULL DEFAULT '0',
  `q2_to_q1` int(11) NOT NULL DEFAULT '0',
  `any_to_nurturing` int(11) NOT NULL DEFAULT '0',
  `visits_target` int(11) NOT NULL DEFAULT '0',
  `visits_achieved` int(11) NOT NULL DEFAULT '0',
  `visits_remarks` text COLLATE utf8mb4_unicode_ci,
  `linkedin_target` int(11) NOT NULL DEFAULT '0',
  `linkedin_achieved` int(11) NOT NULL DEFAULT '0',
  `linkedin_remarks` text COLLATE utf8mb4_unicode_ci,
  `demos_target` int(11) NOT NULL DEFAULT '0',
  `demos_achieved` int(11) NOT NULL DEFAULT '0',
  `demos_remarks` text COLLATE utf8mb4_unicode_ci,
  `proposals_target` int(11) NOT NULL DEFAULT '0',
  `proposals_achieved` int(11) NOT NULL DEFAULT '0',
  `proposals_remarks` text COLLATE utf8mb4_unicode_ci,
  `direct_visit_target` int(11) NOT NULL DEFAULT '0',
  `direct_visit_achieved` int(11) NOT NULL DEFAULT '0',
  `direct_visit_remarks` text COLLATE utf8mb4_unicode_ci,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `performance_percentage` double NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `swatperformance`
--

INSERT INTO `swatperformance` (`id`, `bde_name`, `date`, `calls_target`, `calls_achieved`, `calls_remarks`, `activities_target`, `activities_achieved`, `activities_remarks`, `q1_lead_gen_target`, `q1_lead_gen_achieved`, `q1_lead_gen_remarks`, `q1_to_q2`, `q2_to_q3`, `q3_to_q4`, `q4_to_order`, `q4_to_q3`, `q3_to_q2`, `q2_to_q1`, `any_to_nurturing`, `visits_target`, `visits_achieved`, `visits_remarks`, `linkedin_target`, `linkedin_achieved`, `linkedin_remarks`, `demos_target`, `demos_achieved`, `demos_remarks`, `proposals_target`, `proposals_achieved`, `proposals_remarks`, `direct_visit_target`, `direct_visit_achieved`, `direct_visit_remarks`, `user_id`, `product_id`, `performance_percentage`, `created_at`, `updated_at`) VALUES
(1, 'John CEO', '2026-02-23', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 1, 0, '2026-02-24 11:25:48.661', '2026-02-24 11:25:48.661'),
(2, 'John CEO', '2026-02-23', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 2, 0, '2026-02-24 11:25:51.380', '2026-02-24 11:25:51.380'),
(3, 'Sales Person One', '2026-02-23', 15, 0, NULL, 25, 0, NULL, 3, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, NULL, 10, 0, NULL, 0, 0, NULL, 0, 0, NULL, 2, 0, NULL, 3, 1, 0, '2026-02-24 11:46:43.835', '2026-02-24 11:46:43.835'),
(8, 'Sales Person One', '2026-02-23', 0, 1, NULL, 0, 1, NULL, 0, 0, NULL, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 1, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 3, 2, 0, '2026-02-24 11:50:19.730', '2026-02-24 11:50:19.730');

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `id` int(11) NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('CEO','SalesManager','SalesPerson','Marketing') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SalesPerson',
  `status` enum('INVITED','ACTIVE','INACTIVE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INVITED',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `joining_date` datetime(3) DEFAULT NULL,
  `revenue_target` int(11) DEFAULT '0',
  `device_target` int(11) DEFAULT '0',
  `leads_target` int(11) DEFAULT '0',
  `calls_target` int(11) DEFAULT '0',
  `activities_target` int(11) DEFAULT '0',
  `q1_target` int(11) DEFAULT '0',
  `visits_target` int(11) DEFAULT '0',
  `linkedin_target` int(11) DEFAULT '0',
  `demo_target` int(11) DEFAULT '0',
  `proposal_target` int(11) DEFAULT '0',
  `direct_visit_target` int(11) DEFAULT '0',
  `daily_calls_target` int(11) DEFAULT '0',
  `daily_visit_target` int(11) DEFAULT '0',
  `daily_linkedin_target` int(11) DEFAULT '0',
  `monthly_revenue_target` double DEFAULT '0',
  `daily_calls_achievement` int(11) DEFAULT '0',
  `monthly_revenue_achievement` double DEFAULT '0',
  `company_id` int(11) DEFAULT NULL,
  `sbu_id` int(11) DEFAULT NULL,
  `reporting_manager_id` int(11) DEFAULT NULL,
  `reset_token` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reset_token_expiry` datetime(3) DEFAULT NULL,
  `department_id` int(11) DEFAULT NULL,
  `department` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'IM',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`id`, `email`, `password_hash`, `first_name`, `last_name`, `role`, `status`, `is_active`, `joining_date`, `revenue_target`, `device_target`, `leads_target`, `calls_target`, `activities_target`, `q1_target`, `visits_target`, `linkedin_target`, `demo_target`, `proposal_target`, `direct_visit_target`, `daily_calls_target`, `daily_visit_target`, `daily_linkedin_target`, `monthly_revenue_target`, `daily_calls_achievement`, `monthly_revenue_achievement`, `company_id`, `sbu_id`, `reporting_manager_id`, `reset_token`, `reset_token_expiry`, `department_id`, `department`, `created_at`, `updated_at`) VALUES
(1, 'ceo@crm.com', '$2a$12$bHRWpQym3Ui9uitlrr4imuP8ATeWFg0E/4xQzDW56s/pvP6kWze0y', 'John', 'CEO', 'CEO', 'ACTIVE', 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, NULL, NULL, NULL, NULL, NULL, 'IM', '2026-02-24 11:19:01.303', '2026-02-24 11:42:57.493'),
(2, 'manager1@crm.com', '$2b$10$Zm/Uu7v/OlPYD4tmLOg.0.I0JTudChqIGsDiV2k25.s7FFB4nO3P6', 'Manager', 'One', 'SalesManager', 'ACTIVE', 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, NULL, NULL, NULL, 'IM', '2026-02-24 11:19:01.405', '2026-02-24 11:41:27.179'),
(3, 'sales1@crm.com', '$2b$10$Zm/Uu7v/OlPYD4tmLOg.0.I0JTudChqIGsDiV2k25.s7FFB4nO3P6', 'Sales', 'Person One', 'SalesPerson', 'ACTIVE', 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, NULL, NULL, NULL, 'IM', '2026-02-24 11:19:01.553', '2026-02-24 11:41:22.878');

-- --------------------------------------------------------

--
-- Table structure for table `userproducttarget`
--

CREATE TABLE `userproducttarget` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `sales_target` int(11) DEFAULT '0',
  `revenue_target` int(11) DEFAULT '0',
  `device_target` int(11) DEFAULT '0',
  `leads_target` int(11) DEFAULT '0',
  `calls_target` int(11) DEFAULT '0',
  `linkedin_target` int(11) DEFAULT '0',
  `direct_visit_target` int(11) DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `userproducttarget`
--

INSERT INTO `userproducttarget` (`id`, `user_id`, `product_id`, `sales_target`, `revenue_target`, `device_target`, `leads_target`, `calls_target`, `linkedin_target`, `direct_visit_target`, `created_at`, `updated_at`) VALUES
(1, 3, 1, 3, 1, 1, 2, 15, 10, 2, '2026-02-24 11:46:11.430', '2026-02-24 11:46:11.430'),
(2, 3, 2, 3, 2, 2, 5, 8, 2, 5, '2026-02-24 11:53:47.589', '2026-02-24 11:54:10.631');

-- --------------------------------------------------------

--
-- Table structure for table `_collateraltolead`
--

CREATE TABLE `_collateraltolead` (
  `A` int(11) NOT NULL,
  `B` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `_managercompanies`
--

CREATE TABLE `_managercompanies` (
  `A` int(11) NOT NULL,
  `B` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity`
--
ALTER TABLE `activity`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Activity_name_key` (`name`);

--
-- Indexes for table `activitylog`
--
ALTER TABLE `activitylog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ActivityLog_user_id_created_at_idx` (`user_id`,`created_at`);

--
-- Indexes for table `avatar`
--
ALTER TABLE `avatar`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Avatar_name_key` (`name`);

--
-- Indexes for table `callactivitylog`
--
ALTER TABLE `callactivitylog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `CallActivityLog_user_id_action_date_idx` (`user_id`,`action_date`);

--
-- Indexes for table `calllog`
--
ALTER TABLE `calllog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `CallLog_lead_id_fkey` (`lead_id`),
  ADD KEY `CallLog_user_id_fkey` (`user_id`);

--
-- Indexes for table `callstatus`
--
ALTER TABLE `callstatus`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `CallStatus_name_key` (`name`);

--
-- Indexes for table `calltracker`
--
ALTER TABLE `calltracker`
  ADD PRIMARY KEY (`id`),
  ADD KEY `CallTracker_product_id_fkey` (`product_id`),
  ADD KEY `CallTracker_industry_id_fkey` (`industry_id`),
  ADD KEY `CallTracker_source_of_db_id_fkey` (`source_of_db_id`),
  ADD KEY `CallTracker_email_status_id_fkey` (`email_status_id`),
  ADD KEY `CallTracker_call_status_id_fkey` (`call_status_id`),
  ADD KEY `CallTracker_user_id_fkey` (`user_id`);

--
-- Indexes for table `city`
--
ALTER TABLE `city`
  ADD PRIMARY KEY (`id`),
  ADD KEY `City_state_id_fkey` (`state_id`);

--
-- Indexes for table `collateral`
--
ALTER TABLE `collateral`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Collateral_name_key` (`name`);

--
-- Indexes for table `company`
--
ALTER TABLE `company`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Company_name_key` (`name`);

--
-- Indexes for table `country`
--
ALTER TABLE `country`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Country_name_key` (`name`);

--
-- Indexes for table `department`
--
ALTER TABLE `department`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Department_name_key` (`name`);

--
-- Indexes for table `eitservice`
--
ALTER TABLE `eitservice`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `EitService_name_key` (`name`);

--
-- Indexes for table `emailstatus`
--
ALTER TABLE `emailstatus`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `EmailStatus_name_key` (`name`);

--
-- Indexes for table `followuplog`
--
ALTER TABLE `followuplog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FollowUpLog_lead_id_fkey` (`lead_id`),
  ADD KEY `FollowUpLog_activity_id_fkey` (`activity_id`),
  ADD KEY `FollowUpLog_created_by_id_fkey` (`created_by_id`);

--
-- Indexes for table `imservice`
--
ALTER TABLE `imservice`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ImService_name_key` (`name`);

--
-- Indexes for table `industry`
--
ALTER TABLE `industry`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Industry_name_key` (`name`);

--
-- Indexes for table `jobtitle`
--
ALTER TABLE `jobtitle`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `JobTitle_name_key` (`name`);

--
-- Indexes for table `kraentry`
--
ALTER TABLE `kraentry`
  ADD PRIMARY KEY (`id`),
  ADD KEY `KraEntry_user_id_fkey` (`user_id`);

--
-- Indexes for table `lead`
--
ALTER TABLE `lead`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Lead_call_tracker_id_key` (`call_tracker_id`),
  ADD KEY `Lead_lead_owner_id_fkey` (`lead_owner_id`),
  ADD KEY `Lead_created_by_id_fkey` (`created_by_id`),
  ADD KEY `Lead_company_id_fkey` (`company_id`),
  ADD KEY `Lead_sales_sbu_id_fkey` (`sales_sbu_id`),
  ADD KEY `Lead_job_title_id_fkey` (`job_title_id`),
  ADD KEY `Lead_lead_source_id_fkey` (`lead_source_id`),
  ADD KEY `Lead_industry_id_fkey` (`industry_id`),
  ADD KEY `Lead_country_id_fkey` (`country_id`),
  ADD KEY `Lead_state_id_fkey` (`state_id`),
  ADD KEY `Lead_city_id_fkey` (`city_id`),
  ADD KEY `Lead_product_id_fkey` (`product_id`),
  ADD KEY `Lead_eit_service_id_fkey` (`eit_service_id`),
  ADD KEY `Lead_im_service_id_fkey` (`im_service_id`),
  ADD KEY `Lead_persona_id_fkey` (`persona_id`),
  ADD KEY `Lead_avatar_id_fkey` (`avatar_id`),
  ADD KEY `Lead_where_find_them_id_fkey` (`where_find_them_id`),
  ADD KEY `Lead_follow_up_activity_id_fkey` (`follow_up_activity_id`),
  ADD KEY `Lead_next_activity_id_fkey` (`next_activity_id`),
  ADD KEY `Lead_sales_stage_id_fkey` (`sales_stage_id`);

--
-- Indexes for table `leadcontact`
--
ALTER TABLE `leadcontact`
  ADD PRIMARY KEY (`id`),
  ADD KEY `LeadContact_lead_id_fkey` (`lead_id`),
  ADD KEY `LeadContact_avatar_id_fkey` (`avatar_id`);

--
-- Indexes for table `leaddocument`
--
ALTER TABLE `leaddocument`
  ADD PRIMARY KEY (`id`),
  ADD KEY `LeadDocument_lead_id_fkey` (`lead_id`),
  ADD KEY `LeadDocument_follow_up_log_id_fkey` (`follow_up_log_id`);

--
-- Indexes for table `leadquadranthistory`
--
ALTER TABLE `leadquadranthistory`
  ADD PRIMARY KEY (`id`),
  ADD KEY `LeadQuadrantHistory_user_id_moved_at_idx` (`user_id`,`moved_at`),
  ADD KEY `LeadQuadrantHistory_old_quadrant_new_quadrant_idx` (`old_quadrant`,`new_quadrant`),
  ADD KEY `LeadQuadrantHistory_lead_id_fkey` (`lead_id`);

--
-- Indexes for table `leadscore`
--
ALTER TABLE `leadscore`
  ADD PRIMARY KEY (`id`),
  ADD KEY `LeadScore_lead_id_fkey` (`lead_id`);

--
-- Indexes for table `leadsource`
--
ALTER TABLE `leadsource`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `LeadSource_name_key` (`name`);

--
-- Indexes for table `persona`
--
ALTER TABLE `persona`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Persona_product_id_fkey` (`product_id`);

--
-- Indexes for table `pomodorosession`
--
ALTER TABLE `pomodorosession`
  ADD PRIMARY KEY (`id`),
  ADD KEY `PomodoroSession_user_id_fkey` (`user_id`);

--
-- Indexes for table `pricingnegotiationlog`
--
ALTER TABLE `pricingnegotiationlog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `PricingNegotiationLog_lead_id_fkey` (`lead_id`),
  ADD KEY `PricingNegotiationLog_created_by_fkey` (`created_by`);

--
-- Indexes for table `privilege`
--
ALTER TABLE `privilege`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Privilege_user_id_module_name_key` (`user_id`,`module_name`);

--
-- Indexes for table `product`
--
ALTER TABLE `product`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Product_name_key` (`name`);

--
-- Indexes for table `salesstage`
--
ALTER TABLE `salesstage`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `SalesStage_name_key` (`name`);

--
-- Indexes for table `sbu`
--
ALTER TABLE `sbu`
  ADD PRIMARY KEY (`id`),
  ADD KEY `SBU_company_id_fkey` (`company_id`);

--
-- Indexes for table `sourceofdb`
--
ALTER TABLE `sourceofdb`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `SourceOfDB_name_key` (`name`);

--
-- Indexes for table `state`
--
ALTER TABLE `state`
  ADD PRIMARY KEY (`id`),
  ADD KEY `State_country_id_fkey` (`country_id`);

--
-- Indexes for table `swatkeyclosure`
--
ALTER TABLE `swatkeyclosure`
  ADD PRIMARY KEY (`id`),
  ADD KEY `SwatKeyClosure_swat_performance_id_fkey` (`swat_performance_id`);

--
-- Indexes for table `swatperformance`
--
ALTER TABLE `swatperformance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `SwatPerformance_user_id_date_product_id_key` (`user_id`,`date`,`product_id`),
  ADD KEY `SwatPerformance_product_id_fkey` (`product_id`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `User_email_key` (`email`),
  ADD KEY `User_company_id_fkey` (`company_id`),
  ADD KEY `User_sbu_id_fkey` (`sbu_id`),
  ADD KEY `User_reporting_manager_id_fkey` (`reporting_manager_id`),
  ADD KEY `User_department_id_fkey` (`department_id`);

--
-- Indexes for table `userproducttarget`
--
ALTER TABLE `userproducttarget`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `UserProductTarget_user_id_product_id_key` (`user_id`,`product_id`),
  ADD KEY `UserProductTarget_product_id_fkey` (`product_id`);

--
-- Indexes for table `_collateraltolead`
--
ALTER TABLE `_collateraltolead`
  ADD UNIQUE KEY `_CollateralToLead_AB_unique` (`A`,`B`),
  ADD KEY `_CollateralToLead_B_index` (`B`);

--
-- Indexes for table `_managercompanies`
--
ALTER TABLE `_managercompanies`
  ADD UNIQUE KEY `_ManagerCompanies_AB_unique` (`A`,`B`),
  ADD KEY `_ManagerCompanies_B_index` (`B`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity`
--
ALTER TABLE `activity`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `activitylog`
--
ALTER TABLE `activitylog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `avatar`
--
ALTER TABLE `avatar`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `callactivitylog`
--
ALTER TABLE `callactivitylog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `calllog`
--
ALTER TABLE `calllog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `callstatus`
--
ALTER TABLE `callstatus`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `calltracker`
--
ALTER TABLE `calltracker`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `city`
--
ALTER TABLE `city`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `collateral`
--
ALTER TABLE `collateral`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `company`
--
ALTER TABLE `company`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `country`
--
ALTER TABLE `country`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `department`
--
ALTER TABLE `department`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `eitservice`
--
ALTER TABLE `eitservice`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `emailstatus`
--
ALTER TABLE `emailstatus`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `followuplog`
--
ALTER TABLE `followuplog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `imservice`
--
ALTER TABLE `imservice`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `industry`
--
ALTER TABLE `industry`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `jobtitle`
--
ALTER TABLE `jobtitle`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `kraentry`
--
ALTER TABLE `kraentry`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lead`
--
ALTER TABLE `lead`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `leadcontact`
--
ALTER TABLE `leadcontact`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `leaddocument`
--
ALTER TABLE `leaddocument`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `leadquadranthistory`
--
ALTER TABLE `leadquadranthistory`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `leadscore`
--
ALTER TABLE `leadscore`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `leadsource`
--
ALTER TABLE `leadsource`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `persona`
--
ALTER TABLE `persona`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `pomodorosession`
--
ALTER TABLE `pomodorosession`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pricingnegotiationlog`
--
ALTER TABLE `pricingnegotiationlog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `privilege`
--
ALTER TABLE `privilege`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `product`
--
ALTER TABLE `product`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `salesstage`
--
ALTER TABLE `salesstage`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `sbu`
--
ALTER TABLE `sbu`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `sourceofdb`
--
ALTER TABLE `sourceofdb`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `state`
--
ALTER TABLE `state`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `swatkeyclosure`
--
ALTER TABLE `swatkeyclosure`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `swatperformance`
--
ALTER TABLE `swatperformance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `userproducttarget`
--
ALTER TABLE `userproducttarget`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activitylog`
--
ALTER TABLE `activitylog`
  ADD CONSTRAINT `ActivityLog_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `callactivitylog`
--
ALTER TABLE `callactivitylog`
  ADD CONSTRAINT `CallActivityLog_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `calllog`
--
ALTER TABLE `calllog`
  ADD CONSTRAINT `CallLog_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `CallLog_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `calltracker`
--
ALTER TABLE `calltracker`
  ADD CONSTRAINT `CallTracker_call_status_id_fkey` FOREIGN KEY (`call_status_id`) REFERENCES `callstatus` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `CallTracker_email_status_id_fkey` FOREIGN KEY (`email_status_id`) REFERENCES `emailstatus` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `CallTracker_industry_id_fkey` FOREIGN KEY (`industry_id`) REFERENCES `industry` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `CallTracker_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `CallTracker_source_of_db_id_fkey` FOREIGN KEY (`source_of_db_id`) REFERENCES `sourceofdb` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `CallTracker_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `city`
--
ALTER TABLE `city`
  ADD CONSTRAINT `City_state_id_fkey` FOREIGN KEY (`state_id`) REFERENCES `state` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `followuplog`
--
ALTER TABLE `followuplog`
  ADD CONSTRAINT `FollowUpLog_activity_id_fkey` FOREIGN KEY (`activity_id`) REFERENCES `activity` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `FollowUpLog_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `user` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `FollowUpLog_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `kraentry`
--
ALTER TABLE `kraentry`
  ADD CONSTRAINT `KraEntry_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `lead`
--
ALTER TABLE `lead`
  ADD CONSTRAINT `Lead_avatar_id_fkey` FOREIGN KEY (`avatar_id`) REFERENCES `avatar` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_call_tracker_id_fkey` FOREIGN KEY (`call_tracker_id`) REFERENCES `calltracker` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `city` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `user` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_eit_service_id_fkey` FOREIGN KEY (`eit_service_id`) REFERENCES `eitservice` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_follow_up_activity_id_fkey` FOREIGN KEY (`follow_up_activity_id`) REFERENCES `activity` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_im_service_id_fkey` FOREIGN KEY (`im_service_id`) REFERENCES `imservice` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_industry_id_fkey` FOREIGN KEY (`industry_id`) REFERENCES `industry` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_job_title_id_fkey` FOREIGN KEY (`job_title_id`) REFERENCES `jobtitle` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_lead_owner_id_fkey` FOREIGN KEY (`lead_owner_id`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_lead_source_id_fkey` FOREIGN KEY (`lead_source_id`) REFERENCES `leadsource` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_next_activity_id_fkey` FOREIGN KEY (`next_activity_id`) REFERENCES `activity` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_persona_id_fkey` FOREIGN KEY (`persona_id`) REFERENCES `persona` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_sales_sbu_id_fkey` FOREIGN KEY (`sales_sbu_id`) REFERENCES `sbu` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_sales_stage_id_fkey` FOREIGN KEY (`sales_stage_id`) REFERENCES `salesstage` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_state_id_fkey` FOREIGN KEY (`state_id`) REFERENCES `state` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_where_find_them_id_fkey` FOREIGN KEY (`where_find_them_id`) REFERENCES `leadsource` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `leadcontact`
--
ALTER TABLE `leadcontact`
  ADD CONSTRAINT `LeadContact_avatar_id_fkey` FOREIGN KEY (`avatar_id`) REFERENCES `avatar` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `LeadContact_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `leaddocument`
--
ALTER TABLE `leaddocument`
  ADD CONSTRAINT `LeadDocument_follow_up_log_id_fkey` FOREIGN KEY (`follow_up_log_id`) REFERENCES `followuplog` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `LeadDocument_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `leadquadranthistory`
--
ALTER TABLE `leadquadranthistory`
  ADD CONSTRAINT `LeadQuadrantHistory_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `leadscore`
--
ALTER TABLE `leadscore`
  ADD CONSTRAINT `LeadScore_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `persona`
--
ALTER TABLE `persona`
  ADD CONSTRAINT `Persona_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `pomodorosession`
--
ALTER TABLE `pomodorosession`
  ADD CONSTRAINT `PomodoroSession_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `pricingnegotiationlog`
--
ALTER TABLE `pricingnegotiationlog`
  ADD CONSTRAINT `PricingNegotiationLog_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `PricingNegotiationLog_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `privilege`
--
ALTER TABLE `privilege`
  ADD CONSTRAINT `Privilege_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `sbu`
--
ALTER TABLE `sbu`
  ADD CONSTRAINT `SBU_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `state`
--
ALTER TABLE `state`
  ADD CONSTRAINT `State_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `swatkeyclosure`
--
ALTER TABLE `swatkeyclosure`
  ADD CONSTRAINT `SwatKeyClosure_swat_performance_id_fkey` FOREIGN KEY (`swat_performance_id`) REFERENCES `swatperformance` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `swatperformance`
--
ALTER TABLE `swatperformance`
  ADD CONSTRAINT `SwatPerformance_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `SwatPerformance_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `user`
--
ALTER TABLE `user`
  ADD CONSTRAINT `User_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `User_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `department` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `User_reporting_manager_id_fkey` FOREIGN KEY (`reporting_manager_id`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `User_sbu_id_fkey` FOREIGN KEY (`sbu_id`) REFERENCES `sbu` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `userproducttarget`
--
ALTER TABLE `userproducttarget`
  ADD CONSTRAINT `UserProductTarget_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `UserProductTarget_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `_collateraltolead`
--
ALTER TABLE `_collateraltolead`
  ADD CONSTRAINT `_CollateralToLead_A_fkey` FOREIGN KEY (`A`) REFERENCES `collateral` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `_CollateralToLead_B_fkey` FOREIGN KEY (`B`) REFERENCES `lead` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `_managercompanies`
--
ALTER TABLE `_managercompanies`
  ADD CONSTRAINT `_ManagerCompanies_A_fkey` FOREIGN KEY (`A`) REFERENCES `company` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `_ManagerCompanies_B_fkey` FOREIGN KEY (`B`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
