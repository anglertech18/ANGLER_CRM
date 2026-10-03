-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Mar 24, 2026 at 10:49 AM
-- Server version: 10.11.14-MariaDB-0ubuntu0.24.04.1
-- PHP Version: 8.3.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `angler_crm`
--

-- --------------------------------------------------------

--
-- Table structure for table `Activity`
--

CREATE TABLE `Activity` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Activity`
--

INSERT INTO `Activity` (`id`, `name`, `is_active`) VALUES
(1, 'Visit', 1),
(2, 'Online Meeting', 1),
(3, 'Telecall Follow Up', 1),
(4, 'Mail', 1),
(5, 'Follow-up', 0);

-- --------------------------------------------------------

--
-- Table structure for table `ActivityLog`
--

CREATE TABLE `ActivityLog` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'Sent',
  `notes` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ActivityLog`
--

INSERT INTO `ActivityLog` (`id`, `user_id`, `type`, `status`, `notes`, `created_at`) VALUES
(1, 3, 'LinkedIn Sent', 'Sent', NULL, '2026-02-24 00:00:00.000'),
(2, 2, 'LinkedIn Sent', 'Sent', NULL, '2026-03-05 00:00:00.000'),
(3, 2, 'LinkedIn Sent', 'Sent', NULL, '2026-03-05 00:00:00.000'),
(4, 2, 'LinkedIn Sent', 'Sent', NULL, '2026-03-05 00:00:00.000'),
(5, 5, 'LinkedIn Sent', 'Sent', NULL, '2026-03-06 00:00:00.000'),
(6, 5, 'LinkedIn Sent', 'Sent', NULL, '2026-03-12 00:00:00.000'),
(7, 5, 'LinkedIn Sent', 'Sent', NULL, '2026-03-12 00:00:00.000'),
(8, 5, 'LinkedIn Sent', 'Sent', NULL, '2026-03-19 00:00:00.000');

-- --------------------------------------------------------

--
-- Table structure for table `Avatar`
--

CREATE TABLE `Avatar` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Avatar`
--

INSERT INTO `Avatar` (`id`, `name`, `is_active`) VALUES
(1, 'Decision Maker', 1),
(2, 'Influencer', 1),
(3, 'Blocker', 1);

-- --------------------------------------------------------

--
-- Table structure for table `CallActivityLog`
--

CREATE TABLE `CallActivityLog` (
  `id` int(11) NOT NULL,
  `call_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action_type` enum('CREATE','UPDATE') NOT NULL,
  `action_date` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `CallActivityLog`
--

INSERT INTO `CallActivityLog` (`id`, `call_id`, `user_id`, `action_type`, `action_date`, `created_at`) VALUES
(1, 1, 3, 'CREATE', '2026-02-23 18:30:00.000', '2026-02-24 11:49:10.562'),
(2, 1, 3, 'UPDATE', '2026-02-24 00:00:00.000', '2026-02-24 11:49:40.663'),
(3, 2, 2, 'CREATE', '2026-03-05 00:00:00.000', '2026-03-05 09:29:44.460'),
(4, 2, 2, 'UPDATE', '2026-03-05 00:00:00.000', '2026-03-05 09:31:15.679'),
(5, 2, 2, 'UPDATE', '2026-03-05 00:00:00.000', '2026-03-05 09:32:11.798'),
(6, 2, 2, 'UPDATE', '2026-03-05 00:00:00.000', '2026-03-05 09:32:27.138'),
(7, 3, 2, 'CREATE', '2026-03-05 00:00:00.000', '2026-03-05 10:03:09.043'),
(8, 2, 2, 'UPDATE', '2026-03-05 00:00:00.000', '2026-03-05 10:03:19.150'),
(9, 2, 2, 'UPDATE', '2026-03-05 00:00:00.000', '2026-03-05 10:04:06.761'),
(10, 3, 1, 'UPDATE', '2026-03-05 00:00:00.000', '2026-03-05 10:34:32.102'),
(11, 3, 1, 'UPDATE', '2026-03-05 00:00:00.000', '2026-03-05 10:34:50.570'),
(12, 4, 2, 'CREATE', '2026-03-04 18:30:00.000', '2026-03-05 11:52:05.372'),
(13, 5, 5, 'CREATE', '2026-03-06 00:00:00.000', '2026-03-06 10:27:59.834'),
(14, 5, 5, 'UPDATE', '2026-03-06 00:00:00.000', '2026-03-06 10:28:18.395'),
(15, 6, 7, 'CREATE', '2026-03-06 00:00:00.000', '2026-03-06 11:02:59.469'),
(16, 7, 5, 'CREATE', '2026-03-12 00:00:00.000', '2026-03-12 06:03:17.391'),
(17, 8, 1, 'CREATE', '2026-03-12 00:00:00.000', '2026-03-12 12:33:22.313'),
(18, 9, 1, 'CREATE', '2026-03-12 00:00:00.000', '2026-03-12 12:34:47.426'),
(19, 10, 5, 'CREATE', '2026-03-12 00:00:00.000', '2026-03-12 12:45:52.591'),
(20, 1, 5, 'CREATE', '2026-03-19 00:00:00.000', '2026-03-19 12:12:16.777'),
(21, 1, 5, 'UPDATE', '2026-03-19 00:00:00.000', '2026-03-19 12:14:04.505'),
(22, 2, 5, 'CREATE', '2026-03-19 00:00:00.000', '2026-03-19 12:49:42.907'),
(23, 1, 5, 'UPDATE', '2026-03-19 00:00:00.000', '2026-03-19 12:53:55.091'),
(24, 1, 5, 'UPDATE', '2026-03-19 00:00:00.000', '2026-03-19 12:54:29.918'),
(25, 2, 5, 'UPDATE', '2026-03-19 00:00:00.000', '2026-03-19 12:55:18.727'),
(26, 3, 1, 'CREATE', '2026-03-23 00:00:00.000', '2026-03-23 10:13:11.270'),
(27, 3, 1, 'UPDATE', '2026-03-23 00:00:00.000', '2026-03-23 10:14:30.222'),
(28, 3, 1, 'UPDATE', '2026-03-23 00:00:00.000', '2026-03-23 10:15:40.895'),
(29, 3, 1, 'UPDATE', '2026-03-24 00:00:00.000', '2026-03-24 09:27:07.122'),
(30, 3, 1, 'UPDATE', '2026-03-24 00:00:00.000', '2026-03-24 09:28:00.419');

-- --------------------------------------------------------

--
-- Table structure for table `CallLog`
--

CREATE TABLE `CallLog` (
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
-- Table structure for table `CallStatus`
--

CREATE TABLE `CallStatus` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `CallStatus`
--

INSERT INTO `CallStatus` (`id`, `name`, `is_active`) VALUES
(1, 'Not Connected', 1),
(2, 'Connected', 1),
(3, 'Follow Up Required', 1),
(4, 'Interested', 1),
(5, 'Not Interested', 1),
(6, 'Call Back Later', 1),
(7, 'Converted to Lead', 1);

-- --------------------------------------------------------

--
-- Table structure for table `CallTracker`
--

CREATE TABLE `CallTracker` (
  `id` int(11) NOT NULL,
  `date` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `product_id` int(11) DEFAULT NULL,
  `industry_id` int(11) DEFAULT NULL,
  `source_of_db_id` int(11) DEFAULT NULL,
  `company_name` varchar(191) NOT NULL,
  `location` varchar(191) DEFAULT NULL,
  `contact_person_name` varchar(191) DEFAULT NULL,
  `designation` varchar(191) DEFAULT NULL,
  `email_address` varchar(191) DEFAULT NULL,
  `mobile_no` varchar(191) DEFAULT NULL,
  `business_potential` varchar(191) DEFAULT NULL,
  `email_status_id` int(11) DEFAULT NULL,
  `linkedin_sent` tinyint(1) NOT NULL DEFAULT 0,
  `call_status_id` int(11) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `next_follow_up_date` datetime(3) DEFAULT NULL,
  `moved_to_quad` varchar(191) DEFAULT NULL,
  `quadrant_moved_date` datetime(3) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `is_converted` tinyint(1) NOT NULL DEFAULT 0,
  `converted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `eit_service_id` int(11) DEFAULT NULL,
  `im_service_id` int(11) DEFAULT NULL,
  `product_or_service` varchar(191) DEFAULT NULL,
  `service_department` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `CallTracker`
--

INSERT INTO `CallTracker` (`id`, `date`, `product_id`, `industry_id`, `source_of_db_id`, `company_name`, `location`, `contact_person_name`, `designation`, `email_address`, `mobile_no`, `business_potential`, `email_status_id`, `linkedin_sent`, `call_status_id`, `remarks`, `next_follow_up_date`, `moved_to_quad`, `quadrant_moved_date`, `user_id`, `is_converted`, `converted_at`, `created_at`, `updated_at`, `eit_service_id`, `im_service_id`, `product_or_service`, `service_department`) VALUES
(1, '2026-03-19 00:00:00.000', 1, 2, 3, 'XYZ Enterprises', 'Select City', 'test', 'DGM', 'test@gmail.com', '09876543210', '20', 2, 1, 3, 'test', '2026-03-24 00:00:00.000', NULL, NULL, 5, 0, NULL, '2026-03-19 12:12:16.768', '2026-03-19 12:54:29.912', NULL, NULL, 'Product', NULL),
(2, '2026-03-19 00:00:00.000', NULL, NULL, NULL, 'test Logistics', 'Mumbai', 'simsone j', NULL, 'simsone@angleritech.com', '06573829182', NULL, 2, 0, 3, NULL, NULL, NULL, NULL, 5, 0, NULL, '2026-03-19 12:49:42.900', '2026-03-19 12:55:18.721', NULL, 3, 'IM Service', NULL),
(3, '2026-03-24 00:00:00.000', 1, 1, 2, 'Xyz', 'Coimbatore', 'KK', 'GM', 'gm@gmail.com', '9639633696', '1000000', 3, 0, 1, NULL, '2026-03-31 00:00:00.000', NULL, NULL, 1, 0, NULL, '2026-03-23 10:13:11.260', '2026-03-24 09:28:00.414', NULL, NULL, 'Product', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `CallTracker_old`
--

CREATE TABLE `CallTracker_old` (
  `id` int(11) NOT NULL,
  `date` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `product_id` int(11) DEFAULT NULL,
  `industry_id` int(11) DEFAULT NULL,
  `source_of_db_id` int(11) DEFAULT NULL,
  `company_name` varchar(191) NOT NULL,
  `location` varchar(191) DEFAULT NULL,
  `contact_person_name` varchar(191) DEFAULT NULL,
  `designation` varchar(191) DEFAULT NULL,
  `email_address` varchar(191) DEFAULT NULL,
  `mobile_no` varchar(191) DEFAULT NULL,
  `business_potential` varchar(191) DEFAULT NULL,
  `email_status_id` int(11) DEFAULT NULL,
  `linkedin_sent` tinyint(1) NOT NULL DEFAULT 0,
  `call_status_id` int(11) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `next_follow_up_date` datetime(3) DEFAULT NULL,
  `moved_to_quad` varchar(191) DEFAULT NULL,
  `quadrant_moved_date` datetime(3) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `is_converted` tinyint(1) NOT NULL DEFAULT 0,
  `converted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `CallTracker_old`
--

INSERT INTO `CallTracker_old` (`id`, `date`, `product_id`, `industry_id`, `source_of_db_id`, `company_name`, `location`, `contact_person_name`, `designation`, `email_address`, `mobile_no`, `business_potential`, `email_status_id`, `linkedin_sent`, `call_status_id`, `remarks`, `next_follow_up_date`, `moved_to_quad`, `quadrant_moved_date`, `user_id`, `is_converted`, `converted_at`, `created_at`, `updated_at`) VALUES
(1, '2026-02-24 00:00:00.000', 2, 1, NULL, '3dtech', 'chennai', 'xyz', 'manager', 'manager@gmail.com', '8484758383', '23', NULL, 1, NULL, 'test', '2026-02-25 00:00:00.000', NULL, NULL, 3, 0, NULL, '2026-02-24 11:49:10.492', '2026-02-24 11:49:40.587'),
(2, '2026-03-05 00:00:00.000', 2, 1, 1, 'ABC company', 'Mumbai', 'simsone', 'manager', 'sarah.williams@globalsolutions.com', '09876543211', '35', 2, 1, 3, 'test', '2026-03-15 00:00:00.000', NULL, NULL, 2, 0, NULL, '2026-03-05 09:29:44.155', '2026-03-05 10:04:06.704'),
(3, '2026-03-05 00:00:00.000', 1, 1, 1, 'XYZ', 'Chennai', 'vasanth', 'IT Manager', 'vasanth@gmail.com', '2345673456', '54', 1, 1, 2, 'test', '2026-03-25 00:00:00.000', NULL, NULL, 2, 0, NULL, '2026-03-05 10:03:08.747', '2026-03-05 10:34:50.513'),
(4, '2026-03-04 18:30:00.000', 2, NULL, NULL, '3dtech', 'chennai', 'xyz', 'manager', 'manager@gmail.com', '8484758383', '23', NULL, 0, NULL, 'test', '2026-03-24 18:30:00.000', NULL, NULL, 2, 0, NULL, '2026-03-05 11:52:05.316', '2026-03-05 11:52:05.316'),
(5, '2026-03-06 00:00:00.000', 3, 4, 5, 'SDT Transport', 'Trichy', 'Vasu', 'Manager', 'vasu.sdttransport@gmail.com', '9859585955', '55', 1, 1, 6, 'Testing', '2026-03-07 00:00:00.000', NULL, NULL, 5, 0, NULL, '2026-03-06 10:27:59.675', '2026-03-06 10:28:18.284'),
(6, '2026-03-06 00:00:00.000', 2, 5, 2, 'TYS Technologies', 'maharashtra', 'Yash', 'DGM', 'yash@tysgmail.com', '8474848448', '80', 2, 0, 3, 'tesing purpose', '2026-03-10 00:00:00.000', NULL, NULL, 7, 0, NULL, '2026-03-06 11:02:59.277', '2026-03-06 11:02:59.277'),
(7, '2026-03-12 00:00:00.000', 3, 4, NULL, 'RKS TRaders', 'Mumbai', 'rukesh P', 'IT Manager', 'rukesh@gmail.com', '08934578926', '25', 2, 1, 4, 'testing', '2026-03-15 00:00:00.000', NULL, NULL, 5, 0, NULL, '2026-03-12 06:03:17.383', '2026-03-12 06:03:17.383'),
(8, '2026-03-12 00:00:00.000', 1, 9, 1, 'XYZ', 'Coimbatore', 'KK', 'DGM', 'kk@gmail.com', '9361663950', '150000', 1, 0, 1, NULL, '2026-03-20 00:00:00.000', NULL, NULL, 1, 0, NULL, '2026-03-12 12:33:22.307', '2026-03-12 12:33:22.307'),
(9, '2026-03-12 00:00:00.000', 1, 10, 1, 'xyz', 'Kovai', 'Rkk', 'DGM', 'test@gmail.com', '9361663950', '150000', 1, 0, 1, 'Not ', '2026-03-20 00:00:00.000', NULL, NULL, 1, 0, NULL, '2026-03-12 12:34:47.421', '2026-03-12 12:34:47.421'),
(10, '2026-03-12 00:00:00.000', 4, 2, 2, 'RKS TRaders', 'Chennai', 'rukesh P', 'manager', 'rukesh@gmail.com', '08934578926', '5000000', 3, 1, 4, 'testing', '2026-03-15 00:00:00.000', NULL, NULL, 5, 0, NULL, '2026-03-12 12:45:52.588', '2026-03-12 12:45:52.588');

-- --------------------------------------------------------

--
-- Table structure for table `City`
--

CREATE TABLE `City` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `state_id` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `City`
--

INSERT INTO `City` (`id`, `name`, `state_id`, `is_active`) VALUES
(1, 'San Francisco', 1, 1),
(2, 'Mumbai', 2, 1),
(3, 'Coimbatore', 3, 1),
(4, 'Chennai', 3, 1);

-- --------------------------------------------------------

--
-- Table structure for table `Collateral`
--

CREATE TABLE `Collateral` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `url` varchar(191) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Collateral`
--

INSERT INTO `Collateral` (`id`, `name`, `url`, `is_active`) VALUES
(1, 'BRD', NULL, 1),
(2, 'Technical Document', NULL, 1),
(3, 'Flow Diagram', NULL, 1),
(4, 'Business Process/Logic Document', NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `Company`
--

CREATE TABLE `Company` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Company`
--

INSERT INTO `Company` (`id`, `name`, `is_active`) VALUES
(1, 'Angler Technologies', 1),
(2, 'Trinetra', 1),
(3, 'abc Technologies', 0),
(4, 'test Logistics', 0);

-- --------------------------------------------------------

--
-- Table structure for table `Country`
--

CREATE TABLE `Country` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Country`
--

INSERT INTO `Country` (`id`, `name`, `is_active`) VALUES
(1, 'India', 1),
(2, 'USA', 1);

-- --------------------------------------------------------

--
-- Table structure for table `Department`
--

CREATE TABLE `Department` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `EitService`
--

CREATE TABLE `EitService` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `count_type` varchar(191) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `lead_q1_multiplier` double NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `EitService`
--

INSERT INTO `EitService` (`id`, `name`, `count_type`, `is_active`, `lead_q1_multiplier`) VALUES
(1, 'Custom Development', 'Man days', 1, 1),
(2, 'Annual Maintenance', 'Man days', 1, 1),
(3, 'Testing Services', 'Man days', 1, 1),
(4, 'Mobile App Development ', 'Man days', 1, 1),
(5, 'IMS', 'Man days', 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `EmailStatus`
--

CREATE TABLE `EmailStatus` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `EmailStatus`
--

INSERT INTO `EmailStatus` (`id`, `name`, `is_active`) VALUES
(1, 'Not Sent', 1),
(2, 'Intro Mail', 1),
(3, 'Follow up Email 1', 1),
(4, 'Follow up Email 2', 1),
(5, 'Engg Mail 1', 1),
(6, 'Engg Mail 2', 1);

-- --------------------------------------------------------

--
-- Table structure for table `FollowUpLog`
--

CREATE TABLE `FollowUpLog` (
  `id` int(11) NOT NULL,
  `lead_id` int(11) NOT NULL,
  `activity_id` int(11) DEFAULT NULL,
  `date` datetime(3) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `created_by_id` int(11) NOT NULL,
  `sales_stage_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `FollowUpLog`
--

INSERT INTO `FollowUpLog` (`id`, `lead_id`, `activity_id`, `date`, `notes`, `created_at`, `created_by_id`, `sales_stage_id`) VALUES
(1, 2, NULL, '2026-03-20 17:21:00.000', 'test', '2026-03-04 13:21:30.249', 2, NULL),
(2, 2, NULL, '2026-03-20 11:51:00.000', 'test', '2026-03-04 13:22:26.851', 2, NULL),
(3, 3, NULL, '2026-03-05 10:05:00.000', NULL, '2026-03-05 10:05:21.017', 2, NULL),
(4, 3, NULL, '2026-03-05 04:35:00.000', 'test\n', '2026-03-06 05:37:19.005', 1, NULL),
(5, 2, NULL, '2026-03-20 06:21:00.000', 'test for the tooltip actions', '2026-03-06 06:01:54.997', 1, NULL),
(6, 5, NULL, '2026-03-15 11:28:00.000', 'testing', '2026-03-07 11:28:58.264', 5, NULL),
(7, 5, NULL, '2026-03-15 05:58:00.000', 'testing', '2026-03-07 11:29:38.222', 5, NULL),
(8, 5, NULL, '2026-03-15 00:28:00.000', 'testing', '2026-03-07 12:03:43.173', 5, NULL),
(9, 5, NULL, '2026-03-15 00:28:00.000', 'testing', '2026-03-12 05:11:37.635', 1, NULL),
(10, 5, NULL, '2026-03-15 00:28:00.000', 'testing', '2026-03-12 05:11:56.403', 1, NULL),
(11, 12, NULL, '2026-03-20 10:57:00.000', 'test', '2026-03-12 05:27:49.115', 1, NULL),
(12, 13, NULL, '2026-03-24 11:18:00.000', 'test', '2026-03-12 05:48:54.737', 1, NULL),
(13, 13, NULL, '2026-03-24 11:18:00.000', 'test', '2026-03-12 05:50:17.791', 1, NULL),
(14, 14, NULL, '2026-03-18 10:00:00.000', 'Direct visit to discuss requirement', '2026-03-12 12:30:21.157', 1, NULL),
(15, 20, NULL, '2026-03-16 14:28:00.000', 'Proposal Walkthrough', '2026-03-14 08:59:30.113', 13, NULL),
(16, 22, NULL, '2026-04-01 16:00:00.000', 'Follow up for appointment', '2026-03-20 10:31:53.419', 1, 1),
(17, 23, NULL, '2026-03-24 16:22:00.000', 'testing notes', '2026-03-21 07:46:50.148', 5, 2),
(18, 23, NULL, '2026-03-24 16:22:00.000', 'testing notes', '2026-03-21 11:41:07.065', 5, 2),
(19, 24, NULL, '2026-03-24 20:18:00.000', 'test', '2026-03-21 11:49:08.118', 1, 3),
(20, 24, NULL, '2026-03-24 20:18:00.000', 'test', '2026-03-21 11:50:01.892', 1, 3),
(21, 24, NULL, '2026-03-24 20:18:00.000', 'test', '2026-03-21 11:53:46.389', 1, 3),
(22, 25, NULL, '2026-03-31 15:00:00.000', 'Meet and gather custmer requirement', '2026-03-23 10:00:10.374', 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `ImService`
--

CREATE TABLE `ImService` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `count_type` varchar(191) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `lead_q1_multiplier` double NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ImService`
--

INSERT INTO `ImService` (`id`, `name`, `count_type`, `is_active`, `lead_q1_multiplier`) VALUES
(1, 'Website', 'Nodes', 1, 1),
(2, 'SEO', 'Nodes', 1, 1),
(3, 'SEM', 'Nodes', 1, 1),
(4, 'SMM', 'count', 1, 1),
(5, 'Domain', 'count', 1, 1),
(6, 'Server', 'count', 1, 1),
(7, 'G-Suite', 'count', 1, 1),
(8, 'AMC', 'count', 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `Industry`
--

CREATE TABLE `Industry` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Industry`
--

INSERT INTO `Industry` (`id`, `name`, `is_active`) VALUES
(1, 'Technology & IT Services', 1),
(2, 'Healthcare & Life Sciences', 1),
(3, 'Banking, Financial Services & Insurance (BFSI)', 1),
(4, 'Manufacturing & Industrial', 1),
(5, 'Retail & Consumer Services', 1),
(6, 'Telecommunications', 1),
(7, 'Energy & Utilities', 1),
(8, 'Government & Public Sector', 1),
(9, 'Education & Research', 1),
(10, 'Media, Entertainment & Travel', 1);

-- --------------------------------------------------------

--
-- Table structure for table `JobTitle`
--

CREATE TABLE `JobTitle` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `JobTitle`
--

INSERT INTO `JobTitle` (`id`, `name`, `is_active`) VALUES
(1, 'CEO', 1),
(2, 'Business Development Executive', 1),
(3, 'Business Head', 1),
(4, 'COO', 1),
(5, 'DGM, Sales', 1),
(6, 'VP Sales', 1),
(7, 'dev', 1),
(8, 'Manager', 1),
(9, 'devloper', 1),
(10, 'Developer', 1),
(11, 'IT Manager', 1),
(12, 'test', 0),
(13, 'DGM', 1),
(14, 'Managing Director', 1),
(15, 'Leader - Procurement', 1),
(16, 'BH', 1);

-- --------------------------------------------------------

--
-- Table structure for table `KraEntry`
--

CREATE TABLE `KraEntry` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `calls_target` int(11) NOT NULL,
  `calls_actual` int(11) NOT NULL,
  `notes` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Lead`
--

CREATE TABLE `Lead` (
  `id` int(11) NOT NULL,
  `created_by_id` int(11) NOT NULL,
  `sales_sbu_id` int(11) DEFAULT NULL,
  `lead_owner_id` int(11) DEFAULT NULL,
  `salutation` enum('Mr','Mrs','Ms','Dr') DEFAULT NULL,
  `first_name` varchar(191) DEFAULT NULL,
  `last_name` varchar(191) DEFAULT NULL,
  `company_id` int(11) DEFAULT NULL,
  `job_title_id` int(11) DEFAULT NULL,
  `avatar_id` int(11) DEFAULT NULL,
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
  `eit_service_id` int(11) DEFAULT NULL,
  `im_service_id` int(11) DEFAULT NULL,
  `persona_id` int(11) DEFAULT NULL,
  `where_find_them_id` int(11) DEFAULT NULL,
  `telecalling_qualified` tinyint(1) NOT NULL DEFAULT 0,
  `device_count` varchar(191) DEFAULT NULL,
  `employee_count` varchar(191) DEFAULT NULL,
  `vendor_count` varchar(191) DEFAULT NULL,
  `branch_unit` varchar(191) DEFAULT NULL,
  `license_count` varchar(191) DEFAULT NULL,
  `custom_count_type` varchar(191) DEFAULT NULL,
  `requirement_desc` text DEFAULT NULL,
  `pain_points` text DEFAULT NULL,
  `pain_points_files` text DEFAULT NULL,
  `demo_completed` tinyint(1) NOT NULL DEFAULT 0,
  `pilot_provided` tinyint(1) NOT NULL DEFAULT 0,
  `demo_done_authority` tinyint(1) NOT NULL DEFAULT 0,
  `post_demo_feedback_sent` tinyint(1) NOT NULL DEFAULT 0,
  `post_demo_feedback_received` tinyint(1) NOT NULL DEFAULT 0,
  `post_demo_feedback_file` varchar(191) DEFAULT NULL,
  `probing_discussion_authority` tinyint(1) NOT NULL DEFAULT 0,
  `direct_visit_authority` tinyint(1) NOT NULL DEFAULT 0,
  `pilot_given` tinyint(1) NOT NULL DEFAULT 0,
  `mgmt_call_completed` tinyint(1) NOT NULL DEFAULT 0,
  `utilized_mgmt_urgency` tinyint(1) NOT NULL DEFAULT 0,
  `utilized_presales_timeline` tinyint(1) NOT NULL DEFAULT 0,
  `authority_champion_influencer_identified` tinyint(1) NOT NULL DEFAULT 0,
  `competitor_details` text DEFAULT NULL,
  `opportunities_values` text DEFAULT NULL,
  `order_won_attachment` varchar(191) DEFAULT NULL,
  `order_value` decimal(65,30) DEFAULT NULL,
  `lead_score` int(11) NOT NULL DEFAULT 0,
  `reduce_cost_score` int(11) NOT NULL DEFAULT 0,
  `efficiency_score` int(11) NOT NULL DEFAULT 0,
  `automation_score` int(11) NOT NULL DEFAULT 0,
  `others_score` int(11) NOT NULL DEFAULT 0,
  `others_score_label` varchar(191) DEFAULT NULL,
  `established_need_score` int(11) NOT NULL DEFAULT 0,
  `urgency_score` int(11) NOT NULL DEFAULT 0,
  `budget_allocated_score` int(11) NOT NULL DEFAULT 0,
  `decision_maker_score` int(11) NOT NULL DEFAULT 0,
  `competition_score` int(11) NOT NULL DEFAULT 0,
  `champion_score` int(11) NOT NULL DEFAULT 0,
  `influencer_score` int(11) NOT NULL DEFAULT 0,
  `lead_source_quality` int(11) NOT NULL DEFAULT 0,
  `decision_contact_score` int(11) NOT NULL DEFAULT 0,
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
  `quadrant_start_date` datetime(3) DEFAULT current_timestamp(3),
  `last_positive_movement_at` datetime(3) DEFAULT current_timestamp(3),
  `follow_up_activity_id` int(11) DEFAULT NULL,
  `follow_up_datetime` datetime(3) DEFAULT NULL,
  `sales_stage_id` int(11) DEFAULT NULL,
  `next_activity_id` int(11) DEFAULT NULL,
  `next_activity_datetime` datetime(3) DEFAULT NULL,
  `is_farming` tinyint(1) NOT NULL DEFAULT 0,
  `farming_moved_at` datetime(3) DEFAULT NULL,
  `call_tracker_id` int(11) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `compliance_score` int(11) NOT NULL DEFAULT 0,
  `cp_score` int(11) NOT NULL DEFAULT 0,
  `company_name` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Lead`
--

INSERT INTO `Lead` (`id`, `created_by_id`, `sales_sbu_id`, `lead_owner_id`, `salutation`, `first_name`, `last_name`, `company_id`, `job_title_id`, `avatar_id`, `lead_source_id`, `industry_id`, `address`, `country_id`, `state_id`, `city_id`, `pin_code`, `other_info`, `annual_turnover`, `mobile_number`, `whatsapp_number`, `email`, `website`, `product_or_service`, `product_id`, `eit_service_id`, `im_service_id`, `persona_id`, `where_find_them_id`, `telecalling_qualified`, `device_count`, `employee_count`, `vendor_count`, `branch_unit`, `license_count`, `custom_count_type`, `requirement_desc`, `pain_points`, `pain_points_files`, `demo_completed`, `pilot_provided`, `demo_done_authority`, `post_demo_feedback_sent`, `post_demo_feedback_received`, `post_demo_feedback_file`, `probing_discussion_authority`, `direct_visit_authority`, `pilot_given`, `mgmt_call_completed`, `utilized_mgmt_urgency`, `utilized_presales_timeline`, `authority_champion_influencer_identified`, `competitor_details`, `opportunities_values`, `order_won_attachment`, `order_value`, `lead_score`, `reduce_cost_score`, `efficiency_score`, `automation_score`, `others_score`, `others_score_label`, `established_need_score`, `urgency_score`, `budget_allocated_score`, `decision_maker_score`, `competition_score`, `champion_score`, `influencer_score`, `lead_source_quality`, `decision_contact_score`, `budget_yes_no`, `budget_allocated`, `approval_stage`, `authority_yes_no`, `decision_maker`, `need_yes_no`, `pain_points_desc`, `timeline_yes_no`, `expected_closure_date`, `quadrant`, `quadrant_updated_at`, `quadrant_start_date`, `last_positive_movement_at`, `follow_up_activity_id`, `follow_up_datetime`, `sales_stage_id`, `next_activity_id`, `next_activity_datetime`, `is_farming`, `farming_moved_at`, `call_tracker_id`, `created_at`, `updated_at`, `compliance_score`, `cp_score`, `company_name`) VALUES
(4, 5, 2, 5, NULL, 'rukesh', 'P', NULL, 11, NULL, NULL, NULL, 'Thaaravi', 1, 2, NULL, '600731', NULL, NULL, '8934578926', NULL, 'rukesh@gmail.com', NULL, 'Product', 2, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, '4', NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 1, 0, 0, 0, NULL, '100000', NULL, NULL, 9, 0, 0, 2, 2, NULL, 0, 0, 2, 0, 0, 0, 2, 0, 1, 0, NULL, NULL, 0, NULL, 0, NULL, 1, '2026-03-26 00:00:00.000', 'Q2', '2026-03-12 05:28:30.354', '2026-03-12 05:28:30.354', '2026-03-12 05:28:30.354', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-03-07 11:11:20.944', '2026-03-12 05:28:30.356', 0, 1, NULL),
(5, 5, 2, 5, 'Mr', 'SUNDAR', 'D', NULL, 8, 1, 3, 10, 'Tamparam', 1, 3, 4, '645505', NULL, 5000000.000000000000000000000000000000, '8936457865', '4545465543', 'sundar@gmail.com', 'www.testlogistics.com', 'Product', 2, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, '4', NULL, 'test', 'test', '[\"/uploads/1772882714908-526030178.sql\"]', 1, 0, 1, 1, 0, NULL, 1, 0, 0, 1, 0, 0, 0, 'testt', '2000000', NULL, NULL, 10, 2, 0, 0, 0, NULL, 2, 1, 0, 2, 0, 0, 0, 0, 1, 0, NULL, NULL, 0, NULL, 0, NULL, 1, '2026-03-15 00:00:00.000', 'Q2', '2026-03-12 05:28:25.714', '2026-03-12 05:28:25.714', '2026-03-12 05:28:25.714', NULL, '2026-03-15 00:28:00.000', 2, 2, NULL, 0, NULL, NULL, '2026-03-07 11:25:15.163', '2026-03-12 05:28:25.715', 2, 4, 'SD transport'),
(12, 1, 3, 1, 'Mr', 'simson', 'j', NULL, 11, 1, 1, 4, 'Thaaravi', 1, 2, 2, '600731', NULL, 50000000.000000000000000000000000000000, '6573829182', '7446467473', 'simsone@angleritech.com', 'www.test.com', 'EitService', NULL, 3, NULL, 40, NULL, 1, NULL, NULL, NULL, NULL, '10', NULL, 'testing', 'testing', '[\"/uploads/1773293269063-128313940.xlsx\"]', 1, 0, 0, 0, 0, NULL, 0, 0, 0, 1, 0, 0, 0, 'tester', '1000000', NULL, NULL, 8, 0, 2, 0, 0, NULL, 2, 0, 0, 0, 0, 2, 0, 0, 2, 0, NULL, NULL, 0, NULL, 0, NULL, 1, '2026-03-15 00:00:00.000', 'Q1', NULL, '2026-03-12 05:27:49.097', '2026-03-12 05:27:49.093', NULL, '2026-03-20 10:57:00.000', 2, 2, NULL, 0, NULL, NULL, '2026-03-12 05:27:49.097', '2026-03-12 05:27:49.097', 0, 1, 'test Logistics'),
(13, 1, 2, 1, 'Mr', 'simsone', 'j', NULL, 10, 1, 3, 3, 'Thaaravi', 1, 2, 2, '600731', NULL, 40000000.000000000000000000000000000000, '6573829182', '1236549870', 'simsone@angleritech.com', 'www.xyzenterprises.com', 'EitService', NULL, 3, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, '5', NULL, 'testing', 'testing', '[\"/uploads/1773294534685-724470579.sql\"]', 1, 0, 0, 0, 0, NULL, 0, 1, 0, 0, 1, 0, 0, 'testing', '2000000', NULL, NULL, 8, 0, 2, 0, 1, NULL, 0, 2, 0, 0, 2, 0, 0, 0, 1, 0, NULL, NULL, 0, NULL, 0, NULL, 1, '2026-03-15 00:00:00.000', 'Q1', NULL, '2026-03-12 05:48:54.697', '2026-03-12 05:48:54.695', NULL, '2026-03-24 11:18:00.000', 1, 2, NULL, 0, NULL, NULL, '2026-03-12 05:48:54.697', '2026-03-12 05:50:17.688', 0, 2, 'harsha Logistics'),
(14, 1, 10, 1, 'Mr', 'krishnakumar', 'R', NULL, 13, 1, 1, 1, 'Trichy Road', 1, 3, 3, '641045', NULL, 60000000.000000000000000000000000000000, '9361663950', '9361663950', 'kk@gmail.com', 'www.angleritech.com', 'Product', 1, NULL, NULL, 2, NULL, 1, NULL, NULL, NULL, NULL, '500', NULL, 'Test', 'Attendance', NULL, 1, 1, 0, 0, 0, NULL, 0, 0, 0, 1, 0, 0, 0, 'Time', '500000', NULL, NULL, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 0, NULL, 0, NULL, 0, NULL, 'Q1', NULL, '2026-03-12 12:30:21.119', '2026-03-12 12:30:21.112', NULL, '2026-03-18 10:00:00.000', 1, 1, NULL, 0, NULL, NULL, '2026-03-12 12:30:21.119', '2026-03-12 12:30:21.119', 0, 1, 'Angler'),
(16, 5, 2, 5, 'Mr', 'simson', 'j', NULL, 11, 1, NULL, 2, 'Thaaravi', NULL, NULL, NULL, '600731', NULL, 50000000.000000000000000000000000000000, '6573829182', '7446467473', 'simsone@angleritech.com', 'www.test.com', 'Product', 2, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, NULL, 0, 0, 1, 0, 0, 0, 0, NULL, '1000000', NULL, NULL, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 0, NULL, 0, NULL, 0, NULL, 'Q1', NULL, '2026-03-12 13:38:03.441', '2026-03-12 13:38:03.439', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-03-12 13:38:03.441', '2026-03-12 13:39:04.183', 0, 1, 'test Logistics'),
(19, 1, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Product', 4, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 0, NULL, 0, NULL, 0, NULL, 'Q1', NULL, '2026-03-12 14:13:23.133', '2026-03-12 14:13:23.131', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-03-12 14:13:23.133', '2026-03-12 14:21:04.773', 0, 0, '-'),
(20, 13, 10, 13, 'Mr', 'Gugan', NULL, NULL, 14, 1, 5, NULL, '208, Gowtham Arcade, 3rd Floor, T.V. Samy Road East, R.S. Puram, Coimbatore, Tamil Nadu, India - 641002', 1, 3, 3, '641018', NULL, 223000000.000000000000000000000000000000, '9842235833', '9842235833', 'gugan@gowtham.net', 'https://gowthamhousing.com/', 'ImService', NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Digital Marketing', NULL, NULL, 1, 0, 1, 0, 0, NULL, 1, 0, 0, 0, 0, 1, 0, NULL, '225000', NULL, NULL, 12, 0, 2, 0, 0, NULL, 2, 2, 0, 2, 0, 0, 0, 2, 2, 0, NULL, NULL, 1, 'Mr Gugan - Managing Director--Decision Maker', 1, 'To sell 2BHK & 3BHK apartments located in the Singanallur within April to Sep 2026', 1, '2026-04-01 00:00:00.000', 'Q2', NULL, '2026-03-14 08:59:30.073', '2026-03-14 08:59:30.065', NULL, '2026-03-16 14:28:00.000', 3, 4, NULL, 0, NULL, NULL, '2026-03-14 08:59:30.073', '2026-03-14 08:59:30.073', 0, 3, 'Gowtham Housing'),
(21, 10, 2, 10, 'Mr', 'Ganesh Thiyagarajan', NULL, NULL, 15, 2, 5, 4, '“Chola Crest” 4th Floor, No.C54-55 & Super B-4, Thiru Vi Ka Industrial Estate, Guindy, Chennai 600 032', 1, 3, 4, '600032', NULL, NULL, '9445658244', '9445658244', 'ganesht@ticm.murugappa.com', 'www.ticm.murugappa.com', 'Product', 3, NULL, NULL, 21, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, '1000000', NULL, NULL, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 1, 'Mr Ganesh Thiyagarajan - Leader - Procurement--Influencer', 0, NULL, 0, NULL, 'Q1', NULL, '2026-03-18 13:15:10.548', '2026-03-18 13:15:10.543', NULL, NULL, 1, 3, NULL, 0, NULL, NULL, '2026-03-18 13:15:10.548', '2026-03-18 13:15:10.548', 0, 0, 'TI Clean Mobility'),
(22, 1, 1, 12, 'Mr', 'Krishnakumar', 'R', NULL, 13, 2, 1, 1, 'Trichy Road', 1, 3, 3, '641045', NULL, 90000000.000000000000000000000000000000, '9361663950', '9361663950', 'kk@gmail.com', 'angleritech.com', 'Product', 3, NULL, NULL, 22, NULL, 1, NULL, NULL, NULL, NULL, '1000', NULL, 'RFQ', 'Quote finalization', NULL, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 1, 0, 0, 0, 'NA', '1000000', NULL, NULL, 13, 1, 2, 2, 0, NULL, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, NULL, NULL, 0, NULL, 0, NULL, 0, NULL, 'Q2', NULL, '2026-03-20 10:31:53.365', '2026-03-20 10:31:53.362', NULL, '2026-04-01 16:00:00.000', 1, 3, NULL, 0, NULL, NULL, '2026-03-20 10:31:53.365', '2026-03-20 10:31:53.365', 1, 1, 'Angler'),
(23, 5, 2, 5, NULL, 'simsone', 'j', NULL, 10, 1, 1, 9, NULL, NULL, NULL, NULL, NULL, NULL, 4500000.000000000000000000000000000000, '3298732876', '7826478544', 'simsone@angleritech.com', NULL, 'Product', 3, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, '90', NULL, NULL, NULL, NULL, 1, 0, 0, 0, 0, NULL, 0, 0, 0, 0, 1, 1, 0, NULL, '250000', NULL, 1999999.960000000000000000000000000000, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 0, NULL, 0, NULL, 0, NULL, 'Q1', '2026-03-21 11:41:07.034', '2026-03-21 11:41:07.034', '2026-03-21 11:41:07.034', NULL, '2026-03-24 16:22:00.000', 2, 1, NULL, 0, NULL, NULL, '2026-03-21 07:46:50.103', '2026-03-21 11:41:07.037', 0, 2, 'techies'),
(24, 1, NULL, 1, NULL, 'simsone', 'j', NULL, 10, 1, 5, 7, NULL, 1, 3, 3, NULL, NULL, 500000.000000000000000000000000000000, '3298732876', '7826478544', 'simsone@angleritech.com', NULL, 'Product', 3, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 0, 1, 0, 0, NULL, 1, 0, 0, 0, 1, 1, 0, NULL, '350000', NULL, NULL, 10, 2, 0, 1, 0, NULL, 0, 2, 0, 1, 1, 2, 0, 1, 0, 0, NULL, NULL, 0, NULL, 0, NULL, 1, '2026-03-30 00:00:00.000', 'Q2', '2026-03-24 05:19:14.405', '2026-03-24 05:19:14.405', '2026-03-24 05:19:14.405', NULL, '2026-03-24 20:18:00.000', 3, 2, NULL, 0, NULL, NULL, '2026-03-21 11:49:08.096', '2026-03-24 05:19:14.408', 0, 4, 'techies'),
(25, 1, 3, 1, 'Mr', 'Rajan', 'Chetty', NULL, 16, 2, 5, 2, 'Sample street', 1, 3, 3, '641002', NULL, 100000000.000000000000000000000000000000, '9638527411', '9638527411', 'rajan@gmail.comn', 'example.com', 'Product', 3, NULL, NULL, 22, NULL, 1, NULL, NULL, NULL, NULL, '1000', NULL, 'PO to Payment', 'Manual', NULL, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 'No', '1000000', NULL, NULL, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 0, NULL, 0, NULL, 0, NULL, 'Q1', NULL, '2026-03-23 10:00:10.331', '2026-03-23 10:00:10.325', NULL, '2026-03-31 15:00:00.000', 1, 1, NULL, 0, NULL, NULL, '2026-03-23 10:00:10.331', '2026-03-23 10:00:10.331', 0, 0, 'XYZ Enterprise');

-- --------------------------------------------------------

--
-- Table structure for table `LeadContact`
--

CREATE TABLE `LeadContact` (
  `id` int(11) NOT NULL,
  `lead_id` int(11) NOT NULL,
  `name` varchar(191) DEFAULT NULL,
  `designation` varchar(191) DEFAULT NULL,
  `email` varchar(191) DEFAULT NULL,
  `contact_mobile` varchar(191) DEFAULT NULL,
  `whatsapp` varchar(191) DEFAULT NULL,
  `avatar_id` int(11) DEFAULT NULL,
  `persona_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `LeadContact`
--

INSERT INTO `LeadContact` (`id`, `lead_id`, `name`, `designation`, `email`, `contact_mobile`, `whatsapp`, `avatar_id`, `persona_id`) VALUES
(1, 14, 'Jayanthra', 'CEO', 'jay@gmail.com', '9631663950', NULL, 2, 2),
(2, 20, 'Ananthram', 'Head Marketing & Sales', 'myhome@gowtham.net', '9750035834', NULL, NULL, NULL),
(3, 22, 'Jayanthra', 'CEO', 'jay@gmail.com', '9361669950', NULL, 1, 21),
(4, 25, 'KK', 'DGM', 'kk@gmail.com', '9639639632', NULL, 1, 21);

-- --------------------------------------------------------

--
-- Table structure for table `LeadDocument`
--

CREATE TABLE `LeadDocument` (
  `id` int(11) NOT NULL,
  `lead_id` int(11) NOT NULL,
  `follow_up_log_id` int(11) DEFAULT NULL,
  `name` varchar(191) DEFAULT NULL,
  `url` varchar(191) DEFAULT NULL,
  `description` varchar(191) DEFAULT NULL,
  `uploaded_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `LeadDocument`
--

INSERT INTO `LeadDocument` (`id`, `lead_id`, `follow_up_log_id`, `name`, `url`, `description`, `uploaded_at`) VALUES
(1, 5, NULL, 'queued_jobs.sql', '/uploads/1772882938345-916016834.sql', 'developer', '2026-03-07 11:28:58.352'),
(2, 5, NULL, 'onboard_vendors.sql', '/uploads/1772882938429-339864282.sql', 'sales team', '2026-03-07 11:28:58.434');

-- --------------------------------------------------------

--
-- Table structure for table `LeadQuadrantHistory`
--

CREATE TABLE `LeadQuadrantHistory` (
  `id` int(11) NOT NULL,
  `lead_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `old_quadrant` varchar(191) DEFAULT NULL,
  `new_quadrant` varchar(191) DEFAULT NULL,
  `movement_type` enum('AUTO','MANUAL') NOT NULL DEFAULT 'MANUAL',
  `moved_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `LeadQuadrantHistory`
--

INSERT INTO `LeadQuadrantHistory` (`id`, `lead_id`, `user_id`, `old_quadrant`, `new_quadrant`, `movement_type`, `moved_at`) VALUES
(1, 1, 3, 'Q1', 'Q2', 'MANUAL', '2026-02-24 11:46:54.768'),
(2, 3, 1, 'Q4', 'Q1', 'MANUAL', '2026-02-26 10:09:55.363'),
(3, 2, 2, 'Q1', 'Q3', 'MANUAL', '2026-03-03 10:03:06.865'),
(4, 3, 2, 'Q1', 'Q4', 'MANUAL', '2026-03-03 12:41:54.446'),
(5, 2, 2, 'Q3', 'Q2', 'MANUAL', '2026-03-03 12:42:11.723'),
(6, 1, 2, 'Q2', 'Q4', 'MANUAL', '2026-03-04 13:19:52.778'),
(7, 2, 2, 'Q2', 'Q1', 'MANUAL', '2026-03-04 13:22:26.468'),
(8, 5, 5, 'Q1', 'Q2', 'MANUAL', '2026-03-07 11:30:12.580'),
(9, 23, 5, NULL, 'Q2', 'MANUAL', '2026-03-21 07:46:50.155'),
(10, 23, 5, 'Q2', 'Q1', 'MANUAL', '2026-03-21 11:41:07.028'),
(11, 24, 1, 'Q1', 'Q2', 'MANUAL', '2026-03-24 05:19:14.376');

-- --------------------------------------------------------

--
-- Table structure for table `LeadScore`
--

CREATE TABLE `LeadScore` (
  `id` int(11) NOT NULL,
  `lead_id` int(11) NOT NULL,
  `score` int(11) NOT NULL,
  `breakdown` text DEFAULT NULL,
  `updated_by` int(11) NOT NULL,
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `LeadScore`
--

INSERT INTO `LeadScore` (`id`, `lead_id`, `score`, `breakdown`, `updated_by`, `updated_at`) VALUES
(1, 2, 6, '{\"reduce_cost_score\":0,\"efficiency_score\":0,\"automation_score\":0,\"compliance_score\":0,\"established_need_score\":0,\"urgency_score\":2,\"budget_allocated_score\":0,\"decision_maker_score\":0,\"competition_score\":0,\"champion_score\":2,\"influencer_score\":0,\"lead_source_quality\":2,\"decision_contact_score\":0,\"others_score\":0}', 1, '2026-02-27 11:58:00.519'),
(2, 1, 2, '{\"reduce_cost_score\":0,\"efficiency_score\":0,\"automation_score\":0,\"compliance_score\":0,\"established_need_score\":0,\"urgency_score\":0,\"budget_allocated_score\":0,\"decision_maker_score\":0,\"competition_score\":0,\"champion_score\":0,\"influencer_score\":0,\"lead_source_quality\":0,\"decision_contact_score\":2,\"others_score\":0}', 2, '2026-03-04 13:20:39.986'),
(3, 5, 10, '{\"reduce_cost_score\":2,\"efficiency_score\":0,\"automation_score\":0,\"compliance_score\":2,\"established_need_score\":2,\"urgency_score\":1,\"budget_allocated_score\":0,\"decision_maker_score\":2,\"competition_score\":0,\"champion_score\":0,\"influencer_score\":0,\"lead_source_quality\":0,\"decision_contact_score\":1,\"others_score\":0}', 5, '2026-03-07 11:30:08.098');

-- --------------------------------------------------------

--
-- Table structure for table `LeadSource`
--

CREATE TABLE `LeadSource` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `LeadSource`
--

INSERT INTO `LeadSource` (`id`, `name`, `is_active`) VALUES
(1, 'Digital', 1),
(2, 'Telecall', 1),
(3, 'Repeat', 1),
(4, 'Website', 0),
(5, 'Reference (Client/Management)', 1),
(6, 'Exhibition', 1),
(7, 'Trade Show', 1);

-- --------------------------------------------------------

--
-- Table structure for table `Persona`
--

CREATE TABLE `Persona` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `eit_service_id` int(11) DEFAULT NULL,
  `im_service_id` int(11) DEFAULT NULL,
  `product_or_service` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Persona`
--

INSERT INTO `Persona` (`id`, `name`, `product_id`, `is_active`, `eit_service_id`, `im_service_id`, `product_or_service`) VALUES
(1, 'Chief Audit Executive', 2, 1, NULL, NULL, NULL),
(2, 'HR Manager', 1, 1, NULL, NULL, NULL),
(3, 'Supplier Auditor', 2, 1, NULL, NULL, NULL),
(4, 'Quality Head', 2, 1, NULL, NULL, NULL),
(5, 'Legal & Regulatory Officer', 2, 1, NULL, NULL, NULL),
(6, 'IT Auditor', 2, 1, NULL, NULL, NULL),
(7, 'HR Executive / HR Admin', 1, 1, NULL, NULL, NULL),
(8, 'Payroll Manager', 1, 1, NULL, NULL, NULL),
(9, 'Payroll Executive', 1, 1, NULL, NULL, NULL),
(10, 'Attendance / Time Office Manager', 1, 1, NULL, NULL, NULL),
(11, 'Attendance Executive / Time Office Staff', 1, 1, NULL, NULL, NULL),
(12, 'Department Manager / HOD', 1, 1, NULL, NULL, NULL),
(13, 'Shift In-charge / Supervisor', 1, 1, NULL, NULL, NULL),
(14, 'Employee (General Staff)', 1, 1, NULL, NULL, NULL),
(15, 'Contract / Temporary Staff', 1, 1, NULL, NULL, NULL),
(16, 'Security / Gate Staff', 1, 1, NULL, NULL, NULL),
(17, 'IT Administrator', 1, 1, NULL, NULL, NULL),
(18, 'Plant / Factory Manager', 1, 1, NULL, NULL, NULL),
(19, 'Compliance / Audit Officer', 1, 1, NULL, NULL, NULL),
(20, 'Management / CXO', 1, 1, NULL, NULL, NULL),
(21, 'Procurement Head', 3, 1, NULL, NULL, NULL),
(22, 'Chief Procurement Officer', 3, 1, NULL, NULL, NULL),
(23, 'Finance Manager ', 3, 1, NULL, NULL, NULL),
(24, 'Supply chain Manager Head', 3, 1, NULL, NULL, NULL),
(25, 'IT head', 3, 1, NULL, NULL, NULL),
(26, 'Fleet Manager', 4, 1, NULL, NULL, NULL),
(27, 'Logistics Head', 4, 1, NULL, NULL, NULL),
(28, 'Transport Manager', 4, 1, NULL, NULL, NULL),
(29, 'Operations Manager', 4, 1, NULL, NULL, NULL),
(30, 'Maintenance Head', 4, 1, NULL, NULL, NULL),
(31, 'Safety & Compliance Officer', 4, 1, NULL, NULL, NULL),
(32, 'IoT Solutions Architect', 5, 1, NULL, NULL, NULL),
(33, 'IT Head', 5, 1, NULL, NULL, NULL),
(34, 'OT/IT Manager', 5, 1, NULL, NULL, NULL),
(35, 'Plant Manager', 5, 1, NULL, NULL, NULL),
(36, 'Data Engineer', 5, 1, NULL, NULL, NULL),
(37, 'Digital Transformation Lead', 5, 1, NULL, NULL, NULL),
(38, 'Integration Architect', 6, 1, NULL, NULL, NULL),
(39, 'IT Head', 6, 1, NULL, NULL, NULL),
(40, 'test', NULL, 1, 3, NULL, 'EitService');

-- --------------------------------------------------------

--
-- Table structure for table `PomodoroSession`
--

CREATE TABLE `PomodoroSession` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `start_time` datetime(3) NOT NULL,
  `end_time` datetime(3) DEFAULT NULL,
  `duration_sec` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `PricingNegotiationLog`
--

CREATE TABLE `PricingNegotiationLog` (
  `id` int(11) NOT NULL,
  `lead_id` int(11) NOT NULL,
  `date` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `details` text DEFAULT NULL,
  `created_by` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `PricingNegotiationLog`
--

INSERT INTO `PricingNegotiationLog` (`id`, `lead_id`, `date`, `details`, `created_by`) VALUES
(1, 5, '2026-03-07 11:28:58.479', 'test', 5),
(2, 23, '2026-03-21 07:46:52.501', 'testing', 5);

-- --------------------------------------------------------

--
-- Table structure for table `Privilege`
--

CREATE TABLE `Privilege` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `module_name` varchar(191) NOT NULL,
  `can_add` tinyint(1) NOT NULL DEFAULT 0,
  `can_edit` tinyint(1) NOT NULL DEFAULT 0,
  `can_delete` tinyint(1) NOT NULL DEFAULT 0,
  `can_view` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Privilege`
--

INSERT INTO `Privilege` (`id`, `user_id`, `module_name`, `can_add`, `can_edit`, `can_delete`, `can_view`) VALUES
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
(20, 2, 'PrivilegeMaster', 0, 0, 0, 0),
(21, 4, 'Leads', 1, 1, 1, 1),
(22, 4, 'Masters', 0, 0, 0, 0),
(23, 4, 'UserMaster', 1, 1, 1, 1),
(24, 4, 'PrivilegeMaster', 0, 0, 0, 0),
(25, 4, 'Calls', 1, 1, 1, 1),
(26, 4, 'Reports', 1, 1, 1, 1),
(27, 5, 'Leads', 1, 1, 1, 1),
(28, 5, 'Masters', 0, 0, 0, 0),
(29, 5, 'UserMaster', 0, 0, 0, 0),
(30, 5, 'PrivilegeMaster', 0, 0, 0, 0),
(31, 5, 'Calls', 1, 1, 1, 1),
(32, 5, 'Reports', 1, 1, 1, 1),
(33, 6, 'Leads', 1, 1, 1, 1),
(34, 6, 'Masters', 0, 0, 0, 0),
(35, 6, 'UserMaster', 1, 1, 1, 1),
(36, 6, 'PrivilegeMaster', 0, 0, 0, 0),
(37, 6, 'Calls', 1, 1, 1, 1),
(38, 6, 'Reports', 1, 1, 1, 1),
(39, 7, 'Leads', 1, 1, 1, 1),
(40, 7, 'Masters', 0, 0, 0, 0),
(41, 7, 'UserMaster', 1, 1, 1, 1),
(42, 7, 'PrivilegeMaster', 0, 0, 0, 0),
(43, 7, 'Calls', 1, 1, 1, 1),
(44, 7, 'Reports', 1, 1, 1, 1),
(45, 15, 'Leads', 1, 1, 1, 1),
(46, 15, 'Masters', 0, 0, 0, 0),
(47, 15, 'UserMaster', 0, 0, 0, 0),
(48, 15, 'PrivilegeMaster', 0, 0, 0, 0),
(49, 15, 'Calls', 1, 1, 1, 1),
(50, 15, 'Reports', 0, 0, 0, 1),
(51, 14, 'Leads', 1, 1, 1, 1),
(52, 14, 'Masters', 0, 0, 0, 0),
(53, 14, 'UserMaster', 0, 0, 0, 0),
(54, 14, 'PrivilegeMaster', 0, 0, 0, 0),
(55, 14, 'Calls', 1, 1, 1, 1),
(56, 14, 'Reports', 0, 0, 0, 1),
(57, 13, 'Leads', 1, 1, 0, 1),
(58, 13, 'Masters', 0, 0, 0, 0),
(59, 13, 'UserMaster', 0, 0, 0, 0),
(60, 13, 'PrivilegeMaster', 0, 0, 0, 0),
(61, 13, 'Calls', 1, 1, 1, 1),
(62, 13, 'Reports', 0, 0, 0, 1),
(63, 12, 'Leads', 1, 1, 1, 1),
(64, 12, 'Masters', 0, 0, 0, 0),
(65, 12, 'UserMaster', 0, 0, 0, 0),
(66, 12, 'PrivilegeMaster', 0, 0, 0, 0),
(67, 12, 'Calls', 1, 1, 1, 1),
(68, 12, 'Reports', 0, 0, 0, 1),
(69, 11, 'Leads', 1, 1, 1, 1),
(70, 11, 'Masters', 0, 0, 0, 0),
(71, 11, 'UserMaster', 0, 0, 0, 0),
(72, 11, 'PrivilegeMaster', 0, 0, 0, 0),
(73, 11, 'Calls', 1, 1, 1, 1),
(74, 11, 'Reports', 0, 0, 0, 1),
(75, 10, 'Leads', 1, 1, 1, 1),
(76, 10, 'Masters', 0, 0, 0, 0),
(77, 10, 'UserMaster', 0, 0, 0, 0),
(78, 10, 'PrivilegeMaster', 0, 0, 0, 0),
(79, 10, 'Calls', 1, 1, 1, 1),
(80, 10, 'Reports', 0, 0, 0, 1),
(81, 9, 'Leads', 1, 1, 1, 1),
(82, 9, 'Masters', 1, 1, 1, 1),
(83, 9, 'UserMaster', 1, 1, 1, 1),
(84, 9, 'PrivilegeMaster', 1, 1, 1, 1),
(85, 9, 'Calls', 1, 1, 1, 1),
(86, 9, 'Reports', 0, 0, 0, 1),
(87, 8, 'Leads', 1, 1, 1, 1),
(88, 8, 'Masters', 1, 1, 1, 1),
(89, 8, 'UserMaster', 1, 1, 1, 1),
(90, 8, 'PrivilegeMaster', 1, 1, 1, 1),
(91, 8, 'Calls', 1, 1, 1, 1),
(92, 8, 'Reports', 0, 0, 0, 1),
(93, 1, 'UserMaster', 0, 0, 0, 0),
(94, 1, 'PrivilegeMaster', 0, 0, 0, 0),
(95, 16, 'Leads', 1, 1, 1, 1),
(96, 16, 'Masters', 0, 0, 0, 0),
(97, 16, 'UserMaster', 1, 1, 1, 1),
(98, 16, 'PrivilegeMaster', 1, 1, 1, 1),
(99, 16, 'Calls', 1, 1, 1, 1),
(100, 16, 'Reports', 1, 1, 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `Product`
--

CREATE TABLE `Product` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `count_type` varchar(191) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `q4_to_q3_days` int(11) NOT NULL DEFAULT 0,
  `q3_to_q2_days` int(11) NOT NULL DEFAULT 0,
  `q2_to_q1_days` int(11) NOT NULL DEFAULT 0,
  `q1_to_nurturing_days` int(11) NOT NULL DEFAULT 0,
  `device_q4_multiplier` double NOT NULL DEFAULT 1,
  `device_q3_multiplier` double NOT NULL DEFAULT 1,
  `device_q2_multiplier` double NOT NULL DEFAULT 1,
  `device_q1_multiplier` double NOT NULL DEFAULT 1,
  `lead_q4_multiplier` double NOT NULL DEFAULT 1,
  `lead_q3_multiplier` double NOT NULL DEFAULT 1,
  `lead_q2_multiplier` double NOT NULL DEFAULT 1,
  `lead_q1_multiplier` double NOT NULL DEFAULT 1,
  `lead_multiplier_count` double NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Product`
--

INSERT INTO `Product` (`id`, `name`, `count_type`, `is_active`, `q4_to_q3_days`, `q3_to_q2_days`, `q2_to_q1_days`, `q1_to_nurturing_days`, `device_q4_multiplier`, `device_q3_multiplier`, `device_q2_multiplier`, `device_q1_multiplier`, `lead_q4_multiplier`, `lead_q3_multiplier`, `lead_q2_multiplier`, `lead_q1_multiplier`, `lead_multiplier_count`) VALUES
(1, 'Time Check', 'No. of Employees', 1, 14, 14, 14, 21, 1, 1, 1, 1, 3, 6, 12, 16, 1),
(2, 'Aura', 'No. of Location', 1, 21, 14, 14, 30, 1, 1, 1, 1, 3, 6, 12, 16, 1),
(3, 'Vendora', 'No. of Vendors', 1, 21, 21, 21, 30, 1, 1, 1, 1, 3, 6, 12, 16, 1),
(4, 'FMS', 'No. of Devices', 1, 14, 14, 14, 21, 4, 6, 8, 10, 3, 6, 12, 16, 1),
(5, 'tSense', 'No. of Device', 1, 21, 21, 21, 30, 4, 6, 8, 10, 3, 6, 12, 16, 1),
(6, 'iWay', 'No. of Licence', 1, 14, 14, 14, 21, 4, 6, 8, 10, 3, 6, 12, 16, 1),
(7, 'test', 'testing', 0, 5, 10, 15, 20, 10, 5, 3, 5, 6, 7, 7, 6, 1),
(8, 'EIT Services', 'No. of days', 1, 21, 14, 14, 17, 1, 1, 1, 1, 3, 6, 12, 16, 1),
(9, 'IM Services', 'No. of days', 1, 14, 14, 14, 21, 1, 1, 1, 1, 3, 6, 12, 16, 1);

-- --------------------------------------------------------

--
-- Table structure for table `SalesStage`
--

CREATE TABLE `SalesStage` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `SalesStage`
--

INSERT INTO `SalesStage` (`id`, `name`, `is_active`) VALUES
(1, 'Q1', 1),
(2, 'Q2', 1),
(3, 'Q3', 1),
(4, 'Q4', 1),
(5, 'Order Won', 1),
(6, 'Order Lost', 1),
(7, 'Nurturing', 1);

-- --------------------------------------------------------

--
-- Table structure for table `SBU`
--

CREATE TABLE `SBU` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `company_id` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `SBU`
--

INSERT INTO `SBU` (`id`, `name`, `company_id`, `is_active`) VALUES
(1, 'BDE Coimbartore', 1, 1),
(2, 'BDE Chennai', 1, 1),
(3, 'Head Office', 1, 1),
(4, 'Offshore', 1, 1),
(5, 'BDE Coimbatore', 2, 1),
(6, 'Head Office', 2, 1),
(7, 'BDE Chennai', 2, 1),
(8, 'IM SBU', 1, 1),
(9, 'EIT SBU', 1, 1),
(10, 'Admin', 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `SourceOfDB`
--

CREATE TABLE `SourceOfDB` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `SourceOfDB`
--

INSERT INTO `SourceOfDB` (`id`, `name`, `is_active`) VALUES
(1, 'Online', 1),
(2, 'Exhibition', 1),
(3, 'Trade show', 1),
(4, 'Seminar', 1),
(5, 'Association', 1),
(6, 'Tools (Linkedin,Apollo.ai)', 1);

-- --------------------------------------------------------

--
-- Table structure for table `State`
--

CREATE TABLE `State` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `country_id` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `State`
--

INSERT INTO `State` (`id`, `name`, `country_id`, `is_active`) VALUES
(1, 'California', 2, 1),
(2, 'Maharashtra', 1, 1),
(3, 'Tamil Nadu', 1, 1),
(4, 'Kerala', 1, 1),
(5, 'Karnataka', 1, 1),
(6, 'Andhra Pradesh', 1, 1),
(7, 'Telangana', 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `SwatKeyClosure`
--

CREATE TABLE `SwatKeyClosure` (
  `id` int(11) NOT NULL,
  `swat_performance_id` int(11) NOT NULL,
  `closure_text` text NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SwatPerformance`
--

CREATE TABLE `SwatPerformance` (
  `id` int(11) NOT NULL,
  `bde_name` varchar(191) NOT NULL,
  `date` date NOT NULL,
  `calls_target` int(11) NOT NULL DEFAULT 0,
  `calls_achieved` int(11) NOT NULL DEFAULT 0,
  `calls_remarks` text DEFAULT NULL,
  `activities_target` int(11) NOT NULL DEFAULT 0,
  `activities_achieved` int(11) NOT NULL DEFAULT 0,
  `activities_remarks` text DEFAULT NULL,
  `q1_lead_gen_target` int(11) NOT NULL DEFAULT 0,
  `q1_lead_gen_achieved` int(11) NOT NULL DEFAULT 0,
  `q1_lead_gen_remarks` text DEFAULT NULL,
  `q1_to_q2` int(11) NOT NULL DEFAULT 0,
  `q2_to_q3` int(11) NOT NULL DEFAULT 0,
  `q3_to_q4` int(11) NOT NULL DEFAULT 0,
  `q4_to_order` int(11) NOT NULL DEFAULT 0,
  `q4_to_q3` int(11) NOT NULL DEFAULT 0,
  `q3_to_q2` int(11) NOT NULL DEFAULT 0,
  `q2_to_q1` int(11) NOT NULL DEFAULT 0,
  `any_to_nurturing` int(11) NOT NULL DEFAULT 0,
  `linkedin_target` int(11) NOT NULL DEFAULT 0,
  `linkedin_achieved` int(11) NOT NULL DEFAULT 0,
  `linkedin_remarks` text DEFAULT NULL,
  `demos_target` int(11) NOT NULL DEFAULT 0,
  `demos_achieved` int(11) NOT NULL DEFAULT 0,
  `demos_remarks` text DEFAULT NULL,
  `proposals_target` int(11) NOT NULL DEFAULT 0,
  `proposals_achieved` int(11) NOT NULL DEFAULT 0,
  `proposals_remarks` text DEFAULT NULL,
  `direct_visit_target` int(11) NOT NULL DEFAULT 0,
  `direct_visit_achieved` int(11) NOT NULL DEFAULT 0,
  `direct_visit_remarks` text DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `performance_percentage` double NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `service_department` varchar(191) DEFAULT NULL,
  `revenue_collected_achieved` int(11) NOT NULL DEFAULT 0,
  `revenue_collected_remarks` text DEFAULT NULL,
  `revenue_collected_target` int(11) NOT NULL DEFAULT 0,
  `sales_order_won_achieved` int(11) NOT NULL DEFAULT 0,
  `sales_order_won_remarks` text DEFAULT NULL,
  `sales_order_won_target` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `SwatPerformance`
--

INSERT INTO `SwatPerformance` (`id`, `bde_name`, `date`, `calls_target`, `calls_achieved`, `calls_remarks`, `activities_target`, `activities_achieved`, `activities_remarks`, `q1_lead_gen_target`, `q1_lead_gen_achieved`, `q1_lead_gen_remarks`, `q1_to_q2`, `q2_to_q3`, `q3_to_q4`, `q4_to_order`, `q4_to_q3`, `q3_to_q2`, `q2_to_q1`, `any_to_nurturing`, `linkedin_target`, `linkedin_achieved`, `linkedin_remarks`, `demos_target`, `demos_achieved`, `demos_remarks`, `proposals_target`, `proposals_achieved`, `proposals_remarks`, `direct_visit_target`, `direct_visit_achieved`, `direct_visit_remarks`, `user_id`, `product_id`, `performance_percentage`, `created_at`, `updated_at`, `service_department`, `revenue_collected_achieved`, `revenue_collected_remarks`, `revenue_collected_target`, `sales_order_won_achieved`, `sales_order_won_remarks`, `sales_order_won_target`) VALUES
(1, 'boopathi r', '2026-03-19', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 5, 1, 0, '2026-03-19 12:49:05.178', '2026-03-19 12:49:05.178', NULL, 0, NULL, 0, 0, NULL, 0),
(2, 'boopathi r', '2026-03-19', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 5, NULL, 0, '2026-03-19 12:54:43.314', '2026-03-19 12:54:43.314', NULL, 0, NULL, 0, 0, NULL, 0),
(3, 'boopathi r', '2026-03-19', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 5, NULL, 0, '2026-03-19 12:54:45.574', '2026-03-19 12:54:45.574', NULL, 0, NULL, 0, 0, NULL, 0),
(4, 'boopathi r', '2026-03-19', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 5, NULL, 0, '2026-03-19 12:55:31.859', '2026-03-19 12:55:31.859', NULL, 0, NULL, 0, 0, NULL, 0),
(5, 'boopathi r', '2026-03-19', 0, 1, NULL, 0, 1, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 5, NULL, 0, '2026-03-19 12:55:33.432', '2026-03-19 12:55:33.432', NULL, 0, NULL, 0, 0, NULL, 0),
(6, 'boopathi r', '2026-03-19', 0, 1, NULL, 0, 1, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 5, NULL, 0, '2026-03-19 15:20:00.459', '2026-03-19 15:20:00.459', NULL, 0, NULL, 0, 0, NULL, 0),
(7, 'boopathi r', '2026-03-19', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 5, NULL, 0, '2026-03-19 15:20:02.440', '2026-03-19 15:20:02.440', NULL, 0, NULL, 0, 0, NULL, 0),
(8, 'Rukshana A', '2026-03-19', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 13, NULL, 0, '2026-03-19 23:55:00.206', '2026-03-19 23:55:00.206', 'IM Services', 0, NULL, 0, 0, NULL, 0),
(9, 'Admin', '2026-03-20', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 1, 0, '2026-03-20 10:22:37.258', '2026-03-20 10:22:37.258', NULL, 0, NULL, 0, 0, NULL, 0),
(10, 'Admin', '2026-03-20', 0, 0, NULL, 0, 0, NULL, 0, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 3, 0, '2026-03-20 11:34:40.120', '2026-03-20 11:34:40.120', NULL, 0, NULL, 0, 0, NULL, 0),
(11, 'Rukshana A', '2026-03-20', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 13, NULL, 0, '2026-03-20 23:55:00.095', '2026-03-20 23:55:00.095', 'IM Services', 0, NULL, 0, 0, NULL, 0),
(12, 'Admin', '2026-03-21', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 1, 0, '2026-03-21 08:17:38.268', '2026-03-21 08:17:38.268', NULL, 0, NULL, 0, 0, NULL, 0),
(13, 'Admin', '2026-03-21', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 2, 0, '2026-03-21 08:18:15.455', '2026-03-21 08:18:15.455', NULL, 0, NULL, 0, 0, NULL, 0),
(14, 'Admin', '2026-03-21', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 3, 0, '2026-03-21 08:18:22.547', '2026-03-21 08:18:22.547', NULL, 0, NULL, 0, 0, NULL, 0),
(15, 'Admin', '2026-03-21', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 4, 0, '2026-03-21 09:05:09.240', '2026-03-21 09:05:09.240', NULL, 0, NULL, 0, 0, NULL, 0),
(16, 'Admin', '2026-03-21', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, NULL, 0, '2026-03-21 09:05:18.398', '2026-03-21 09:05:18.398', NULL, 0, NULL, 0, 0, NULL, 0),
(17, 'Admin', '2026-03-21', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, NULL, 0, '2026-03-21 09:05:24.753', '2026-03-21 09:05:24.753', NULL, 0, NULL, 0, 0, NULL, 0),
(18, 'Rukshana A', '2026-03-21', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 13, NULL, 0, '2026-03-21 23:55:00.168', '2026-03-21 23:55:00.168', 'IM Services', 0, NULL, 0, 0, NULL, 0),
(19, 'Rukshana A', '2026-03-22', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 13, NULL, 0, '2026-03-22 23:55:00.282', '2026-03-22 23:55:00.282', 'IM Services', 0, NULL, 0, 0, NULL, 0),
(20, 'Admin', '2026-03-23', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, NULL, 0, 2, NULL, 0, 2, NULL, 0, 2, NULL, 1, 1, 0, '2026-03-23 10:09:54.536', '2026-03-23 10:10:38.827', NULL, 1000000, NULL, 0, 10000000, NULL, 0),
(21, 'Rukshana A', '2026-03-23', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 13, NULL, 0, '2026-03-23 23:55:00.244', '2026-03-23 23:55:00.244', 'IM Services', 0, NULL, 0, 0, NULL, 0),
(22, 'Admin', '2026-03-24', 0, 1, NULL, 0, 1, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 1, 0, '2026-03-24 09:29:58.497', '2026-03-24 09:29:58.497', NULL, 0, NULL, 0, 0, NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `SwatPerformance_old`
--

CREATE TABLE `SwatPerformance_old` (
  `id` int(11) NOT NULL,
  `bde_name` varchar(191) NOT NULL,
  `date` date NOT NULL,
  `calls_target` int(11) NOT NULL DEFAULT 0,
  `calls_achieved` int(11) NOT NULL DEFAULT 0,
  `calls_remarks` text DEFAULT NULL,
  `activities_target` int(11) NOT NULL DEFAULT 0,
  `activities_achieved` int(11) NOT NULL DEFAULT 0,
  `activities_remarks` text DEFAULT NULL,
  `q1_lead_gen_target` int(11) NOT NULL DEFAULT 0,
  `q1_lead_gen_achieved` int(11) NOT NULL DEFAULT 0,
  `q1_lead_gen_remarks` text DEFAULT NULL,
  `q1_to_q2` int(11) NOT NULL DEFAULT 0,
  `q2_to_q3` int(11) NOT NULL DEFAULT 0,
  `q3_to_q4` int(11) NOT NULL DEFAULT 0,
  `q4_to_order` int(11) NOT NULL DEFAULT 0,
  `q4_to_q3` int(11) NOT NULL DEFAULT 0,
  `q3_to_q2` int(11) NOT NULL DEFAULT 0,
  `q2_to_q1` int(11) NOT NULL DEFAULT 0,
  `any_to_nurturing` int(11) NOT NULL DEFAULT 0,
  `visits_target` int(11) NOT NULL DEFAULT 0,
  `visits_achieved` int(11) NOT NULL DEFAULT 0,
  `visits_remarks` text DEFAULT NULL,
  `linkedin_target` int(11) NOT NULL DEFAULT 0,
  `linkedin_achieved` int(11) NOT NULL DEFAULT 0,
  `linkedin_remarks` text DEFAULT NULL,
  `demos_target` int(11) NOT NULL DEFAULT 0,
  `demos_achieved` int(11) NOT NULL DEFAULT 0,
  `demos_remarks` text DEFAULT NULL,
  `proposals_target` int(11) NOT NULL DEFAULT 0,
  `proposals_achieved` int(11) NOT NULL DEFAULT 0,
  `proposals_remarks` text DEFAULT NULL,
  `direct_visit_target` int(11) NOT NULL DEFAULT 0,
  `direct_visit_achieved` int(11) NOT NULL DEFAULT 0,
  `direct_visit_remarks` text DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `performance_percentage` double NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `SwatPerformance_old`
--

INSERT INTO `SwatPerformance_old` (`id`, `bde_name`, `date`, `calls_target`, `calls_achieved`, `calls_remarks`, `activities_target`, `activities_achieved`, `activities_remarks`, `q1_lead_gen_target`, `q1_lead_gen_achieved`, `q1_lead_gen_remarks`, `q1_to_q2`, `q2_to_q3`, `q3_to_q4`, `q4_to_order`, `q4_to_q3`, `q3_to_q2`, `q2_to_q1`, `any_to_nurturing`, `visits_target`, `visits_achieved`, `visits_remarks`, `linkedin_target`, `linkedin_achieved`, `linkedin_remarks`, `demos_target`, `demos_achieved`, `demos_remarks`, `proposals_target`, `proposals_achieved`, `proposals_remarks`, `direct_visit_target`, `direct_visit_achieved`, `direct_visit_remarks`, `user_id`, `product_id`, `performance_percentage`, `created_at`, `updated_at`) VALUES
(1, 'John CEO', '2026-02-23', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 1, 0, '2026-02-24 11:25:48.661', '2026-02-24 11:25:48.661'),
(2, 'John CEO', '2026-02-23', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 2, 0, '2026-02-24 11:25:51.380', '2026-02-24 11:25:51.380'),
(3, 'Sales Person One', '2026-02-23', 15, 0, NULL, 25, 0, NULL, 3, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, NULL, 10, 0, NULL, 0, 0, NULL, 0, 0, NULL, 2, 0, NULL, 3, 1, 0, '2026-02-24 11:46:43.835', '2026-02-24 11:46:43.835'),
(8, 'Sales Person One', '2026-02-23', 0, 1, NULL, 0, 1, NULL, 0, 0, NULL, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 1, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 3, 2, 0, '2026-02-24 11:50:19.730', '2026-02-24 11:50:19.730'),
(9, 'John CEO', '2026-02-24', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 1, 0, '2026-02-25 11:11:13.330', '2026-02-25 11:11:13.330'),
(10, 'John CEO', '2026-02-25', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 1, 0, '2026-02-26 09:33:48.616', '2026-02-26 09:33:48.616'),
(11, 'John CEO', '2026-02-25', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 2, 0, '2026-02-26 09:34:06.461', '2026-02-26 09:34:06.461'),
(12, 'John CEO', '2026-02-26', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 1, 0, '2026-02-27 11:21:42.501', '2026-02-27 11:21:42.501'),
(13, 'John CEO', '2026-02-26', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 2, 0, '2026-02-27 11:21:45.846', '2026-02-27 11:21:45.846'),
(17, 'Manager One', '2026-02-26', 0, 0, NULL, 0, 0, NULL, 8, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 35, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 2, 1, 0, '2026-02-27 11:26:08.972', '2026-02-27 11:26:08.972'),
(18, 'Manager One', '2026-02-26', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 2, 2, 0, '2026-02-27 11:26:12.594', '2026-02-27 11:26:12.594'),
(19, 'John CEO', '2026-03-02', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 1, 0, '2026-03-03 09:18:02.194', '2026-03-03 09:18:02.194'),
(20, 'John CEO', '2026-03-02', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 2, 0, '2026-03-03 09:18:07.875', '2026-03-03 09:18:07.875'),
(21, 'Manager One', '2026-03-02', 0, 0, NULL, 0, 0, NULL, 8, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 35, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 9, 0, NULL, 2, 1, 0, '2026-03-03 09:29:44.703', '2026-03-03 09:29:44.703'),
(23, 'Manager One', '2026-03-02', 5, 0, NULL, 10, 0, NULL, 1, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, NULL, 5, 0, NULL, 0, 0, NULL, 0, 0, NULL, 7, 0, NULL, 2, 2, 0, '2026-03-03 09:31:00.042', '2026-03-03 09:31:00.042'),
(24, 'Manager One', '2026-03-04', 0, 1, NULL, 8, 1, NULL, 8, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 35, 0, NULL, 0, 1, NULL, 0, 0, NULL, 0, 0, NULL, 9, 0, NULL, 2, 1, 0, '2026-03-05 10:22:08.714', '2026-03-05 10:22:08.714'),
(27, 'John CEO', '2026-03-04', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 1, 0, '2026-03-05 10:39:02.343', '2026-03-05 10:39:02.343'),
(28, 'Manager One', '2026-03-04', 20, 1, NULL, 15, 1, NULL, 15, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 35, 0, NULL, 5, 1, NULL, 0, 0, NULL, 0, 0, NULL, 3, 0, NULL, 2, 2, 0, '2026-03-05 10:39:13.538', '2026-03-05 10:39:13.538'),
(48, 'John CEO', '2026-03-04', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 3, 0, '2026-03-05 11:44:26.074', '2026-03-05 11:44:26.074'),
(67, 'boopathi r', '2026-03-05', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 5, 1, 0, '2026-03-06 10:28:25.465', '2026-03-06 10:28:25.465'),
(68, 'boopathi r', '2026-03-05', 0, 1, NULL, 0, 2, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 1, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 5, 3, 0, '2026-03-06 10:28:30.657', '2026-03-06 10:28:30.657'),
(69, 'Admin', '2026-03-12', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 1, 0, '2026-03-12 11:59:08.759', '2026-03-12 11:59:08.759'),
(70, 'Admin', '2026-03-12', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 8, 0, '2026-03-12 11:59:16.852', '2026-03-12 11:59:16.852'),
(71, 'Admin', '2026-03-12', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 9, 0, '2026-03-12 11:59:19.615', '2026-03-12 11:59:19.615'),
(72, 'Admin', '2026-03-18', 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 0, 0, NULL, 1, 1, 0, '2026-03-18 09:36:58.250', '2026-03-18 09:36:58.250');

-- --------------------------------------------------------

--
-- Table structure for table `User`
--

CREATE TABLE `User` (
  `id` int(11) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password_hash` varchar(191) NOT NULL,
  `first_name` varchar(191) NOT NULL,
  `last_name` varchar(191) DEFAULT NULL,
  `role` enum('CEO','SalesManager','SalesPerson') NOT NULL DEFAULT 'SalesPerson',
  `status` enum('INVITED','ACTIVE','INACTIVE') NOT NULL DEFAULT 'INVITED',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `joining_date` datetime(3) DEFAULT NULL,
  `revenue_target` int(11) DEFAULT 0,
  `device_target` int(11) DEFAULT 0,
  `leads_target` int(11) DEFAULT 0,
  `calls_target` int(11) DEFAULT 0,
  `activities_target` int(11) DEFAULT 0,
  `q1_target` int(11) DEFAULT 0,
  `linkedin_target` int(11) DEFAULT 0,
  `demo_target` int(11) DEFAULT 0,
  `proposal_target` int(11) DEFAULT 0,
  `direct_visit_target` int(11) DEFAULT 0,
  `company_id` int(11) DEFAULT NULL,
  `sbu_id` int(11) DEFAULT NULL,
  `reporting_manager_id` int(11) DEFAULT NULL,
  `reset_token` varchar(191) DEFAULT NULL,
  `reset_token_expiry` datetime(3) DEFAULT NULL,
  `department_id` int(11) DEFAULT NULL,
  `department` varchar(191) NOT NULL DEFAULT 'IM',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `User`
--

INSERT INTO `User` (`id`, `email`, `password_hash`, `first_name`, `last_name`, `role`, `status`, `is_active`, `joining_date`, `revenue_target`, `device_target`, `leads_target`, `calls_target`, `activities_target`, `q1_target`, `linkedin_target`, `demo_target`, `proposal_target`, `direct_visit_target`, `company_id`, `sbu_id`, `reporting_manager_id`, `reset_token`, `reset_token_expiry`, `department_id`, `department`, `created_at`, `updated_at`) VALUES
(1, 'ceo@crm.com', '$2b$10$loBGq.AG8vLs8B8pPI7Doe9sLvoU2W7tW3TdQNUhPv87tR8Bnkesq', 'Admin', NULL, 'CEO', 'ACTIVE', 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, NULL, NULL, NULL, NULL, NULL, 'IM', '2026-02-24 11:19:01.303', '2026-02-24 11:42:57.493'),
(5, 'boopathi.r@angleritech.com', '$2b$10$h9lmwXkNG3LhgWeJIeRtKOHQDyP8qJQIaeZrRLEOPsQ6nEaZp7k4S', 'boopathi', 'r', 'SalesManager', 'ACTIVE', 1, '2026-03-06 09:47:39.937', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 7, NULL, NULL, NULL, '', '2026-03-06 09:47:39.939', '2026-03-13 06:23:41.616'),
(6, 'simsone@angleritech.com', '$2b$10$loBGq.AG8vLs8B8pPI7Doe9sLvoU2W7tW3TdQNUhPv87tR8Bnkesq', 'simsone', 'j', 'SalesManager', 'ACTIVE', 1, '2026-03-06 09:53:27.445', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 6, 1, '69c9cb43d2ee614f5e39a46c6a1c050aeb3be6d59732eee3f3b77fe1d185d118', '2026-03-19 16:19:07.182', NULL, '', '2026-03-06 09:53:27.448', '2026-03-19 15:19:07.183'),
(8, 'jayanthra@angleritech.com', '$2b$10$R0Znveb1BDzgsNQAEz5oiepsdxAysF.lJJcor6IUff/mm2m9dhV6G', 'Jayanthra', 'J', 'CEO', 'ACTIVE', 1, '2026-03-12 11:11:39.206', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, NULL, '7caed5464adfa9d50cd27d6a8142590dc35e467cde63458ebf874d44a87e5f66', '2026-03-13 11:11:39.206', NULL, '', '2026-03-12 11:11:39.207', '2026-03-12 11:23:38.274'),
(9, 'Prashanth@angleritech.com', '$2b$10$d141gtNvyvUiSCtfzGOYAu3HGQDpOAd/PKxseDUr0kUbfrXH2rtQm', 'Jayaprashanth', 'J', 'CEO', 'ACTIVE', 1, '2026-03-12 11:14:02.518', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 6, NULL, '519062994ce80ecd78687732168bd5b5990c9f970ce2218784cef84169339212', '2026-03-13 11:14:02.518', NULL, '', '2026-03-12 11:14:02.521', '2026-03-12 11:23:45.224'),
(10, 'selvam@angleritech.com', '$2b$10$YsvteOwLhk1crjiCNGZB7u5zYvKzd3DS09f9SPoYXAe3meHem9SGG', 'Selvam', 'M', 'SalesManager', 'ACTIVE', 1, '2026-03-12 11:15:35.870', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 8, NULL, NULL, NULL, '', '2026-03-12 11:15:35.871', '2026-03-18 13:06:58.672'),
(11, 'Sathishkumar.S@angleritech.com', '$2b$10$pCK11/zRDOv77yZq/XLs9.fbrYH7Si8KGaaGptFXyCqRwGbgL4wSe', 'Sathishkumar', 'S', 'SalesManager', 'ACTIVE', 1, '2026-03-12 11:16:33.426', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 9, NULL, NULL, NULL, '', '2026-03-12 11:16:33.427', '2026-03-16 11:52:12.129'),
(12, 'jayanthi@angleritech.com', '$2b$10$iMNtOeWdWSUlC0cZjKWdxOO5FcCjjDYvm5ZUznMf/Vas1swgS5wTC', 'Jayanthi', 'A', 'SalesManager', 'ACTIVE', 1, '2026-03-12 11:17:53.592', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, 'f2c66f3795a6c41670872a7a60e8f06bc362669ed0d9e6c2fcb10da38511d4fd', '2026-03-13 11:17:53.592', NULL, '', '2026-03-12 11:17:53.594', '2026-03-12 11:23:52.293'),
(13, 'rukshana@angleritech.com', '$2b$10$n5.fKZwxydNtnsyKnQ8Y3.MSIsmmNADcppbIfa.LOXU0dAEUnpqbK', 'Rukshana', 'A', 'SalesPerson', 'ACTIVE', 1, '2026-03-12 11:18:48.830', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 10, 8, NULL, NULL, NULL, '', '2026-03-12 11:18:48.831', '2026-03-14 07:13:50.140'),
(14, 'radhakrishnank@trinetrawireless.com', '$2b$10$CKEwPvWPTfnxaGaPgvYHTugFn8q9wHdG6QA/CHkB7nLQccZ5LQu5y', 'Radhakrishnan', 'K', 'SalesManager', 'ACTIVE', 1, '2026-03-12 11:19:41.785', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 7, 9, NULL, NULL, NULL, '', '2026-03-12 11:19:41.786', '2026-03-18 10:51:34.012'),
(15, 'sownder.m@trinetrawireless.com', '$2b$10$tgccPk3Q0ZRaW0A.TgPVlupXwH19FNjtQnYOZ79oENF6FzGHsD1QW', 'Sownder', 'M', 'SalesManager', 'ACTIVE', 1, '2026-03-12 11:20:19.690', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 5, 14, NULL, NULL, NULL, '', '2026-03-12 11:20:19.692', '2026-03-14 11:23:57.714'),
(16, 'rajan@trinetrawireless.com', '$2b$10$6ZDll8b2CChAycQ63sO0I.4YxcWwlGfUMsKDK8C08iBdw6q8O/6Ey', 'Rajan', '', 'CEO', 'ACTIVE', 1, '2026-03-13 04:59:49.709', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 6, 9, '51183b0c085da22f9ed825e4f14bc17f35dde42bd37c8a15554844e63743d8f5', '2026-03-19 07:31:12.052', NULL, '', '2026-03-13 04:59:49.711', '2026-03-19 06:31:12.054');

-- --------------------------------------------------------

--
-- Table structure for table `UserProductTarget`
--

CREATE TABLE `UserProductTarget` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `sales_target` int(11) DEFAULT 0,
  `revenue_target` int(11) DEFAULT 0,
  `device_target` int(11) DEFAULT 0,
  `leads_target` int(11) DEFAULT 0,
  `calls_target` int(11) DEFAULT 0,
  `linkedin_target` int(11) DEFAULT 0,
  `direct_visit_target` int(11) DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `days` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `UserProductTarget`
--

INSERT INTO `UserProductTarget` (`id`, `user_id`, `product_id`, `sales_target`, `revenue_target`, `device_target`, `leads_target`, `calls_target`, `linkedin_target`, `direct_visit_target`, `created_at`, `updated_at`, `days`) VALUES
(1, 3, 1, 3, 1, 1, 2, 15, 10, 3, '2026-02-24 11:46:11.430', '2026-02-27 11:40:27.251', 0),
(2, 3, 2, 3, 2, 2, 5, 8, 2, 5, '2026-02-24 11:53:47.589', '2026-02-24 11:54:10.631', 0),
(3, 2, 1, 5, 8, 0, 35, 19, 0, 9, '2026-02-27 11:22:51.545', '2026-03-05 12:05:18.134', 0),
(4, 2, 2, 15, 5, 6, 35, 30, 5, 3, '2026-02-27 12:03:02.477', '2026-03-05 11:44:05.804', 25),
(5, 15, 4, 150000, 150000, 35, 60, 60, 20, 2, '2026-03-12 11:30:33.838', '2026-03-12 11:31:22.969', 22),
(6, 10, 3, 1500000, 1350000, 0, 0, 47, 10, 0, '2026-03-12 11:45:20.845', '2026-03-12 11:45:20.845', 25),
(7, 10, 2, 0, 0, 0, 2, 0, 0, 0, '2026-03-12 11:45:46.699', '2026-03-12 11:45:46.699', 22),
(8, 10, 4, 0, 0, 50, 3, 0, 0, 0, '2026-03-12 11:46:12.835', '2026-03-12 11:46:12.835', 22),
(9, 11, 1, 0, 0, 0, 3, 0, 8, 0, '2026-03-12 11:51:53.562', '2026-03-12 11:51:53.562', 22),
(10, 13, 9, 150000, 150000, 0, 6, 15, 0, 0, '2026-03-12 11:52:48.540', '2026-03-12 11:52:48.540', 22),
(11, 14, 4, 750000, 560000, 150, 19, 20, 15, 1, '2026-03-12 11:53:44.055', '2026-03-12 11:53:44.055', 22),
(12, 14, 5, 0, 0, 50, 1, 0, 0, 0, '2026-03-12 11:54:10.506', '2026-03-12 11:54:10.506', 22),
(13, 12, 8, 441667, 441667, 0, 7, 10, 0, 0, '2026-03-12 11:57:03.552', '2026-03-12 11:57:03.552', 22),
(14, 12, 9, 225000, 225000, 0, 7, 14, 0, 0, '2026-03-12 11:57:39.209', '2026-03-12 11:57:47.611', 22),
(15, 5, 1, 150000, 150000, 5, 4, 60, 20, 3, '2026-03-19 12:52:46.046', '2026-03-19 12:52:46.046', 22);

-- --------------------------------------------------------

--
-- Table structure for table `UserServiceTarget`
--

CREATE TABLE `UserServiceTarget` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `service_department` varchar(191) NOT NULL,
  `sales_target` int(11) DEFAULT 0,
  `revenue_target` int(11) DEFAULT 0,
  `device_target` int(11) DEFAULT 0,
  `leads_target` int(11) DEFAULT 0,
  `calls_target` int(11) DEFAULT 0,
  `linkedin_target` int(11) DEFAULT 0,
  `direct_visit_target` int(11) DEFAULT 0,
  `days` int(11) DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `_CollateralToLead`
--

CREATE TABLE `_CollateralToLead` (
  `A` int(11) NOT NULL,
  `B` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `_CollateralToLead`
--

INSERT INTO `_CollateralToLead` (`A`, `B`) VALUES
(1, 14),
(1, 22),
(1, 23),
(1, 25),
(2, 5),
(2, 12),
(3, 13);

-- --------------------------------------------------------

--
-- Table structure for table `_ManagerCompanies`
--

CREATE TABLE `_ManagerCompanies` (
  `A` int(11) NOT NULL,
  `B` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `_ManagerCompanies`
--

INSERT INTO `_ManagerCompanies` (`A`, `B`) VALUES
(1, 4),
(1, 5),
(1, 7),
(1, 10),
(1, 11),
(1, 12),
(2, 6),
(2, 14),
(2, 15),
(2, 16);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `Activity`
--
ALTER TABLE `Activity`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Activity_name_key` (`name`);

--
-- Indexes for table `ActivityLog`
--
ALTER TABLE `ActivityLog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ActivityLog_user_id_created_at_idx` (`user_id`,`created_at`);

--
-- Indexes for table `Avatar`
--
ALTER TABLE `Avatar`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Avatar_name_key` (`name`);

--
-- Indexes for table `CallActivityLog`
--
ALTER TABLE `CallActivityLog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `CallActivityLog_user_id_action_date_idx` (`user_id`,`action_date`);

--
-- Indexes for table `CallLog`
--
ALTER TABLE `CallLog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `CallLog_lead_id_fkey` (`lead_id`),
  ADD KEY `CallLog_user_id_fkey` (`user_id`);

--
-- Indexes for table `CallStatus`
--
ALTER TABLE `CallStatus`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `CallStatus_name_key` (`name`);

--
-- Indexes for table `CallTracker`
--
ALTER TABLE `CallTracker`
  ADD PRIMARY KEY (`id`),
  ADD KEY `CallTracker_product_id_fkey` (`product_id`),
  ADD KEY `CallTracker_industry_id_fkey` (`industry_id`),
  ADD KEY `CallTracker_source_of_db_id_fkey` (`source_of_db_id`),
  ADD KEY `CallTracker_email_status_id_fkey` (`email_status_id`),
  ADD KEY `CallTracker_call_status_id_fkey` (`call_status_id`),
  ADD KEY `CallTracker_user_id_fkey` (`user_id`),
  ADD KEY `CallTracker_eit_service_id_fkey` (`eit_service_id`),
  ADD KEY `CallTracker_im_service_id_fkey` (`im_service_id`);

--
-- Indexes for table `CallTracker_old`
--
ALTER TABLE `CallTracker_old`
  ADD PRIMARY KEY (`id`),
  ADD KEY `CallTracker_product_id_fkey` (`product_id`),
  ADD KEY `CallTracker_industry_id_fkey` (`industry_id`),
  ADD KEY `CallTracker_source_of_db_id_fkey` (`source_of_db_id`),
  ADD KEY `CallTracker_email_status_id_fkey` (`email_status_id`),
  ADD KEY `CallTracker_call_status_id_fkey` (`call_status_id`),
  ADD KEY `CallTracker_user_id_fkey` (`user_id`);

--
-- Indexes for table `City`
--
ALTER TABLE `City`
  ADD PRIMARY KEY (`id`),
  ADD KEY `City_state_id_fkey` (`state_id`);

--
-- Indexes for table `Collateral`
--
ALTER TABLE `Collateral`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Collateral_name_key` (`name`);

--
-- Indexes for table `Company`
--
ALTER TABLE `Company`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Company_name_key` (`name`);

--
-- Indexes for table `Country`
--
ALTER TABLE `Country`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Country_name_key` (`name`);

--
-- Indexes for table `Department`
--
ALTER TABLE `Department`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Department_name_key` (`name`);

--
-- Indexes for table `EitService`
--
ALTER TABLE `EitService`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `EitService_name_key` (`name`);

--
-- Indexes for table `EmailStatus`
--
ALTER TABLE `EmailStatus`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `EmailStatus_name_key` (`name`);

--
-- Indexes for table `FollowUpLog`
--
ALTER TABLE `FollowUpLog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FollowUpLog_lead_id_fkey` (`lead_id`),
  ADD KEY `FollowUpLog_activity_id_fkey` (`activity_id`),
  ADD KEY `FollowUpLog_created_by_id_fkey` (`created_by_id`);

--
-- Indexes for table `ImService`
--
ALTER TABLE `ImService`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ImService_name_key` (`name`);

--
-- Indexes for table `Industry`
--
ALTER TABLE `Industry`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Industry_name_key` (`name`);

--
-- Indexes for table `JobTitle`
--
ALTER TABLE `JobTitle`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `JobTitle_name_key` (`name`);

--
-- Indexes for table `KraEntry`
--
ALTER TABLE `KraEntry`
  ADD PRIMARY KEY (`id`),
  ADD KEY `KraEntry_user_id_fkey` (`user_id`);

--
-- Indexes for table `Lead`
--
ALTER TABLE `Lead`
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
-- Indexes for table `LeadContact`
--
ALTER TABLE `LeadContact`
  ADD PRIMARY KEY (`id`),
  ADD KEY `LeadContact_lead_id_fkey` (`lead_id`),
  ADD KEY `LeadContact_avatar_id_fkey` (`avatar_id`),
  ADD KEY `LeadContact_persona_id_fkey` (`persona_id`);

--
-- Indexes for table `LeadDocument`
--
ALTER TABLE `LeadDocument`
  ADD PRIMARY KEY (`id`),
  ADD KEY `LeadDocument_lead_id_fkey` (`lead_id`),
  ADD KEY `LeadDocument_follow_up_log_id_fkey` (`follow_up_log_id`);

--
-- Indexes for table `LeadQuadrantHistory`
--
ALTER TABLE `LeadQuadrantHistory`
  ADD PRIMARY KEY (`id`),
  ADD KEY `LeadQuadrantHistory_user_id_moved_at_idx` (`user_id`,`moved_at`),
  ADD KEY `LeadQuadrantHistory_old_quadrant_new_quadrant_idx` (`old_quadrant`,`new_quadrant`),
  ADD KEY `LeadQuadrantHistory_lead_id_fkey` (`lead_id`);

--
-- Indexes for table `LeadScore`
--
ALTER TABLE `LeadScore`
  ADD PRIMARY KEY (`id`),
  ADD KEY `LeadScore_lead_id_fkey` (`lead_id`);

--
-- Indexes for table `LeadSource`
--
ALTER TABLE `LeadSource`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `LeadSource_name_key` (`name`);

--
-- Indexes for table `Persona`
--
ALTER TABLE `Persona`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Persona_product_id_fkey` (`product_id`),
  ADD KEY `Persona_eit_service_id_fkey` (`eit_service_id`),
  ADD KEY `Persona_im_service_id_fkey` (`im_service_id`);

--
-- Indexes for table `PomodoroSession`
--
ALTER TABLE `PomodoroSession`
  ADD PRIMARY KEY (`id`),
  ADD KEY `PomodoroSession_user_id_fkey` (`user_id`);

--
-- Indexes for table `PricingNegotiationLog`
--
ALTER TABLE `PricingNegotiationLog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `PricingNegotiationLog_lead_id_fkey` (`lead_id`),
  ADD KEY `PricingNegotiationLog_created_by_fkey` (`created_by`);

--
-- Indexes for table `Privilege`
--
ALTER TABLE `Privilege`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Privilege_user_id_module_name_key` (`user_id`,`module_name`);

--
-- Indexes for table `Product`
--
ALTER TABLE `Product`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Product_name_key` (`name`);

--
-- Indexes for table `SalesStage`
--
ALTER TABLE `SalesStage`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `SalesStage_name_key` (`name`);

--
-- Indexes for table `SBU`
--
ALTER TABLE `SBU`
  ADD PRIMARY KEY (`id`),
  ADD KEY `SBU_company_id_fkey` (`company_id`);

--
-- Indexes for table `SourceOfDB`
--
ALTER TABLE `SourceOfDB`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `SourceOfDB_name_key` (`name`);

--
-- Indexes for table `State`
--
ALTER TABLE `State`
  ADD PRIMARY KEY (`id`),
  ADD KEY `State_country_id_fkey` (`country_id`);

--
-- Indexes for table `SwatKeyClosure`
--
ALTER TABLE `SwatKeyClosure`
  ADD PRIMARY KEY (`id`),
  ADD KEY `SwatKeyClosure_swat_performance_id_fkey` (`swat_performance_id`);

--
-- Indexes for table `SwatPerformance`
--
ALTER TABLE `SwatPerformance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `SwatPerformance_user_id_date_product_id_service_department_key` (`user_id`,`date`,`product_id`,`service_department`),
  ADD KEY `SwatPerformance_product_id_fkey` (`product_id`);

--
-- Indexes for table `SwatPerformance_old`
--
ALTER TABLE `SwatPerformance_old`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `SwatPerformance_user_id_date_product_id_key` (`user_id`,`date`,`product_id`),
  ADD KEY `SwatPerformance_product_id_fkey` (`product_id`);

--
-- Indexes for table `User`
--
ALTER TABLE `User`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `User_email_key` (`email`),
  ADD KEY `User_company_id_fkey` (`company_id`),
  ADD KEY `User_sbu_id_fkey` (`sbu_id`),
  ADD KEY `User_reporting_manager_id_fkey` (`reporting_manager_id`),
  ADD KEY `User_department_id_fkey` (`department_id`);

--
-- Indexes for table `UserProductTarget`
--
ALTER TABLE `UserProductTarget`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `UserProductTarget_user_id_product_id_key` (`user_id`,`product_id`),
  ADD KEY `UserProductTarget_product_id_fkey` (`product_id`);

--
-- Indexes for table `UserServiceTarget`
--
ALTER TABLE `UserServiceTarget`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `UserServiceTarget_user_id_service_department_key` (`user_id`,`service_department`);

--
-- Indexes for table `_CollateralToLead`
--
ALTER TABLE `_CollateralToLead`
  ADD UNIQUE KEY `_CollateralToLead_AB_unique` (`A`,`B`),
  ADD KEY `_CollateralToLead_B_index` (`B`);

--
-- Indexes for table `_ManagerCompanies`
--
ALTER TABLE `_ManagerCompanies`
  ADD UNIQUE KEY `_ManagerCompanies_AB_unique` (`A`,`B`),
  ADD KEY `_ManagerCompanies_B_index` (`B`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `Activity`
--
ALTER TABLE `Activity`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `ActivityLog`
--
ALTER TABLE `ActivityLog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `Avatar`
--
ALTER TABLE `Avatar`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `CallActivityLog`
--
ALTER TABLE `CallActivityLog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `CallLog`
--
ALTER TABLE `CallLog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `CallStatus`
--
ALTER TABLE `CallStatus`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `CallTracker`
--
ALTER TABLE `CallTracker`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `CallTracker_old`
--
ALTER TABLE `CallTracker_old`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `City`
--
ALTER TABLE `City`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `Collateral`
--
ALTER TABLE `Collateral`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `Company`
--
ALTER TABLE `Company`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `Country`
--
ALTER TABLE `Country`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `Department`
--
ALTER TABLE `Department`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `EitService`
--
ALTER TABLE `EitService`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `EmailStatus`
--
ALTER TABLE `EmailStatus`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `FollowUpLog`
--
ALTER TABLE `FollowUpLog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `ImService`
--
ALTER TABLE `ImService`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `Industry`
--
ALTER TABLE `Industry`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `JobTitle`
--
ALTER TABLE `JobTitle`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `KraEntry`
--
ALTER TABLE `KraEntry`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Lead`
--
ALTER TABLE `Lead`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `LeadContact`
--
ALTER TABLE `LeadContact`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `LeadDocument`
--
ALTER TABLE `LeadDocument`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `LeadQuadrantHistory`
--
ALTER TABLE `LeadQuadrantHistory`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `LeadScore`
--
ALTER TABLE `LeadScore`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `LeadSource`
--
ALTER TABLE `LeadSource`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `Persona`
--
ALTER TABLE `Persona`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `PomodoroSession`
--
ALTER TABLE `PomodoroSession`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `PricingNegotiationLog`
--
ALTER TABLE `PricingNegotiationLog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `Privilege`
--
ALTER TABLE `Privilege`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=101;

--
-- AUTO_INCREMENT for table `Product`
--
ALTER TABLE `Product`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `SalesStage`
--
ALTER TABLE `SalesStage`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `SBU`
--
ALTER TABLE `SBU`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `SourceOfDB`
--
ALTER TABLE `SourceOfDB`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `State`
--
ALTER TABLE `State`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `SwatKeyClosure`
--
ALTER TABLE `SwatKeyClosure`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `SwatPerformance`
--
ALTER TABLE `SwatPerformance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `SwatPerformance_old`
--
ALTER TABLE `SwatPerformance_old`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=73;

--
-- AUTO_INCREMENT for table `User`
--
ALTER TABLE `User`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `UserProductTarget`
--
ALTER TABLE `UserProductTarget`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `UserServiceTarget`
--
ALTER TABLE `UserServiceTarget`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `_ManagerCompanies`
--
ALTER TABLE `_ManagerCompanies`
  MODIFY `A` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
