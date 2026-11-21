CREATE TABLE `properties` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_number` text NOT NULL,
	`sub_division` text,
	`district` text NOT NULL,
	`taluk` text NOT NULL,
	`hobli` text,
	`village` text NOT NULL,
	`state` text NOT NULL,
	`extent` text,
	`land_type` text,
	`claimed_owner` text NOT NULL,
	`clean_title_score` integer DEFAULT 90 NOT NULL,
	`status` text DEFAULT 'CLEAN' NOT NULL,
	`guidance_value_inr` text,
	`market_value_inr` text,
	`canonical_hash` text NOT NULL,
	`has_active_mortgage` integer DEFAULT false NOT NULL,
	`pending_litigation_count` integer DEFAULT 0 NOT NULL,
	`pdf_storage_path` text,
	`doc_type` text,
	`raw_metadata` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_properties_state_dist` ON `properties` (`state`,`district`);--> statement-breakpoint
CREATE INDEX `idx_properties_survey` ON `properties` (`survey_number`);--> statement-breakpoint
CREATE INDEX `idx_properties_hash` ON `properties` (`canonical_hash`);--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text,
	`state` text NOT NULL,
	`doc_type` text NOT NULL,
	`district` text NOT NULL,
	`taluka` text NOT NULL,
	`village` text NOT NULL,
	`survey_no` text NOT NULL,
	`khata_no` text,
	`owner_name` text,
	`document_title` text NOT NULL,
	`raw_text` text NOT NULL,
	`doc_hash` text NOT NULL,
	`pdf_path` text NOT NULL,
	`agent_result` text NOT NULL,
	`proof` text NOT NULL,
	`mutation_data` text,
	`index_2_data` text,
	`risk_analysis` text,
	`params` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_records_state_dist` ON `records` (`state`,`district`);--> statement-breakpoint
CREATE INDEX `idx_records_survey` ON `records` (`survey_no`);--> statement-breakpoint
CREATE INDEX `idx_records_prop_id` ON `records` (`property_id`);--> statement-breakpoint
CREATE INDEX `idx_records_doc_hash` ON `records` (`doc_hash`);--> statement-breakpoint
CREATE INDEX `idx_records_created` ON `records` (`created_at`);--> statement-breakpoint
CREATE TABLE `title_certificates` (
	`id` text PRIMARY KEY NOT NULL,
	`certificate_number` text NOT NULL,
	`property_id` text NOT NULL,
	`advocate_name` text NOT NULL,
	`advocate_bar_id` text NOT NULL,
	`dsc_signature_hash` text NOT NULL,
	`score` integer NOT NULL,
	`status` text NOT NULL,
	`eas_attestation_uid` text NOT NULL,
	`merkle_root` text NOT NULL,
	`ipfs_evidence_cid` text NOT NULL,
	`issued_at` text NOT NULL,
	`valid_until` text NOT NULL,
	`details` text,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `title_certificates_certificate_number_unique` ON `title_certificates` (`certificate_number`);--> statement-breakpoint
CREATE INDEX `idx_cert_prop` ON `title_certificates` (`property_id`);--> statement-breakpoint
CREATE INDEX `idx_cert_number` ON `title_certificates` (`certificate_number`);--> statement-breakpoint
CREATE INDEX `idx_cert_eas` ON `title_certificates` (`eas_attestation_uid`);--> statement-breakpoint
CREATE TABLE `title_lineage_records` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`year` text NOT NULL,
	`deed_type` text NOT NULL,
	`transferor` text NOT NULL,
	`transferee` text NOT NULL,
	`doc_number` text NOT NULL,
	`sro_office` text NOT NULL,
	`consideration_inr` text,
	`status` text DEFAULT 'CLEAN' NOT NULL,
	`legacy_font` text,
	`transcoded_utf8` text,
	`notes` text,
	`order_index` integer NOT NULL,
	`leaf_hash` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_lineage_prop` ON `title_lineage_records` (`property_id`);--> statement-breakpoint
CREATE INDEX `idx_lineage_order` ON `title_lineage_records` (`property_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `verification_engine_results` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`engine_name` text NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`finding` text NOT NULL,
	`evidence_hash` text NOT NULL,
	`details` text,
	`verified_at` text NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_verif_prop` ON `verification_engine_results` (`property_id`);--> statement-breakpoint
CREATE INDEX `idx_verif_engine` ON `verification_engine_results` (`property_id`,`engine_name`);