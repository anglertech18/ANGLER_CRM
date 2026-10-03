-- Restricts a BDE's Lead Gen Summary to specific Lead Source Types
-- (e.g. Selvam -> Direct + Reference only, Ramasamy -> Digital only).
-- No rows for a user = unrestricted (sees every active Lead Source Type),
-- matching the existing Lead Gen Summary behavior.
CREATE TABLE `userleadsourcetype` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `lead_source_type_id` INT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `userleadsourcetype_user_id_lead_source_type_id_key` (`user_id`, `lead_source_type_id`),
  KEY `userleadsourcetype_lead_source_type_id_fkey` (`lead_source_type_id`),
  CONSTRAINT `userleadsourcetype_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `userleadsourcetype_lead_source_type_id_fkey` FOREIGN KEY (`lead_source_type_id`) REFERENCES `leadsourcetype` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
