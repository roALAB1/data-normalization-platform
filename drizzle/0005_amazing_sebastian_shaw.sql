CREATE TABLE `issueReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`originalInput` text NOT NULL,
	`actualOutput` json NOT NULL,
	`expectedOutput` json,
	`issueType` enum('credential_not_stripped','credential_incorrectly_stripped','name_split_wrong','special_char_issue','trailing_punctuation','leading_punctuation','other') NOT NULL,
	`description` text,
	`severity` enum('critical','high','medium','low') NOT NULL DEFAULT 'medium',
	`status` enum('pending','analyzing','analyzed','fixed','wont_fix') NOT NULL DEFAULT 'pending',
	`pattern` varchar(255),
	`fixSuggestion` text,
	`version` varchar(32),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `issueReports_id` PRIMARY KEY(`id`)
);
