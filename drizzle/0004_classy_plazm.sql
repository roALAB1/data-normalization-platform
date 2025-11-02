CREATE TABLE `credentialIssues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`issueType` enum('not_stripped','incorrectly_stripped','missing_credential','other') NOT NULL,
	`originalText` text NOT NULL,
	`expectedOutput` text,
	`actualOutput` text,
	`credentialText` varchar(255),
	`description` text,
	`status` enum('pending','reviewed','resolved','wont_fix') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credentialIssues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credentialUsage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`credential` varchar(255) NOT NULL,
	`occurrenceCount` int NOT NULL DEFAULT 1,
	`lastSeen` timestamp NOT NULL DEFAULT (now()),
	`isInList` boolean NOT NULL DEFAULT false,
	`addedToListAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credentialUsage_id` PRIMARY KEY(`id`),
	CONSTRAINT `credentialUsage_credential_unique` UNIQUE(`credential`)
);
