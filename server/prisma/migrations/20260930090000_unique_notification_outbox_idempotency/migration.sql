-- Prevent concurrent workers or repeated requests from creating the same
-- renewal notification more than once. MySQL permits multiple NULL values in
-- a UNIQUE index, so legacy rows without a key remain valid.
ALTER TABLE `notification_outbox`
  ADD UNIQUE INDEX `notification_outbox_idempotency_key_key` (`idempotency_key`);
