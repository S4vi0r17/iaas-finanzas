ALTER TABLE `expenses` ADD `tipo` text DEFAULT 'variable' NOT NULL;
--> statement-breakpoint
UPDATE `expenses` SET `tipo` = CASE
  WHEN `obligation_id` IS NULL THEN 'variable'
  WHEN (SELECT `tipo` FROM `obligations` WHERE `obligations`.`id` = `expenses`.`obligation_id`) = 'inversion' THEN 'inversion'
  ELSE 'fijo'
END;
