-- phpMyAdmin SQL Dump
-- version 4.8.5
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 24, 2026 at 06:55 AM
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
-- Database: `skydrive`
--

-- --------------------------------------------------------

--
-- Table structure for table `onboard_vendors`
--

CREATE TABLE `onboard_vendors` (
  `id` int(11) NOT NULL,
  `vendor_name` varchar(50) DEFAULT NULL,
  `vendor_unique_code` varchar(255) DEFAULT NULL,
  `sap_vendor_id` varchar(255) DEFAULT NULL COMMENT 'RootEntityId (monitor vendor id)',
  `sap_delivery_address_id` int(11) DEFAULT NULL COMMENT 'RootEntityId (monitor vendor delivery address id)',
  `vendor_email` varchar(50) DEFAULT NULL,
  `name` varchar(50) DEFAULT NULL,
  `invite_vendor_link` varchar(255) NOT NULL,
  `company_name` varchar(200) DEFAULT NULL,
  `representative` varchar(200) DEFAULT NULL,
  `hq_address` varchar(200) DEFAULT NULL,
  `business_outline` varchar(200) DEFAULT NULL,
  `phone` varchar(12) DEFAULT NULL,
  `sales_office_name` varchar(200) DEFAULT NULL,
  `contact_person_address` varchar(200) DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `telephone1` varchar(12) DEFAULT NULL,
  `telephone2` varchar(12) DEFAULT NULL,
  `mobile_1` varchar(20) DEFAULT NULL,
  `mobile_2` varchar(25) DEFAULT NULL,
  `email` varchar(50) DEFAULT NULL,
  `website` text,
  `contact_person_first_name` varchar(50) DEFAULT NULL,
  `contact_person_sur_name` varchar(50) DEFAULT NULL,
  `contact_person_mobile` varchar(25) DEFAULT NULL,
  `job_title` varchar(200) DEFAULT NULL,
  `contact_person_email` varchar(100) DEFAULT NULL,
  `payment_currency` varchar(200) DEFAULT NULL,
  `created_reference` varchar(50) DEFAULT NULL,
  `bill_gst_type` varchar(30) DEFAULT NULL,
  `bill_gst_tin` varchar(30) DEFAULT NULL,
  `bill_street_po_box` varchar(50) DEFAULT NULL,
  `bill_block_village` varchar(50) DEFAULT NULL,
  `bill_city` varchar(50) DEFAULT NULL,
  `bill_post_code` varchar(20) DEFAULT NULL,
  `bill_state` varchar(50) DEFAULT NULL,
  `bill_country` varchar(50) DEFAULT NULL,
  `is_shipping_same` tinyint(4) DEFAULT NULL,
  `payment_terms` varchar(50) DEFAULT NULL,
  `bank_name` varchar(50) DEFAULT NULL,
  `branch_name` varchar(50) DEFAULT NULL,
  `bank_code` varchar(30) DEFAULT NULL,
  `bank_acc_no` varchar(30) DEFAULT NULL,
  `ifsc_swift_code` varchar(30) DEFAULT NULL,
  `bank_acc_name` varchar(50) DEFAULT NULL,
  `special_note` varchar(1000) DEFAULT NULL,
  `signature` varchar(255) DEFAULT NULL,
  `permanant_acc_no` varchar(30) DEFAULT NULL,
  `pan_file` varchar(100) DEFAULT NULL,
  `pan_file_dir` text,
  `pan_file_size` int(11) DEFAULT NULL,
  `pan_file_type` varchar(30) DEFAULT NULL,
  `assesse_type` varchar(30) DEFAULT NULL,
  `msmed_applicablity` varchar(10) DEFAULT NULL,
  `msmed_file` varchar(100) DEFAULT NULL,
  `msmed_file_dir` text,
  `msmed_file_size` int(11) DEFAULT NULL,
  `msmed_file_type` varchar(30) DEFAULT NULL,
  `msmed_number` varchar(50) DEFAULT NULL,
  `is_draft` tinyint(4) DEFAULT NULL,
  `is_onboarded` enum('Not Registered','Pending-Procurement','Pending-Finance','Pending-Onboard','Rejected-Procurement','Rejected-Finance','Hold-Procurement','Hold-Finance','Request-refill-Procurement','Request-refill-Finance','Review-refill-Procurement','Review-refill-Finance','Onboarded','Sync-Success','Sync-Failed') NOT NULL DEFAULT 'Not Registered',
  `api_info` longtext NOT NULL,
  `created` datetime DEFAULT NULL,
  `modified` datetime DEFAULT NULL,
  `addReference` varchar(11) DEFAULT NULL COMMENT 'for api resync purpose',
  `addDeliveryAddress` varchar(11) DEFAULT NULL COMMENT 'for api resync purpose',
  `addCommunicationAddress` varchar(11) DEFAULT NULL COMMENT 'for api resync purpose',
  `addBankAccount` varchar(11) DEFAULT NULL COMMENT 'for api resync purpose',
  `setProperties` varchar(11) DEFAULT NULL COMMENT 'for api resync purpose',
  `setExtraFieldValues` varchar(11) DEFAULT NULL COMMENT 'for api resync purpose'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `onboard_vendors`
--

INSERT INTO `onboard_vendors` (`id`, `vendor_name`, `vendor_unique_code`, `sap_vendor_id`, `sap_delivery_address_id`, `vendor_email`, `name`, `invite_vendor_link`, `company_name`, `representative`, `hq_address`, `business_outline`, `phone`, `sales_office_name`, `contact_person_address`, `currency`, `telephone1`, `telephone2`, `mobile_1`, `mobile_2`, `email`, `website`, `contact_person_first_name`, `contact_person_sur_name`, `contact_person_mobile`, `job_title`, `contact_person_email`, `payment_currency`, `created_reference`, `bill_gst_type`, `bill_gst_tin`, `bill_street_po_box`, `bill_block_village`, `bill_city`, `bill_post_code`, `bill_state`, `bill_country`, `is_shipping_same`, `payment_terms`, `bank_name`, `branch_name`, `bank_code`, `bank_acc_no`, `ifsc_swift_code`, `bank_acc_name`, `special_note`, `signature`, `permanant_acc_no`, `pan_file`, `pan_file_dir`, `pan_file_size`, `pan_file_type`, `assesse_type`, `msmed_applicablity`, `msmed_file`, `msmed_file_dir`, `msmed_file_size`, `msmed_file_type`, `msmed_number`, `is_draft`, `is_onboarded`, `api_info`, `created`, `modified`, `addReference`, `addDeliveryAddress`, `addCommunicationAddress`, `addBankAccount`, `setProperties`, `setExtraFieldValues`) VALUES
(0, 'simsone', 'S10001', NULL, NULL, 'simsone@angleritech.com', NULL, 'http://localhost/vendora/skydrive_vendora/onboard-vendors/welcome/VENDORA6086', 'angler', 'tester', 'coimbatore', 'Global Solutions ', '546468542156', 'trinetra', 'coimbatore', 'CNY', NULL, NULL, '09876543211', NULL, NULL, 'angleritech.com', 'Test1 Lead', 'j', '9876543210', 'developer', 'simsone@gmail.com', 'USD', '260202050237', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'HDFC', 'sungam', '000100', 'hd2090732897', 'hdfc389578945', 'Simsone', 'test sav', 'uploads/signatures/signature_1770182480.png', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 'Not Registered', '', '2026-02-02 17:05:37', '2026-02-04 10:51:40', NULL, NULL, NULL, NULL, NULL, NULL),
(1, 'a', 'A10001', NULL, NULL, 'sridharakrishnan@angleritech.com', NULL, 'http://localhost/vendora/onboard-vendors/welcome/SAC8138', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '885522', '', '9966332255', '8855223366', NULL, '', 'aaaaa', 'aaaaaaaa', '7744112255', NULL, 'aaaa@gmail.com', NULL, '250428100402', 'gsttype', '27AAAPA1234A1Z5', 'west street one, tnagar', 'test', 'Chennai', '600025', 'Tamilnadu', 'India', 1, '', 'test', 'test', '12121', 'IE29AIBK93115212345678', 'SBININBB354', 'sdsdsd', NULL, NULL, 'AAAPA1234A', NULL, NULL, NULL, NULL, 'H', 'No', NULL, NULL, NULL, NULL, '', 0, 'Pending-Onboard', '', '2025-04-28 10:32:03', '2025-04-28 11:34:32', NULL, NULL, NULL, NULL, NULL, NULL),
(2, 'b', 'B10001', NULL, NULL, 'suganya.p@angleritech.com', NULL, 'http://localhost/vendora/onboard-vendors/welcome/SAC1188', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '250428100402', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Not Registered', '', '2025-04-28 10:32:03', '2025-04-28 10:32:03', NULL, NULL, NULL, NULL, NULL, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `onboard_vendors`
--
ALTER TABLE `onboard_vendors`
  ADD PRIMARY KEY (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
