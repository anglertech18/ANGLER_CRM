-- phpMyAdmin SQL Dump
-- version 4.8.5
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 06, 2026 at 07:30 AM
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
(1, 'Chief Audit Executive', 2, 1),
(2, 'HR Manager', 1, 1),
(3, 'Supplier Auditor', 2, 1),
(4, 'Quality Head', 2, 1),
(5, 'Legal & Regulatory Officer', 2, 1),
(6, 'IT Auditor', 2, 1),
(7, 'HR Executive / HR Admin', 1, 1),
(8, 'Payroll Manager', 1, 1),
(9, 'Payroll Executive', 1, 1),
(10, 'Attendance / Time Office Manager', 1, 1),
(11, 'Attendance Executive / Time Office Staff', 1, 1),
(12, 'Department Manager / HOD', 1, 1),
(13, 'Shift In-charge / Supervisor', 1, 1),
(14, 'Employee (General Staff)', 1, 1),
(15, 'Contract / Temporary Staff', 1, 1),
(16, 'Security / Gate Staff', 1, 1),
(17, 'IT Administrator', 1, 1),
(18, 'Plant / Factory Manager', 1, 1),
(19, 'Compliance / Audit Officer', 1, 1),
(20, 'Management / CXO', 1, 1),
(21, 'Procurement Head', 3, 1),
(22, 'Chief Procurement Officer', 3, 1),
(23, 'Finance Manager ', 3, 1),
(24, 'Supply chain Manager Head', 3, 1),
(25, 'IT head', 3, 1),
(26, 'Fleet Manager', 4, 1),
(27, 'Logistics Head', 4, 1),
(28, 'Transport Manager', 4, 1),
(29, 'Operations Manager', 4, 1),
(30, 'Maintenance Head', 4, 1),
(31, 'Safety & Compliance Officer', 4, 1),
(32, 'IoT Solutions Architect', 5, 1),
(33, 'IT Head', 5, 1),
(34, 'OT/IT Manager', 5, 1),
(35, 'Plant Manager', 5, 1),
(36, 'Data Engineer', 5, 1),
(37, 'Digital Transformation Lead', 5, 1),
(38, 'Integration Architect', 6, 1),
(39, 'IT Head', 6, 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `persona`
--
ALTER TABLE `persona`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Persona_product_id_fkey` (`product_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `persona`
--
ALTER TABLE `persona`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `persona`
--
ALTER TABLE `persona`
  ADD CONSTRAINT `Persona_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product` (`id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
