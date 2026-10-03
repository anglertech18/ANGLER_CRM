-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 02, 2026 at 06:02 AM
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
(2, 'Call', 1),
(3, 'Demo', 1),
(4, 'Meeting', 1),
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
(2, 'Mumbai', 2, 1),
(3, 'Chennai', 3, 1),
(4, 'Coimbatore', 3, 1),
(5, 'Trichy', 3, 1),
(6, 'Kochi', 4, 1);

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

--
-- Dumping data for table `collateral`
--

INSERT INTO `collateral` (`id`, `name`, `url`, `is_active`) VALUES
(1, 'Business Requirement Document', NULL, 1),
(2, 'Scope Document', NULL, 1);

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
(3, 'Angler Technologies', 1),
(4, 'Trinetra', 1),
(5, 'esting', 0),
(6, 'xyz', 0),
(7, 'itech', 0),
(8, 'HiTech', 0),
(9, 'CS tech', 0),
(10, 'JJTech', 0),
(11, 'kovai Technologies', 0),
(12, 'Angler', 0),
(13, 'techno', 0),
(14, 'tt', 0),
(15, 'test', 1),
(16, 'test1', 1),
(17, 'ABC Enterprises', 1),
(18, 'XYZ Enterprises', 1),
(19, 'Carborundum Universal Ltd', 1),
(20, 'V Guard', 1),
(21, 'SA corporate', 1),
(22, 'AD players', 1);

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
(2, 'India', 1),
(3, 'UK', 1),
(4, 'UAE', 1),
(5, 'Singapore', 1);

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
(1, 34, NULL, '2026-01-29 07:27:15.391', NULL, '2026-01-29 07:27:15.479', 1);

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
(1, 'Finance', 1),
(2, 'Technology', 1),
(3, 'Healthcare', 1),
(4, 'Manufacturing', 1),
(5, 'Transport', 1),
(6, 'Fertilizer', 1),
(7, 'Textiles', 1),
(8, 'Government', 1);

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
(1, 'VP Sales', 0),
(2, 'CTO', 1),
(3, 'Admin', 1),
(4, 'Sales Manager', 1),
(5, 'Sales person', 1),
(6, 'BD Manager', 1),
(7, 'IT Manager', 1),
(8, 'Procurement Manager', 1),
(9, 'CEO', 1),
(10, 'DGM', 1),
(11, 'employee', 1),
(12, 'DGM Sales', 1),
(13, 'manager', 1),
(14, 'VP Procurement', 1),
(15, 'VP', 1),
(16, 'Sr. AVP - Systems', 1),
(17, 'Sr. Manger - IT', 1),
(18, 'Consultant', 1);

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
  `order_won_attachment` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `lead`
--

INSERT INTO `lead` (`id`, `created_by_id`, `sales_sbu_id`, `lead_owner_id`, `salutation`, `first_name`, `last_name`, `company_id`, `job_title_id`, `lead_source_id`, `industry_id`, `address`, `country_id`, `state_id`, `city_id`, `pin_code`, `other_info`, `annual_turnover`, `mobile_number`, `whatsapp_number`, `email`, `website`, `product_or_service`, `product_id`, `persona_id`, `where_find_them_id`, `telecalling_qualified`, `device_count`, `employee_count`, `vendor_count`, `branch_unit`, `requirement_desc`, `pain_points`, `pain_points_files`, `demo_completed`, `pilot_provided`, `lead_score`, `budget_yes_no`, `budget_allocated`, `approval_stage`, `authority_yes_no`, `decision_maker`, `need_yes_no`, `pain_points_desc`, `timeline_yes_no`, `expected_closure_date`, `quadrant`, `quadrant_updated_at`, `follow_up_activity_id`, `follow_up_datetime`, `sales_stage_id`, `next_activity_id`, `next_activity_datetime`, `is_farming`, `farming_moved_at`, `created_at`, `updated_at`, `automation_score`, `budget_allocated_score`, `champion_score`, `competition_score`, `compliance_score`, `decision_contact_score`, `decision_maker_score`, `efficiency_score`, `established_need_score`, `influencer_score`, `lead_source_quality`, `reduce_cost_score`, `urgency_score`, `competitor_details`, `opportunities_values`, `order_won_attachment`) VALUES
(5, 4, 4, 2, 'Mr', 'test', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Product', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, NULL, NULL, 0, NULL, 0, NULL, 0, NULL, 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2025-12-05 11:56:27.745', '2025-12-09 11:24:05.946', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL),
(9, 1, 4, 5, 'Ms', 'simsone', 'j', 3, 3, 3, 2, 'covai', 2, 2, 2, NULL, NULL, NULL, '8855223366', NULL, 'simsone@angleritech.com', NULL, 'Service', NULL, NULL, 2, 1, NULL, NULL, NULL, NULL, '/uploads/1765187830910-475634394.pdf', NULL, NULL, 0, 0, 4, 0, NULL, NULL, 0, NULL, 0, NULL, 0, NULL, 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2025-12-08 09:57:10.938', '2025-12-08 09:57:10.938', 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, NULL, NULL, NULL),
(10, 4, 3, 5, 'Mr', 'test', '1', 3, 5, 4, 3, '123', 2, 2, 2, '133454', NULL, NULL, NULL, NULL, 'simsone@angleritech.com', NULL, 'Service', NULL, NULL, 4, 1, '50', '40', '20', 'coimbatore', 'test', 'test', NULL, 0, 1, 5, 0, NULL, NULL, 0, NULL, 0, NULL, 1, '2025-12-15 00:00:00.000', 'Q3', '2026-01-29 09:24:06.425', 2, '2026-01-31 09:23:00.000', 2, 3, '2025-12-15 05:11:00.000', 0, NULL, '2025-12-08 09:57:31.011', '2026-01-29 09:24:06.492', 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 2, 2, 0, NULL, NULL, NULL),
(11, 5, 3, 5, 'Mr', 'test', ' mani', 6, 5, 4, 2, 'ganapathy', 2, 2, 2, '384674', NULL, 500000.000000000000000000000000000000, '0574893465', '3425443543', 'test@gmail.com', 'www.test.com', 'Product', 1, 2, 1, 1, '45', '40', '10', 'Coimbatore', 'abcdefgh', 'xyz', '[\"/uploads/1765273531147-765233436.pdf\"]', 0, 0, 4, 0, NULL, NULL, 0, NULL, 0, NULL, 1, '2025-12-18 00:00:00.000', 'Q1', NULL, 2, NULL, 2, 2, NULL, 0, NULL, '2025-12-09 09:45:31.169', '2025-12-15 05:58:55.332', 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, NULL, NULL, NULL),
(14, 3, 3, 3, NULL, 'UpdatedName', 'Reproduction', 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 2, 1, NULL, NULL, 1, NULL, 1, NULL, 1, NULL, 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2025-12-15 09:11:16.893', '2025-12-15 10:04:57.499', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, NULL, NULL, NULL),
(16, 3, 3, 3, NULL, 'TestLeadFixed', 'Verification', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'fixed.repro@example.com', NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 1, NULL, NULL, 1, NULL, 1, NULL, 1, NULL, 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2025-12-15 09:44:49.516', '2025-12-15 09:44:49.516', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL),
(17, 3, 3, 3, NULL, 'TestLeadColl', 'Verification', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'coll.repro@example.com', NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 1, NULL, NULL, 1, NULL, 1, NULL, 1, NULL, 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2025-12-15 09:58:43.952', '2025-12-15 09:58:43.952', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL),
(18, 4, 3, 5, 'Mr', 'aswath', 'k', 7, 7, 3, 2, '2nd street,sungam', 2, 3, 4, '475678', NULL, 24998.000000000000000000000000000000, '8357894657', NULL, 'itech@gmail.com', 'www.itech.com', 'Product', 1, 2, 2, 1, '35', '23', '20', 'coimbatore', 'Need vendora portal', 'ijk', '[\"/uploads/1765795648371-147547962.pdf\"]', 1, 0, 14, 1, '20000', NULL, 0, NULL, 1, 'Need PO and RFQ module', 1, '2025-12-19 00:00:00.000', 'Q1', '2025-12-17 05:52:53.029', 3, '2025-12-22 15:48:00.000', 2, 1, '2025-12-17 15:48:00.000', 0, NULL, '2025-12-15 10:00:51.965', '2025-12-17 05:52:53.032', 2, 2, 2, 0, 0, 1, 1, 1, 2, 0, 1, 2, 0, NULL, NULL, NULL),
(19, 4, 3, 5, 'Mr', 'sivakumar', 'p', 8, 6, 2, 2, '123,Gandhipuram', 2, 3, 4, '645324', NULL, 250000.000000000000000000000000000000, '8634578846', NULL, 'siva@gmail.com', 'hitech.com', 'Product', 2, 1, 2, 1, '34', NULL, NULL, NULL, NULL, NULL, '[\"/uploads/1765948081293-316562262.pdf\"]', 1, 0, 23, 1, '50000', NULL, 1, 'developer', 1, 'need enquiry', 0, NULL, 'Q2', '2025-12-18 09:33:11.847', 1, '2025-12-19 12:37:00.000', 2, 1, '2025-12-25 12:37:00.000', 0, NULL, '2025-12-17 05:08:01.331', '2025-12-18 09:33:11.850', 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 1, 2, 1, NULL, NULL, NULL),
(20, 3, 4, 5, 'Mr', 'Mamatha', 'm', 9, 9, 1, 2, '24/hopes  coimbatore', 2, 3, 4, '641001', 'test', 100000.000000000000000000000000000000, '9597623492', '9597623492', 'boopathi.r@angleritech.com', 'cstech.com', 'Product', 1, 2, 1, 1, '10', '50', '50', NULL, 'test', '100 point', NULL, 1, 1, 19, 0, NULL, NULL, 1, 'softeware developer', 1, 'thank you ', 0, NULL, 'Q2', NULL, 2, '2025-12-16 23:54:00.000', 4, 3, '2025-12-16 23:54:00.000', 0, NULL, '2025-12-17 05:24:41.469', '2025-12-17 05:25:27.102', 2, 1, 2, 1, 1, 1, 2, 2, 2, 1, 1, 2, 1, NULL, NULL, NULL),
(21, 4, 3, 5, 'Ms', 'akalya', 'j', 10, 6, 3, 2, '123,RS Puram', 2, 3, 3, '645324', NULL, 2500000.000000000000000000000000000000, '8634578846', NULL, 'siva@gmail.com', 'JJTech.com', 'Product', 3, 3, 2, 1, '20', NULL, NULL, NULL, NULL, NULL, NULL, 1, 0, 12, 1, '75000', NULL, 1, 'Employee', 1, 'urgently Needed', 0, NULL, 'Q3', '2025-12-17 06:10:45.736', 2, '2025-12-25 00:39:00.000', 3, 4, '2025-12-26 00:39:00.000', 0, NULL, '2025-12-17 06:10:05.881', '2025-12-17 06:10:45.739', 2, 0, 1, 2, 2, 0, 0, 0, 2, 0, 1, 2, 0, NULL, NULL, NULL),
(22, 5, 3, 6, 'Mr', 'Karthi', 'L', 11, 9, 2, 2, '24, saravanampatti.', 2, 3, 4, '641005', NULL, 2000000.000000000000000000000000000000, '9834789843', '8484849393', 'kovai@tech.com', 'www.kovaitech.com', 'Service', NULL, NULL, 2, 1, '120', NULL, NULL, NULL, 'Need Time Check Software', 'Urgently Needed', '[\"/uploads/1765963253899-274668734.pdf\"]', 1, 0, 12, 1, '1000000', NULL, 1, 'CEO', 1, 'Urgently Needed the Time Check Software', 0, NULL, 'Q3', NULL, 1, NULL, 4, 1, NULL, 0, NULL, '2025-12-17 09:20:53.990', '2025-12-17 09:20:53.990', 0, 0, 1, 0, 2, 0, 2, 1, 2, 0, 1, 2, 1, NULL, NULL, NULL),
(23, 1, 3, 1, 'Mr', 'KK', 'RK', 12, 10, 4, 2, 'Test Coimbatore', 2, 3, 3, '641045', NULL, 45100000.000000000000000000000000000000, '3126549870', '1236549870', 'test@gmail.com', 'Angleritech.com', 'Product', 1, NULL, NULL, 1, NULL, NULL, '500', NULL, 'Vendor Mgmt System', 'PO and RFQ', NULL, 0, 0, 10, 0, NULL, NULL, 0, NULL, 1, 'PO and RFQ', 0, NULL, 'Q1', NULL, 2, '2025-12-26 05:30:00.000', 4, 1, NULL, 0, NULL, '2025-12-17 10:14:07.381', '2025-12-17 10:14:07.381', 2, 0, 1, 1, 1, 1, 0, 2, 0, 0, 1, 1, 0, NULL, NULL, NULL),
(24, 4, 3, 5, 'Mr', 'kumar', 'p', 7, 7, 2, 3, '123,Gandhipuram', 2, 3, 3, '645324', 'enquiry', 2000000.000000000000000000000000000000, '8634578846', NULL, 'siva@gmail.com', 'hitech.com', 'Product', 1, 2, 2, 1, '50', NULL, NULL, NULL, NULL, NULL, NULL, 0, 1, 2, 0, NULL, NULL, 0, NULL, 0, NULL, 0, NULL, 'Q1', NULL, 3, '2025-12-25 10:06:00.000', 2, 2, '2025-12-25 10:06:00.000', 0, NULL, '2025-12-22 10:07:02.311', '2025-12-22 10:07:02.311', 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL),
(25, 4, 5, 5, 'Mr', 'Raja', 'J', 10, 13, 2, 6, '123,RS Puram', 2, 3, 5, '645324', NULL, 40000000.000000000000000000000000000000, '8634578846', NULL, 'siva@gmail.com', 'hitech.com', 'Product', 3, 3, 2, 1, '90', NULL, NULL, NULL, NULL, NULL, NULL, 1, 1, 10, 0, NULL, NULL, 0, NULL, 0, NULL, 0, NULL, 'Q1', '2025-12-23 11:30:55.955', 4, '2026-01-30 23:03:00.000', 2, 2, '2025-12-25 23:03:00.000', 0, NULL, '2025-12-23 10:03:32.887', '2026-01-29 08:45:36.659', 0, 2, 0, 0, 0, 0, 2, 0, 2, 0, 2, 0, 2, NULL, NULL, NULL),
(26, 4, 7, 5, 'Mr', 'Bala', 'R', 7, 13, 2, 2, '123,Gandhipuram', 2, 3, 3, '645324', NULL, 6000000.000000000000000000000000000000, '8634578846', NULL, 'siva@gmail.com', NULL, 'Product', 2, 1, 2, 0, NULL, '40', NULL, NULL, 'Need QMS', NULL, NULL, 1, 1, 0, 0, NULL, NULL, 0, NULL, 0, NULL, 0, NULL, 'Q1', NULL, 2, '2025-12-25 11:13:00.000', 2, 2, '2025-12-26 11:13:00.000', 0, NULL, '2025-12-23 11:14:56.034', '2025-12-23 11:14:56.034', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL),
(27, 10, 7, 11, 'Mr', 'Hari', 'Ragavan', 17, 14, 4, 3, '1234, MG Road', 2, 4, NULL, '654987', NULL, 10000000.000000000000000000000000000000, '3216549870', '3216549870', 'test@gmail.com', NULL, 'Product', 1, NULL, 1, 1, NULL, NULL, '500', NULL, 'VMS', 'PO and RFQ', NULL, 1, 0, 18, 1, '1000000', NULL, 0, NULL, 1, 'PO and RFQ', 0, NULL, 'Q3', '2025-12-25 10:12:16.374', 2, '2026-01-08 04:30:00.000', NULL, NULL, NULL, 0, NULL, '2025-12-23 11:28:56.959', '2025-12-25 10:12:16.394', 1, 1, 2, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, NULL, NULL, NULL),
(28, 10, 6, 9, NULL, 'akalya', 'j', 10, 7, 2, 3, '123,RS Puram', 2, 3, 3, '645324', NULL, 899999.000000000000000000000000000000, '8634578846', NULL, 'siva@gmail.com', NULL, 'Product', 2, 1, 2, 1, '45', NULL, NULL, NULL, 'need', NULL, NULL, 1, 1, 0, 0, NULL, NULL, 0, NULL, 0, NULL, 0, NULL, 'Q1', NULL, 2, '2026-01-30 10:06:00.000', 3, 2, '2025-12-25 06:01:00.000', 0, NULL, '2025-12-23 11:33:16.463', '2026-01-29 10:06:25.257', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL),
(29, 10, 5, 9, NULL, 'test23', 'k', 7, 13, 1, 1, '2nd street,sungam', 2, 3, 4, '475678', NULL, 600000.000000000000000000000000000000, '8357894657', NULL, 'itech@gmail.com', 'jt.com', 'Product', 2, 1, 2, 1, NULL, NULL, NULL, NULL, 'ttest', NULL, NULL, 1, 0, 0, 0, NULL, NULL, 0, NULL, 0, NULL, 0, NULL, 'Q1', NULL, 2, '2025-12-25 11:44:00.000', 2, 2, '2025-12-25 11:43:00.000', 0, NULL, '2025-12-23 11:46:22.341', '2025-12-23 11:46:22.341', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL),
(30, 1, 5, 10, 'Mr', 'Ragavan', 'G', 17, 15, 3, 2, 'Test 12345', 2, 3, 3, '600001', NULL, 100000000.000000000000000000000000000000, '9876543210', '9876543210', 'test@gmail.com', NULL, 'Product', 1, 5, 1, 1, NULL, NULL, '500', NULL, 'VMS', 'PO & RFQ', NULL, 0, 0, 12, 0, NULL, NULL, 0, NULL, 0, NULL, 0, NULL, 'Q2', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2025-12-23 11:57:44.856', '2025-12-23 11:57:44.856', 1, 1, 1, 2, 0, 1, 0, 1, 1, 1, 1, 1, 1, NULL, NULL, NULL),
(31, 1, 5, 10, 'Mr', 'Sabapathy', 'Krishnan', 18, 15, 1, 7, '1234, Steet', 2, 4, 6, '654980', NULL, 10000000.000000000000000000000000000000, '9876543210', '9876543210', 'test@gmail.com', NULL, 'Product', 2, 1, 4, 1, NULL, NULL, NULL, '8', 'Audit portal', 'Internal Audit tracking', NULL, 0, 0, 13, 1, '1200000', 'CEO', 0, NULL, 0, NULL, 1, '2026-03-31 00:00:00.000', 'Q2', NULL, 4, '2026-01-30 23:30:00.000', 3, 1, '2026-01-13 17:31:00.000', 0, NULL, '2025-12-24 10:30:05.152', '2026-01-29 07:30:42.202', 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, NULL, NULL, NULL),
(32, 10, 5, 10, 'Mr', 'Alagappan', NULL, 19, 16, 2, 4, 'Parry house', 2, 3, 3, '600001', NULL, 200000000.000000000000000000000000000000, NULL, NULL, 'alagappanp@cumi.murugappa.com', NULL, 'Product', 1, 2, 1, 1, NULL, '600', '400', '5 ', 'Vendor portal for Automation purpose', 'Managing huge paper works and delay in approvals.', NULL, 1, 0, 26, 1, NULL, NULL, 1, NULL, 0, NULL, 0, NULL, 'Q4', '2025-12-25 06:53:10.263', NULL, NULL, NULL, NULL, NULL, 0, NULL, '2025-12-25 06:07:40.232', '2026-01-29 10:38:52.982', 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, NULL, NULL, NULL),
(33, 11, 7, 10, 'Mr', 'Vishay', 'Kumar', 22, 9, 1, 2, '78, Petter Street\nDowntown', 1, 1, 1, '641000', NULL, 56000000.000000000000000000000000000000, '1236549870', '1236549870', NULL, NULL, 'Product', 3, 3, 1, 1, NULL, '1000', NULL, NULL, NULL, NULL, NULL, 0, 0, 17, 0, NULL, NULL, 0, NULL, 0, NULL, 0, NULL, 'Q2', '2026-01-29 12:32:11.008', NULL, NULL, 1, 1, NULL, 0, NULL, '2025-12-25 10:16:29.123', '2026-01-31 06:12:32.463', 2, 1, 1, 1, 1, 2, 0, 2, 1, 1, 2, 1, 2, NULL, NULL, NULL),
(34, 1, NULL, NULL, NULL, 'Test', 'Lead', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, NULL, NULL, 0, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, '2026-01-29 07:27:15.391', NULL, NULL, NULL, 0, NULL, '2026-01-29 07:27:15.399', '2026-01-29 07:27:15.399', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL);

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

--
-- Dumping data for table `leadcontact`
--

INSERT INTO `leadcontact` (`id`, `lead_id`, `name`, `designation`, `email`, `contact_mobile`, `whatsapp`) VALUES
(3, 11, 'test test', 'tester', 'test@gmail.com', '4957895472', '8947589784'),
(4, 14, 'Contact One', 'Manager', 'c1@example.com', '1234567890', ''),
(15, 32, 'Guna', 'DGM - Systems', 'gunasekaranm@cumi.murugappa.com', '', ''),
(16, 32, '', '', '', '', '');

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
(1, 11, 'CRM_Scope_Doc_V1.0.pdf', '/uploads/1765273531700-832426072.pdf', 'Uploaded via Lead Form', '2025-12-09 09:45:31.732', NULL),
(2, 10, 'CRM Scope.pdf', '/uploads/1765358695615-209831821.pdf', 'Uploaded via Lead Form', '2025-12-10 09:24:55.640', NULL),
(3, 10, 'CRM_Scope_Doc_V1.0.pdf', '/uploads/1765358696229-826774012.pdf', 'Uploaded via Lead Form', '2025-12-10 09:24:56.250', NULL),
(4, 10, 'CRM Scope.pdf', '/uploads/1765360913565-948830376.pdf', 'Uploaded via Lead Form', '2025-12-10 10:01:53.569', NULL),
(5, 18, 'CRM_Scope_Doc_old.docx', '/uploads/1765792852163-426739809.docx', 'Uploaded via Lead Form', '2025-12-15 10:00:52.290', NULL),
(6, 18, 'Revised_CRM_Scope_V1.0.pdf', '/uploads/1765792852698-847421840.pdf', 'Uploaded via Lead Form', '2025-12-15 10:00:52.794', NULL),
(7, 18, 'CRM Scope.pdf', '/uploads/1765799384131-735082342.pdf', 'Uploaded via UI', '2025-12-15 11:49:44.161', NULL),
(8, 19, 'CRM_Scope_Doc_old.docx', '/uploads/1765948081616-993587735.docx', 'Uploaded via Lead Form', '2025-12-17 05:08:01.786', NULL),
(9, 19, 'CRM_Scope_Doc_V1.1.docx', '/uploads/1765948081825-110286439.docx', 'Uploaded via Lead Form', '2025-12-17 05:08:01.943', NULL),
(10, 22, 'CRM Scope.pdf', '/uploads/1765963254310-615659230.pdf', 'Uploaded via Lead Form', '2025-12-17 09:20:54.319', NULL),
(11, 22, 'CRM_Scope_Doc_V1.0.docx', '/uploads/1765963254384-149397253.docx', 'Uploaded via Lead Form', '2025-12-17 09:20:54.415', NULL),
(12, 24, 'CRM_Scope_Doc_V1.0.pdf', '/uploads/1766398022493-15630909.pdf', 'Uploaded via Lead Form', '2025-12-22 10:07:02.558', NULL);

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

--
-- Dumping data for table `leadscore`
--

INSERT INTO `leadscore` (`id`, `lead_id`, `score`, `breakdown`, `updated_by`, `updated_at`) VALUES
(4, 18, 14, '{\"reduce_cost_score\":2,\"efficiency_score\":1,\"automation_score\":2,\"compliance_score\":0,\"established_need_score\":2,\"urgency_score\":0,\"budget_allocated_score\":2,\"decision_maker_score\":1,\"competition_score\":0,\"champion_score\":2,\"influencer_score\":0,\"lead_source_quality\":1,\"decision_contact_score\":1}', 1, '2025-12-16 05:21:58.405'),
(5, 19, 22, '{\"reduce_cost_score\":2,\"efficiency_score\":1,\"automation_score\":2,\"compliance_score\":2,\"established_need_score\":2,\"urgency_score\":1,\"budget_allocated_score\":2,\"decision_maker_score\":2,\"competition_score\":2,\"champion_score\":2,\"influencer_score\":2,\"lead_source_quality\":1,\"decision_contact_score\":1}', 4, '2025-12-17 05:09:10.649'),
(6, 19, 23, '{\"reduce_cost_score\":2,\"efficiency_score\":1,\"automation_score\":2,\"compliance_score\":2,\"established_need_score\":2,\"urgency_score\":1,\"budget_allocated_score\":2,\"decision_maker_score\":2,\"competition_score\":2,\"champion_score\":2,\"influencer_score\":2,\"lead_source_quality\":1,\"decision_contact_score\":2}', 4, '2025-12-17 05:10:14.409'),
(7, 25, 10, '{\"reduce_cost_score\":0,\"efficiency_score\":0,\"automation_score\":0,\"compliance_score\":0,\"established_need_score\":2,\"urgency_score\":2,\"budget_allocated_score\":2,\"decision_maker_score\":2,\"competition_score\":0,\"champion_score\":0,\"influencer_score\":0,\"lead_source_quality\":2,\"decision_contact_score\":0}', 10, '2025-12-23 11:31:14.919'),
(8, 32, 26, '{\"reduce_cost_score\":2,\"efficiency_score\":2,\"automation_score\":2,\"compliance_score\":2,\"established_need_score\":2,\"urgency_score\":2,\"budget_allocated_score\":2,\"decision_maker_score\":2,\"competition_score\":2,\"champion_score\":2,\"influencer_score\":2,\"lead_source_quality\":2,\"decision_contact_score\":2}', 10, '2025-12-25 06:51:38.141'),
(9, 33, 17, '{\"reduce_cost_score\":1,\"efficiency_score\":2,\"automation_score\":2,\"compliance_score\":1,\"established_need_score\":1,\"urgency_score\":2,\"budget_allocated_score\":1,\"decision_maker_score\":0,\"competition_score\":1,\"champion_score\":1,\"influencer_score\":1,\"lead_source_quality\":2,\"decision_contact_score\":2}', 1, '2026-01-31 06:12:32.652');

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
(1, 'LinkedIn', 1),
(2, 'Referral', 1),
(3, 'Cold Call', 1),
(4, 'Website', 1),
(5, 'Meta', 1);

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
(1, 'Decision Maker', 2, 1),
(2, 'Influencer', 1, 1),
(3, 'Time Management', 3, 1),
(4, 'Procurement Manager', 1, 1),
(5, 'VP Procurement', 1, 1),
(6, 'IT Head/Manager', 1, 1);

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
(1, 11, '2025-12-09 09:45:31.795', 'abcd', 5),
(2, 10, '2025-12-10 10:01:53.678', 'test', 4),
(3, 18, '2025-12-15 10:00:52.941', 'Enquiry', 4),
(4, 19, '2025-12-17 05:08:02.001', 'enquiry', 4),
(5, 20, '2025-12-17 05:24:41.833', 'enquiry', 3),
(6, 21, '2025-12-17 06:10:05.980', 'Pilot  needed', 4),
(7, 22, '2025-12-17 09:20:54.454', 'We want Demo', 5),
(8, 25, '2025-12-23 10:03:33.100', 'enquiry', 4),
(9, 26, '2025-12-23 11:14:56.169', 'Enquiry', 4),
(10, 29, '2025-12-23 11:46:22.420', 'negotiation', 10);

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
(18, 3, 'Dashboard', 1, 1, 0, 1),
(19, 4, 'Masters', 0, 0, 0, 0),
(20, 4, 'UserMaster', 0, 0, 0, 0),
(21, 4, 'PrivilegeMaster', 0, 0, 0, 0),
(22, 4, 'Leads', 1, 1, 1, 1),
(23, 4, 'Reports', 0, 0, 0, 0),
(24, 5, 'Masters', 0, 0, 0, 0),
(25, 5, 'UserMaster', 0, 0, 0, 0),
(26, 5, 'PrivilegeMaster', 0, 0, 0, 0),
(27, 5, 'Leads', 1, 1, 1, 1),
(28, 5, 'Reports', 0, 0, 0, 0),
(29, 1, 'UserMaster', 0, 0, 0, 0),
(30, 1, 'PrivilegeMaster', 0, 0, 0, 0),
(31, 6, 'Masters', 1, 1, 1, 1),
(32, 6, 'UserMaster', 0, 0, 0, 0),
(33, 6, 'PrivilegeMaster', 0, 0, 0, 0),
(34, 6, 'Leads', 1, 1, 0, 1),
(35, 6, 'Reports', 1, 1, 1, 1),
(36, 10, 'Masters', 1, 1, 0, 1),
(37, 10, 'UserMaster', 1, 1, 0, 1),
(38, 10, 'PrivilegeMaster', 0, 0, 0, 0),
(39, 10, 'Leads', 1, 1, 0, 1),
(40, 10, 'Reports', 1, 1, 0, 1),
(41, 11, 'Masters', 1, 1, 0, 1),
(42, 11, 'UserMaster', 0, 0, 0, 0),
(43, 11, 'PrivilegeMaster', 0, 0, 0, 0),
(44, 11, 'Leads', 1, 1, 0, 1),
(45, 11, 'Reports', 1, 1, 0, 1),
(46, 9, 'Masters', 1, 1, 0, 1),
(47, 9, 'UserMaster', 1, 1, 0, 1),
(48, 9, 'PrivilegeMaster', 1, 1, 0, 1),
(49, 9, 'Leads', 1, 1, 0, 1),
(50, 9, 'Reports', 1, 1, 0, 1);

-- --------------------------------------------------------

--
-- Table structure for table `product`
--

CREATE TABLE `product` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `product`
--

INSERT INTO `product` (`id`, `name`, `is_active`) VALUES
(1, 'Vendora', 1),
(2, 'Aura', 1),
(3, 'Time Check', 1),
(4, 'SNSF FFS', 1),
(5, 'Trinetra iWay', 1),
(6, 'Trinetra IoT', 1),
(7, 'Fleet Management Software', 1),
(8, 'SNSF WMS', 1);

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
(10, 18, 'Q2', 'Q3', 4, 'Manual update from leads list', '2025-12-17 05:48:24.437'),
(11, 18, 'Q3', 'Q2', 4, 'Manual update from leads list', '2025-12-17 05:48:32.108'),
(12, 10, 'Q1', 'Q3', 4, 'Manual update from leads list', '2025-12-17 05:48:38.107'),
(13, 18, 'Q2', 'Q3', 4, 'Manual update from leads list', '2025-12-17 05:48:41.801'),
(14, 19, 'Q4', 'Q2', 4, 'Manual update from leads list', '2025-12-17 05:48:46.226'),
(15, 10, 'Q3', 'Q2', 4, 'Manual update from leads list', '2025-12-17 05:48:49.362'),
(16, 18, 'Q3', 'Q2', 4, 'Manual update from leads list', '2025-12-17 05:48:54.103'),
(17, 10, 'Q2', 'Q3', 4, 'Manual update from leads list', '2025-12-17 05:48:58.304'),
(18, 10, 'Q3', 'Q2', 4, 'Manual update from leads list', '2025-12-17 05:49:10.386'),
(19, 18, 'Q2', 'Q3', 4, 'Manual update from leads list', '2025-12-17 05:49:16.528'),
(20, 18, 'Q3', 'Q2', 4, 'Manual update from leads list', '2025-12-17 05:52:25.207'),
(21, 10, 'Q2', 'Q3', 4, 'Manual update from leads list', '2025-12-17 05:52:29.549'),
(22, 19, 'Q2', 'Q3', 4, 'Manual update from leads list', '2025-12-17 05:52:48.358'),
(23, 18, 'Q2', 'Q1', 4, 'Manual update from leads list', '2025-12-17 05:52:52.922'),
(24, 19, 'Q3', 'Q1', 4, 'Manual update from leads list', '2025-12-17 05:55:05.412'),
(25, 19, 'Q1', 'Q4', 4, 'Manual update from leads list', '2025-12-17 05:55:19.122'),
(26, 21, 'Q3', 'Q2', 4, 'Manual update from leads list', '2025-12-17 06:10:41.937'),
(27, 21, 'Q2', 'Q3', 4, 'Manual update from leads list', '2025-12-17 06:10:45.713'),
(28, 19, 'Q4', 'Q3', 4, 'Manual update from leads list', '2025-12-17 06:35:26.897'),
(29, 19, 'Q3', 'Q3', 4, 'Manual override by user', '2025-12-18 09:33:01.187'),
(30, 19, 'Q3', 'Q2', 4, 'Manual update from leads list', '2025-12-18 09:33:11.807'),
(31, 25, 'Q1', 'Nurturing', 10, 'Manual update from leads list', '2025-12-23 11:30:55.911'),
(32, 32, 'Q2', 'Order Won', 10, 'Manual update from leads list', '2025-12-25 06:51:19.368'),
(33, 32, 'Q4', 'Order Won', 10, 'Manual update from leads list', '2025-12-25 06:51:43.847'),
(34, 32, 'Order Won', 'Nurturing', 10, 'Manual update from leads list', '2025-12-25 06:53:06.989'),
(35, 32, 'Nurturing', 'Order Won', 10, 'Manual update from leads list', '2025-12-25 06:53:10.203'),
(36, 27, 'Q2', 'Q3', 11, 'Manual update from leads list', '2025-12-25 10:11:35.954'),
(37, 27, 'Q3', 'Q3', 11, 'Manual override by user', '2025-12-25 10:12:16.344'),
(38, 10, 'Q3', 'Q3', 1, 'Manual override by user', '2026-01-29 09:24:06.326'),
(39, 33, 'Q2', 'Q3', 1, 'Manual update from leads list', '2026-01-29 11:08:35.195'),
(40, 33, 'Q3', 'Q2', 1, 'Manual update from leads list', '2026-01-29 11:08:41.091'),
(41, 33, 'Q2', 'Q3', 1, 'Manual update from leads list', '2026-01-29 11:08:45.863'),
(42, 33, 'Q3', 'Q2', 1, 'Manual update from leads list', '2026-01-29 12:32:10.941');

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
(1, 'Order Won', 1),
(2, 'Negotiation', 1),
(3, 'Prospecting', 1),
(4, 'Qualification', 1),
(5, 'Proposal', 1);

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
(3, 'South Region', 3, 0),
(4, 'North Region', 4, 0),
(5, 'Chennai BD SBU', 3, 1),
(6, 'Chennai BD SBU', 4, 1),
(7, 'Offshore BD SBU', 3, 1),
(8, 'Coimbatore BD SBU', 3, 1),
(9, 'Admin SBU', 3, 1);

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
(2, 'Maharashtra', 2, 1),
(3, 'Tamil Nadu', 2, 1),
(4, 'Kerala', 2, 1),
(5, 'Andra Pradesh', 2, 1),
(6, 'UP', 2, 1);

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
(1, 'ceo@crm.com', '$2b$10$D6KBFp0Ajk3tkrLhMbpsi.7vyucnViUNwvnFIZbeV8pJrWNTkMQfa', 'John', 'CEO', 'CEO', 1, NULL, NULL, NULL, NULL, NULL, '2025-11-28 09:22:12.081', '2025-12-04 09:25:07.257'),
(2, 'manager1@crm.com', '$2b$10$D6KBFp0Ajk3tkrLhMbpsi.7vyucnViUNwvnFIZbeV8pJrWNTkMQfa', 'Manager', 'One', 'SalesManager', 0, NULL, NULL, 1, NULL, NULL, '2025-11-28 09:22:12.265', '2025-12-11 11:29:12.426'),
(3, 'sales1@crm.com', '$2b$10$D6KBFp0Ajk3tkrLhMbpsi.7vyucnViUNwvnFIZbeV8pJrWNTkMQfa', 'Boopathi', '', 'SalesPerson', 1, 3, 3, 6, NULL, NULL, '2025-11-28 09:22:12.277', '2025-12-17 05:16:42.328'),
(4, 'simsone@angleritech.com', '$2b$10$FnjLgww9BQZQ4mrKBxGFiO3ETHmLvJue7ub4xkC8l/mXXrQZ9pVkS', 'simsone', 'j', 'SalesPerson', 1, 3, NULL, 5, '5c4336a1926c63681b0824dcc29660d3b1830a96219949923f36e83814ca25fc', '2025-12-16 06:44:35.389', '2025-12-04 09:14:40.230', '2025-12-16 05:44:35.389'),
(5, 'manikandan.d@angleritech.com', '$2b$10$G/Nbs2e1XBsifrqzbBFbe.u559mewoaZknCkWrb1psOgKHz4m7n0i', 'Manikandan', 'D', 'SalesManager', 1, 3, 3, 1, NULL, NULL, '2025-12-04 09:16:36.797', '2025-12-11 11:29:59.049'),
(6, 'cto@crm.com', '$2b$10$5JWWT5VvCnT2IEM4L0R//.q3DC.6dwyvSUXsZinNBA674vy8cKzCy', 'CTO', '', 'CEO', 1, 3, NULL, NULL, NULL, NULL, '2025-12-15 11:52:18.045', '2025-12-15 11:52:47.246'),
(7, 'boopathi@angleritech.com', '$2b$10$NJPf1.alVVD8jltqmeHIt.REEvprGCzmPSL9ImNnNJq8TMgrfbu0u', 'Boopathi', 'R', 'SalesPerson', 0, NULL, 3, 5, 'c57736feabec1cd73225083fc67a464cbc133bdad1ff2025f700756aadfed069', '2025-12-21 06:02:01.702', '2025-12-20 06:02:01.703', '2025-12-20 06:05:10.834'),
(8, 'balaji@angleritech.com', '$2y$10$fh287gwbq5.ajR2zmZl/ZO8qBTNWCqstCD1yzRcsln2E7KJKXNB/u', 'Balaji', 'C', 'SalesManager', 0, NULL, 4, NULL, '57f83b40f165a5ab1f9829c7f8e3125accf1f1624e2cc05a3f439329e70419eb', '2025-12-20 08:00:46.565', '2025-12-20 06:07:28.374', '2025-12-20 07:00:46.566'),
(9, 'jayanthra@angleritech.com', '$2b$10$fq4.g8BppIagleaHWOzfb.dYeii/RRHP3ATx1P23InOUnAndPfBje', 'Jayanthra', 'Jayachandran', 'CEO', 1, 3, 9, 6, 'f94e0cd96dff4ea528231413f4d84420ffe907dd94afae54c5bbba9b4638fe1f', '2025-12-23 11:37:57.447', '2025-12-22 11:37:57.448', '2025-12-22 11:37:57.448'),
(10, 'selvam@angleritech.com', '$2b$10$WXCZR6QWF4fel4.UireVcOulcCqy8szl6VX/tVxq/X1wX7/flUfTG', 'Selvam', 'M', 'SalesManager', 1, 3, 5, 9, '3215f4e40a52b9735bfb522f53aa3acc02375cfe0963c926042f70671f12a774', '2025-12-23 11:39:02.044', '2025-12-22 11:39:02.047', '2025-12-22 12:06:55.026'),
(11, 'asha@angleritech.com', '$2b$10$WXCZR6QWF4fel4.UireVcOulcCqy8szl6VX/tVxq/X1wX7/flUfTG', 'Asha', '', 'SalesManager', 1, 3, 7, 10, '60593d9f97a7022161bf221c994b8289d3a538dff170693f36ce090254b92556', '2025-12-23 11:40:20.617', '2025-12-22 11:40:20.622', '2025-12-22 12:06:55.242'),
(13, 'chidambarabalaji@angleritech.com', '$2b$10$fFsKk9RxsYVm2IKY9gOanO19AWnIxT0gYP3M2CSlFFYw1BJXYd55W', 'balaji', 'C', 'SalesPerson', 0, NULL, 6, 8, 'c6043eb4bab46a9a7ea6468bed1f4742c9d6e7c4859957de0248913143f0c135', '2025-12-24 06:04:58.377', '2025-12-23 06:04:58.378', '2025-12-23 06:04:58.378'),
(20, 'boopathi.r@angleritech.com', '$2b$10$ukTxCcnDVtRimPGu51tX3eMgJlOWC8mGTcq4A8TLCKwd1CYW/oJa6', 'Boopathi', 'R', 'SalesPerson', 1, NULL, 6, 8, NULL, NULL, '2025-12-27 11:19:07.978', '2025-12-27 11:24:12.724');

-- --------------------------------------------------------

--
-- Table structure for table `_collateraltolead`
--

CREATE TABLE `_collateraltolead` (
  `A` int(11) NOT NULL,
  `B` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `_collateraltolead`
--

INSERT INTO `_collateraltolead` (`A`, `B`) VALUES
(1, 10),
(1, 11),
(1, 20),
(1, 23),
(1, 25),
(1, 26),
(1, 27),
(1, 29),
(1, 30),
(1, 31),
(1, 33),
(2, 14),
(2, 17),
(2, 18),
(2, 19),
(2, 21),
(2, 22),
(2, 24),
(2, 28);

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
('1bd80624-fc72-47b8-96ac-09a89b31a526', '890b0c819f9031c616881f0df7a79842fcff8ba2aa844b4d2eaa56148123e86d', '2025-11-28 09:21:16.982', '20251126124220_add_lead_qualification_scoring', NULL, NULL, '2025-11-28 09:21:16.569', 1),
('aaeb5b68-1a62-4628-8d5d-4381dafe9b21', '536e5ebe6fe3d4c6694a5a407a988b51076423b8ecfd4a1c73da22bef6017b33', '2025-11-28 09:21:16.480', '20251126113815_add_pricing_and_relations', NULL, NULL, '2025-11-28 09:21:12.095', 1),
('d1fc2563-98ea-4999-b6b8-8f7cf7f10ee5', '200efc71a62bed78cfe96dcf673bf7204d7711fef0fa6148a090acd0f4bae3c9', '2025-11-28 09:21:12.002', '20251126053014_init', NULL, NULL, '2025-11-28 09:20:06.884', 1);

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
  ADD KEY `Lead_sales_sbu_id_fkey` (`sales_sbu_id`);

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
  ADD KEY `User_reporting_manager_id_idx` (`reporting_manager_id`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `collateral`
--
ALTER TABLE `collateral`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `company`
--
ALTER TABLE `company`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `country`
--
ALTER TABLE `country`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `followuplog`
--
ALTER TABLE `followuplog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `industry`
--
ALTER TABLE `industry`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `jobtitle`
--
ALTER TABLE `jobtitle`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `kraentry`
--
ALTER TABLE `kraentry`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lead`
--
ALTER TABLE `lead`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `leadcontact`
--
ALTER TABLE `leadcontact`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `leaddocument`
--
ALTER TABLE `leaddocument`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `leadscore`
--
ALTER TABLE `leadscore`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `leadsource`
--
ALTER TABLE `leadsource`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `persona`
--
ALTER TABLE `persona`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `pomodorosession`
--
ALTER TABLE `pomodorosession`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pricingnegotiationlog`
--
ALTER TABLE `pricingnegotiationlog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `privilege`
--
ALTER TABLE `privilege`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

--
-- AUTO_INCREMENT for table `product`
--
ALTER TABLE `product`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `quadranthistory`
--
ALTER TABLE `quadranthistory`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT for table `salesstage`
--
ALTER TABLE `salesstage`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `sbu`
--
ALTER TABLE `sbu`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `state`
--
ALTER TABLE `state`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

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
