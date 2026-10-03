-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 02, 2026 at 05:49 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
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
  `name` varchar(191) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `activity`
--

INSERT INTO `activity` (`id`, `name`, `is_active`) VALUES
(1, 'Follow-up', 1),
(2, 'Demo', 1),
(3, 'Meeting', 1),
(4, 'Call', 1),
(5, 'Email', 1);

-- --------------------------------------------------------

--
-- Table structure for table `activitylog`
--

CREATE TABLE `activitylog` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` varchar(191) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  `outcome` varchar(191) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `recording_url` varchar(191) DEFAULT NULL,
  `bant_snapshot` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `city`
--

CREATE TABLE `city` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `state_id` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
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
  `name` varchar(191) NOT NULL,
  `url` varchar(191) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `company`
--

CREATE TABLE `company` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `company`
--

INSERT INTO `company` (`id`, `name`, `is_active`) VALUES
(1, 'Global Solutions Ltd', 1),
(2, 'TechCorp Industries', 1);

-- --------------------------------------------------------

--
-- Table structure for table `country`
--

CREATE TABLE `country` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `country`
--

INSERT INTO `country` (`id`, `name`, `is_active`) VALUES
(1, 'USA', 1),
(2, 'India', 1);

-- --------------------------------------------------------

--
-- Table structure for table `followuplog`
--

CREATE TABLE `followuplog` (
  `id` int(11) NOT NULL,
  `lead_id` int(11) NOT NULL,
  `activity_id` int(11) DEFAULT NULL,
  `date` datetime(3) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `created_by_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `followuplog`
--

INSERT INTO `followuplog` (`id`, `lead_id`, `activity_id`, `date`, `notes`, `created_at`, `created_by_id`) VALUES
(1, 4, 2, '2026-02-06 12:00:00.000', 'ttt', '2026-01-31 12:00:26.053', 1),
(2, 4, 4, '2026-02-20 06:30:00.000', 'ttt', '2026-01-31 12:12:26.818', 1),
(3, 4, 4, '2026-02-20 01:00:00.000', 'ttt', '2026-01-31 12:13:50.206', 1),
(4, 4, 3, '2026-02-19 19:30:00.000', 'ttt', '2026-01-31 12:14:17.296', 1),
(5, 4, 2, '2026-02-19 14:00:00.000', 'ttt', '2026-02-02 04:29:27.805', 1);

-- --------------------------------------------------------

--
-- Table structure for table `industry`
--

CREATE TABLE `industry` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
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
  `name` varchar(191) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `jobtitle`
--

INSERT INTO `jobtitle` (`id`, `name`, `is_active`) VALUES
(1, 'Sales Manager', 1),
(2, 'VP Sales', 1),
(3, 'CEO', 1),
(4, 'CTO', 1),
(5, 'IT Manager', 1),
(6, 'Sr. AVP - Systems', 1);

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
  `notes` varchar(191) DEFAULT NULL
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
  `salutation` enum('Mr','Mrs','Ms','Dr') DEFAULT NULL,
  `first_name` varchar(191) DEFAULT NULL,
  `last_name` varchar(191) DEFAULT NULL,
  `company_id` int(11) DEFAULT NULL,
  `job_title_id` int(11) DEFAULT NULL,
  `lead_source_id` int(11) DEFAULT NULL,
  `industry_id` int(11) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `country_id` int(11) DEFAULT NULL,
  `state_id` int(11) DEFAULT NULL,
  `city_id` int(11) DEFAULT NULL,
  `pin_code` varchar(191) DEFAULT NULL,
  `other_info` text DEFAULT NULL,
  `annual_turnover` decimal(65,30) DEFAULT NULL,
  `mobile_number` varchar(191) DEFAULT NULL,
  `whatsapp_number` varchar(191) DEFAULT NULL,
  `email` varchar(191) DEFAULT NULL,
  `website` varchar(191) DEFAULT NULL,
  `product_or_service` varchar(191) DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `persona_id` int(11) DEFAULT NULL,
  `where_find_them_id` int(11) DEFAULT NULL,
  `telecalling_qualified` tinyint(1) NOT NULL DEFAULT 0,
  `device_count` varchar(191) DEFAULT NULL,
  `employee_count` varchar(191) DEFAULT NULL,
  `vendor_count` varchar(191) DEFAULT NULL,
  `branch_unit` varchar(191) DEFAULT NULL,
  `requirement_desc` text DEFAULT NULL,
  `pain_points` text DEFAULT NULL,
  `pain_points_files` text DEFAULT NULL,
  `demo_completed` tinyint(1) NOT NULL DEFAULT 0,
  `pilot_provided` tinyint(1) NOT NULL DEFAULT 0,
  `lead_score` int(11) NOT NULL DEFAULT 0,
  `budget_yes_no` tinyint(1) NOT NULL DEFAULT 0,
  `budget_allocated` varchar(191) DEFAULT NULL,
  `approval_stage` varchar(191) DEFAULT NULL,
  `authority_yes_no` tinyint(1) NOT NULL DEFAULT 0,
  `decision_maker` varchar(191) DEFAULT NULL,
  `need_yes_no` tinyint(1) NOT NULL DEFAULT 0,
  `pain_points_desc` text DEFAULT NULL,
  `timeline_yes_no` tinyint(1) NOT NULL DEFAULT 0,
  `expected_closure_date` datetime(3) DEFAULT NULL,
  `quadrant` varchar(191) DEFAULT NULL,
  `quadrant_updated_at` datetime(3) DEFAULT NULL,
  `follow_up_activity_id` int(11) DEFAULT NULL,
  `follow_up_datetime` datetime(3) DEFAULT NULL,
  `sales_stage_id` int(11) DEFAULT NULL,
  `next_activity_id` int(11) DEFAULT NULL,
  `next_activity_datetime` datetime(3) DEFAULT NULL,
  `is_farming` tinyint(1) NOT NULL DEFAULT 0,
  `farming_moved_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `automation_score` int(11) NOT NULL DEFAULT 0,
  `budget_allocated_score` int(11) NOT NULL DEFAULT 0,
  `champion_score` int(11) NOT NULL DEFAULT 0,
  `competition_score` int(11) NOT NULL DEFAULT 0,
  `compliance_score` int(11) NOT NULL DEFAULT 0,
  `decision_contact_score` int(11) NOT NULL DEFAULT 0,
  `decision_maker_score` int(11) NOT NULL DEFAULT 0,
  `efficiency_score` int(11) NOT NULL DEFAULT 0,
  `established_need_score` int(11) NOT NULL DEFAULT 0,
  `influencer_score` int(11) NOT NULL DEFAULT 0,
  `lead_source_quality` int(11) NOT NULL DEFAULT 0,
  `reduce_cost_score` int(11) NOT NULL DEFAULT 0,
  `urgency_score` int(11) NOT NULL DEFAULT 0,
  `competitor_details` text DEFAULT NULL,
  `opportunities_values` text DEFAULT NULL,
  `order_won_attachment` varchar(191) DEFAULT NULL,
  `service_id` int(11) DEFAULT NULL,
  `custom_count_type` varchar(191) DEFAULT NULL,
  `license_count` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `lead`
--

INSERT INTO `lead` (`id`, `created_by_id`, `sales_sbu_id`, `lead_owner_id`, `salutation`, `first_name`, `last_name`, `company_id`, `job_title_id`, `lead_source_id`, `industry_id`, `address`, `country_id`, `state_id`, `city_id`, `pin_code`, `other_info`, `annual_turnover`, `mobile_number`, `whatsapp_number`, `email`, `website`, `product_or_service`, `product_id`, `persona_id`, `where_find_them_id`, `telecalling_qualified`, `device_count`, `employee_count`, `vendor_count`, `branch_unit`, `requirement_desc`, `pain_points`, `pain_points_files`, `demo_completed`, `pilot_provided`, `lead_score`, `budget_yes_no`, `budget_allocated`, `approval_stage`, `authority_yes_no`, `decision_maker`, `need_yes_no`, `pain_points_desc`, `timeline_yes_no`, `expected_closure_date`, `quadrant`, `quadrant_updated_at`, `follow_up_activity_id`, `follow_up_datetime`, `sales_stage_id`, `next_activity_id`, `next_activity_datetime`, `is_farming`, `farming_moved_at`, `created_at`, `updated_at`, `automation_score`, `budget_allocated_score`, `champion_score`, `competition_score`, `compliance_score`, `decision_contact_score`, `decision_maker_score`, `efficiency_score`, `established_need_score`, `influencer_score`, `lead_source_quality`, `reduce_cost_score`, `urgency_score`, `competitor_details`, `opportunities_values`, `order_won_attachment`, `service_id`, `custom_count_type`, `license_count`) VALUES
(1, 3, 1, 3, 'Mr', 'Michael', 'Chen', 2, 4, 1, 1, '123 Tech Street, Suite 100', 1, 1, 1, '94102', NULL, 5000000.000000000000000000000000000000, '9876543210', '9876543210', 'michael.chen@techcorp.com', 'www.techcorp.com', 'Product', 1, 1, 1, 1, '100', '250', NULL, NULL, 'Looking for CRM Software to manage sales pipeline', 'Critical: Manual processes causing delays', NULL, 1, 1, 95, 1, '$75,000', 'Board Approved', 1, 'Michael Chen - CTO', 1, 'Urgent need for sales automation. Current system outdated, losing deals', 1, '2026-03-02 09:33:44.280', 'Q1', NULL, 3, NULL, 1, 2, NULL, 0, NULL, '2026-01-31 09:33:44.285', '2026-01-31 09:33:44.285', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL),
(2, 2, 1, 2, 'Ms', 'Sarah', 'Williams', 1, 2, 2, 3, '456 Finance Ave', 2, 2, 2, '400001', NULL, 3000000.000000000000000000000000000000, '9876543211', NULL, 'sarah.williams@globalsolutions.com', 'www.globalsolutions.com', 'Service', 2, 2, 2, 1, '50', '150', NULL, NULL, 'Exploring ERP options for finance automation', 'Need better reporting capabilities', NULL, 0, 0, 45, 0, NULL, NULL, 1, 'Sarah Williams - VP Sales', 1, 'Looking to improve efficiency', 1, '2026-05-01 09:33:44.493', 'Q2', NULL, 4, NULL, 4, 5, NULL, 0, NULL, '2026-01-31 09:33:44.496', '2026-01-31 09:33:44.496', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL),
(3, 3, 1, 3, 'Mr', 'David', 'Johnson', 2, 5, 3, 2, '789 Health Plaza', 1, 1, 1, '94103', NULL, 1000000.000000000000000000000000000000, '9876543212', NULL, 'david.johnson@healthcorp.com', NULL, 'Product', 1, 2, 3, 0, '10', '50', NULL, NULL, 'Initial inquiry about CRM', 'Exploring options', NULL, 0, 0, 15, 0, NULL, NULL, 0, NULL, 0, NULL, 0, NULL, 'Q4', NULL, 4, NULL, 5, 4, NULL, 0, NULL, '2026-01-31 09:33:44.598', '2026-01-31 09:33:44.598', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL),
(4, 1, 1, 1, 'Mr', 'test', NULL, 1, 3, 2, 3, '456 Finance Ave', 2, 2, 2, '400001', NULL, 3000000.000000000000000000000000000000, '9876543211', NULL, 'sarah.williams@globalsolutions.com', 'www.globalsolutions.com', 'Product', 1, 1, 1, 1, NULL, NULL, NULL, NULL, 'tt', 'tt', '[\"/uploads/1769860825703-912239156\"]', 1, 0, 2, 0, NULL, NULL, 0, NULL, 0, NULL, 1, '2026-01-29 00:00:00.000', 'Order Won', '2026-02-02 04:29:27.460', 2, '2026-02-19 14:00:00.000', 2, 1, '2026-02-06 03:00:00.000', 0, NULL, '2026-01-31 12:00:25.912', '2026-02-02 04:29:27.548', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 'tt', 'tt', '/uploads/1769861630104-810815854', NULL, NULL, '5');

-- --------------------------------------------------------

--
-- Table structure for table `leadcontact`
--

CREATE TABLE `leadcontact` (
  `id` int(11) NOT NULL,
  `lead_id` int(11) NOT NULL,
  `name` varchar(191) DEFAULT NULL,
  `designation` varchar(191) DEFAULT NULL,
  `email` varchar(191) DEFAULT NULL,
  `contact_mobile` varchar(191) DEFAULT NULL,
  `whatsapp` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `leaddocument`
--

CREATE TABLE `leaddocument` (
  `id` int(11) NOT NULL,
  `lead_id` int(11) NOT NULL,
  `name` varchar(191) DEFAULT NULL,
  `url` varchar(191) DEFAULT NULL,
  `description` varchar(191) DEFAULT NULL,
  `uploaded_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `follow_up_log_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `leaddocument`
--

INSERT INTO `leaddocument` (`id`, `lead_id`, `name`, `url`, `description`, `uploaded_at`, `follow_up_log_id`) VALUES
(1, 4, 'package-lock.json', '/uploads/1769860826160-489963167.json', 'Uploaded via Lead Form', '2026-01-31 12:00:26.256', 1);

-- --------------------------------------------------------

--
-- Table structure for table `leadscore`
--

CREATE TABLE `leadscore` (
  `id` int(11) NOT NULL,
  `lead_id` int(11) NOT NULL,
  `score` int(11) NOT NULL,
  `breakdown` text DEFAULT NULL,
  `updated_by` int(11) NOT NULL,
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `leadsource`
--

CREATE TABLE `leadsource` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `leadsource`
--

INSERT INTO `leadsource` (`id`, `name`, `is_active`) VALUES
(1, 'Website', 1),
(2, 'LinkedIn', 1),
(3, 'Cold Call', 1),
(4, 'Referral', 1);

-- --------------------------------------------------------

--
-- Table structure for table `persona`
--

CREATE TABLE `persona` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `product_id` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `persona`
--

INSERT INTO `persona` (`id`, `name`, `product_id`, `is_active`) VALUES
(1, 'Decision Maker', 1, 1),
(2, 'Influencer', 2, 1);

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
  `date` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `details` text DEFAULT NULL,
  `created_by` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pricingnegotiationlog`
--

INSERT INTO `pricingnegotiationlog` (`id`, `lead_id`, `date`, `details`, `created_by`) VALUES
(1, 4, '2026-01-31 12:00:26.324', 'tttttt', 1);

-- --------------------------------------------------------

--
-- Table structure for table `privilege`
--

CREATE TABLE `privilege` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `module_name` varchar(191) NOT NULL,
  `can_add` tinyint(1) NOT NULL DEFAULT 0,
  `can_edit` tinyint(1) NOT NULL DEFAULT 0,
  `can_delete` tinyint(1) NOT NULL DEFAULT 0,
  `can_view` tinyint(1) NOT NULL DEFAULT 0
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
(18, 3, 'Dashboard', 1, 1, 0, 1);

-- --------------------------------------------------------

--
-- Table structure for table `product`
--

CREATE TABLE `product` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `count_type` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `product`
--

INSERT INTO `product` (`id`, `name`, `is_active`, `count_type`) VALUES
(1, 'CRM Software', 1, 'product count'),
(2, 'ERP System', 0, 'resource count'),
(3, 'Time Check', 1, 'employee count');

-- --------------------------------------------------------

--
-- Table structure for table `quadranthistory`
--

CREATE TABLE `quadranthistory` (
  `id` int(11) NOT NULL,
  `lead_id` int(11) NOT NULL,
  `old_quadrant` varchar(191) DEFAULT NULL,
  `new_quadrant` varchar(191) DEFAULT NULL,
  `changed_by` int(11) DEFAULT NULL,
  `reason` varchar(191) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `quadranthistory`
--

INSERT INTO `quadranthistory` (`id`, `lead_id`, `old_quadrant`, `new_quadrant`, `changed_by`, `reason`, `created_at`) VALUES
(1, 4, 'Q1', 'Q2', 1, 'Manual update from leads list', '2026-01-31 12:09:26.260'),
(2, 4, 'Q2', 'Q2', 1, 'Manual override by user', '2026-01-31 12:12:26.606'),
(3, 4, 'Q1', 'Q2', 1, 'Manual update from leads list', '2026-01-31 12:13:57.965'),
(4, 4, 'Q2', 'Order Won', 1, 'Manual override by user', '2026-01-31 12:14:17.082'),
(5, 4, 'Order Won', 'Order Won', 1, 'Manual override by user', '2026-02-02 04:29:27.390');

-- --------------------------------------------------------

--
-- Table structure for table `salesstage`
--

CREATE TABLE `salesstage` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `salesstage`
--

INSERT INTO `salesstage` (`id`, `name`, `is_active`) VALUES
(1, 'Proposal', 1),
(2, 'Order Won', 1),
(3, 'Negotiation', 1),
(4, 'Qualification', 1),
(5, 'Prospecting', 1);

-- --------------------------------------------------------

--
-- Table structure for table `sbu`
--

CREATE TABLE `sbu` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `company_id` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sbu`
--

INSERT INTO `sbu` (`id`, `name`, `company_id`, `is_active`) VALUES
(1, 'North Region', 2, 1),
(2, 'South Region', 2, 1);

-- --------------------------------------------------------

--
-- Table structure for table `service`
--

CREATE TABLE `service` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `count_type` varchar(191) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `service`
--

INSERT INTO `service` (`id`, `name`, `count_type`, `is_active`) VALUES
(1, 'CRM Software', 'Source count', 1);

-- --------------------------------------------------------

--
-- Table structure for table `state`
--

CREATE TABLE `state` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `country_id` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `state`
--

INSERT INTO `state` (`id`, `name`, `country_id`, `is_active`) VALUES
(1, 'California', 1, 1),
(2, 'Maharashtra', 2, 1);

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `id` int(11) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password_hash` varchar(191) NOT NULL,
  `first_name` varchar(191) NOT NULL,
  `last_name` varchar(191) DEFAULT NULL,
  `role` enum('CEO','SalesManager','SalesPerson','Marketing') NOT NULL DEFAULT 'SalesPerson',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `company_id` int(11) DEFAULT NULL,
  `sbu_id` int(11) DEFAULT NULL,
  `reporting_manager_id` int(11) DEFAULT NULL,
  `reset_token` varchar(191) DEFAULT NULL,
  `reset_token_expiry` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`id`, `email`, `password_hash`, `first_name`, `last_name`, `role`, `is_active`, `company_id`, `sbu_id`, `reporting_manager_id`, `reset_token`, `reset_token_expiry`, `created_at`, `updated_at`) VALUES
(1, 'ceo@crm.com', '$2b$10$aXnbNJFxAjs6RAnnIvEkveB0PKXwY38xZZH3o6cd.IWCEiEth5GgG', 'John', 'CEO', 'CEO', 1, 2, NULL, NULL, NULL, NULL, '2026-01-31 09:33:42.999', '2026-01-31 09:33:42.999'),
(2, 'manager1@crm.com', '$2b$10$aXnbNJFxAjs6RAnnIvEkveB0PKXwY38xZZH3o6cd.IWCEiEth5GgG', 'Manager', 'One', 'SalesManager', 1, 2, 1, 1, NULL, NULL, '2026-01-31 09:33:43.417', '2026-01-31 09:33:43.417'),
(3, 'sales1@crm.com', '$2b$10$aXnbNJFxAjs6RAnnIvEkveB0PKXwY38xZZH3o6cd.IWCEiEth5GgG', 'Sales', 'Person One', 'SalesPerson', 1, 2, 1, 2, NULL, NULL, '2026-01-31 09:33:43.484', '2026-01-31 09:33:43.484');

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
-- Table structure for table `_prisma_migrations`
--

CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) NOT NULL,
  `checksum` varchar(64) NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) NOT NULL,
  `logs` text DEFAULT NULL,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `applied_steps_count` int(10) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `_prisma_migrations`
--

INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `logs`, `rolled_back_at`, `started_at`, `applied_steps_count`) VALUES
('03ed689f-5611-444a-ac59-eaec155b7e4e', '9253f555b63ce065f276bd40ea2148c4ad2ec81788a3e6f6f3a9b17c95237464', '2026-01-31 09:32:20.377', '20251126124220_add_lead_qualification_scoring', NULL, NULL, '2026-01-31 09:32:20.231', 1),
('45969f4e-6665-4002-bcfc-390b8c1e762a', '129375717a3bc3ae1bb7315cd930cf0a8601c61c3d32f6e4c60ab3b8afd86972', '2026-01-31 10:12:04.541', '20260131101202_add_service_to_lead', NULL, NULL, '2026-01-31 10:12:02.570', 1),
('5d474e12-a041-46a6-8f5b-0a0da247c5e4', '8bf18a95e6c228d8e6acba64100ed8db018bff6cdc554f1ecb705b5d07ea64e8', '2026-01-31 09:48:45.799', '20260131094845_add_service_master', NULL, NULL, '2026-01-31 09:48:45.225', 1),
('6c2a8435-bbc8-4795-a0e4-3537151c8067', '63de216edd29945f78dcf168fa05fa7bc6e434c77fcd1eb1f86a790981fbf72f', '2026-01-31 11:34:48.856', '20260131113448_add_license_count_and_custom_count_type', NULL, NULL, '2026-01-31 11:34:48.308', 1),
('88b8d4d8-86f4-4253-bf7f-0ac217dfbae2', 'f88339e31afd0e6b8a8bdd57c7cc5d6576d46d854dd28b336c6bba24ac83a122', '2026-01-31 09:32:20.210', '20251126113815_add_pricing_and_relations', NULL, NULL, '2026-01-31 09:32:16.445', 1),
('af87a58c-b9ba-4cfa-9a9d-ee77462b4cae', 'd3c0be8e907295d1deb6268a373c9ca4b4bc7934ab874117caa6676a1b810a78', '2026-01-31 09:32:16.310', '20251126053014_init', NULL, NULL, '2026-01-31 09:31:38.780', 1),
('d8357230-bdb3-4a8e-bdf0-97980b453bf4', '941817a41eb46283d285203fcd667dda68ff4ebe06a7111d02779a00d5da1c01', '2026-01-31 09:33:22.578', '20260131093311_add_product_count_type', NULL, NULL, '2026-01-31 09:33:11.429', 1);

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
  ADD KEY `ActivityLog_user_id_fkey` (`user_id`);

--
-- Indexes for table `calllog`
--
ALTER TABLE `calllog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `CallLog_lead_id_fkey` (`lead_id`),
  ADD KEY `CallLog_user_id_fkey` (`user_id`);

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
-- Indexes for table `followuplog`
--
ALTER TABLE `followuplog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FollowUpLog_lead_id_fkey` (`lead_id`),
  ADD KEY `FollowUpLog_activity_id_fkey` (`activity_id`),
  ADD KEY `FollowUpLog_created_by_id_fkey` (`created_by_id`);

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
  ADD KEY `Lead_lead_owner_id_fkey` (`lead_owner_id`),
  ADD KEY `Lead_company_id_fkey` (`company_id`),
  ADD KEY `Lead_job_title_id_fkey` (`job_title_id`),
  ADD KEY `Lead_lead_source_id_fkey` (`lead_source_id`),
  ADD KEY `Lead_industry_id_fkey` (`industry_id`),
  ADD KEY `Lead_country_id_fkey` (`country_id`),
  ADD KEY `Lead_state_id_fkey` (`state_id`),
  ADD KEY `Lead_city_id_fkey` (`city_id`),
  ADD KEY `Lead_product_id_fkey` (`product_id`),
  ADD KEY `Lead_persona_id_fkey` (`persona_id`),
  ADD KEY `Lead_follow_up_activity_id_fkey` (`follow_up_activity_id`),
  ADD KEY `Lead_next_activity_id_fkey` (`next_activity_id`),
  ADD KEY `Lead_sales_stage_id_fkey` (`sales_stage_id`),
  ADD KEY `Lead_created_by_id_fkey` (`created_by_id`),
  ADD KEY `Lead_where_find_them_id_fkey` (`where_find_them_id`),
  ADD KEY `Lead_sales_sbu_id_fkey` (`sales_sbu_id`),
  ADD KEY `Lead_service_id_fkey` (`service_id`);

--
-- Indexes for table `leadcontact`
--
ALTER TABLE `leadcontact`
  ADD PRIMARY KEY (`id`),
  ADD KEY `LeadContact_lead_id_fkey` (`lead_id`);

--
-- Indexes for table `leaddocument`
--
ALTER TABLE `leaddocument`
  ADD PRIMARY KEY (`id`),
  ADD KEY `LeadDocument_lead_id_fkey` (`lead_id`),
  ADD KEY `LeadDocument_follow_up_log_id_fkey` (`follow_up_log_id`);

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
-- Indexes for table `quadranthistory`
--
ALTER TABLE `quadranthistory`
  ADD PRIMARY KEY (`id`),
  ADD KEY `QuadrantHistory_lead_id_fkey` (`lead_id`);

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
-- Indexes for table `service`
--
ALTER TABLE `service`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Service_name_key` (`name`);

--
-- Indexes for table `state`
--
ALTER TABLE `state`
  ADD PRIMARY KEY (`id`),
  ADD KEY `State_country_id_fkey` (`country_id`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `User_email_key` (`email`),
  ADD KEY `User_company_id_fkey` (`company_id`),
  ADD KEY `User_sbu_id_fkey` (`sbu_id`),
  ADD KEY `User_reporting_manager_id_fkey` (`reporting_manager_id`);

--
-- Indexes for table `_collateraltolead`
--
ALTER TABLE `_collateraltolead`
  ADD UNIQUE KEY `_CollateralToLead_AB_unique` (`A`,`B`),
  ADD KEY `_CollateralToLead_B_index` (`B`);

--
-- Indexes for table `_prisma_migrations`
--
ALTER TABLE `_prisma_migrations`
  ADD PRIMARY KEY (`id`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `calllog`
--
ALTER TABLE `calllog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

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
-- AUTO_INCREMENT for table `followuplog`
--
ALTER TABLE `followuplog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `industry`
--
ALTER TABLE `industry`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `jobtitle`
--
ALTER TABLE `jobtitle`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `kraentry`
--
ALTER TABLE `kraentry`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lead`
--
ALTER TABLE `lead`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `leadcontact`
--
ALTER TABLE `leadcontact`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `leaddocument`
--
ALTER TABLE `leaddocument`
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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `privilege`
--
ALTER TABLE `privilege`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `product`
--
ALTER TABLE `product`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `quadranthistory`
--
ALTER TABLE `quadranthistory`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `salesstage`
--
ALTER TABLE `salesstage`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `sbu`
--
ALTER TABLE `sbu`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `service`
--
ALTER TABLE `service`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `state`
--
ALTER TABLE `state`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activitylog`
--
ALTER TABLE `activitylog`
  ADD CONSTRAINT `ActivityLog_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `calllog`
--
ALTER TABLE `calllog`
  ADD CONSTRAINT `CallLog_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `CallLog_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON UPDATE CASCADE;

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
  ADD CONSTRAINT `Lead_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `city` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `user` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_follow_up_activity_id_fkey` FOREIGN KEY (`follow_up_activity_id`) REFERENCES `activity` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_industry_id_fkey` FOREIGN KEY (`industry_id`) REFERENCES `industry` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_job_title_id_fkey` FOREIGN KEY (`job_title_id`) REFERENCES `jobtitle` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_lead_owner_id_fkey` FOREIGN KEY (`lead_owner_id`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_lead_source_id_fkey` FOREIGN KEY (`lead_source_id`) REFERENCES `leadsource` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_next_activity_id_fkey` FOREIGN KEY (`next_activity_id`) REFERENCES `activity` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_persona_id_fkey` FOREIGN KEY (`persona_id`) REFERENCES `persona` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_sales_sbu_id_fkey` FOREIGN KEY (`sales_sbu_id`) REFERENCES `sbu` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_sales_stage_id_fkey` FOREIGN KEY (`sales_stage_id`) REFERENCES `salesstage` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `service` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_state_id_fkey` FOREIGN KEY (`state_id`) REFERENCES `state` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Lead_where_find_them_id_fkey` FOREIGN KEY (`where_find_them_id`) REFERENCES `leadsource` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `leadcontact`
--
ALTER TABLE `leadcontact`
  ADD CONSTRAINT `LeadContact_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `leaddocument`
--
ALTER TABLE `leaddocument`
  ADD CONSTRAINT `LeadDocument_follow_up_log_id_fkey` FOREIGN KEY (`follow_up_log_id`) REFERENCES `followuplog` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `LeadDocument_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead` (`id`) ON UPDATE CASCADE;

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
-- Constraints for table `quadranthistory`
--
ALTER TABLE `quadranthistory`
  ADD CONSTRAINT `QuadrantHistory_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead` (`id`) ON UPDATE CASCADE;

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
-- Constraints for table `user`
--
ALTER TABLE `user`
  ADD CONSTRAINT `User_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `User_reporting_manager_id_fkey` FOREIGN KEY (`reporting_manager_id`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `User_sbu_id_fkey` FOREIGN KEY (`sbu_id`) REFERENCES `sbu` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `_collateraltolead`
--
ALTER TABLE `_collateraltolead`
  ADD CONSTRAINT `_CollateralToLead_A_fkey` FOREIGN KEY (`A`) REFERENCES `collateral` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `_CollateralToLead_B_fkey` FOREIGN KEY (`B`) REFERENCES `lead` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
