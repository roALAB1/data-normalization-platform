CREATE TABLE `jobResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`rowIndex` int NOT NULL,
	`inputValue` text NOT NULL,
	`outputValue` text,
	`isValid` boolean NOT NULL,
	`repairLog` json,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jobResults_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('name','phone','email','company','address') NOT NULL,
	`status` enum('pending','processing','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`totalRows` int NOT NULL,
	`processedRows` int NOT NULL DEFAULT 0,
	`validRows` int NOT NULL DEFAULT 0,
	`invalidRows` int NOT NULL DEFAULT 0,
	`inputFileKey` varchar(512),
	`inputFileUrl` text,
	`outputFileKey` varchar(512),
	`outputFileUrl` text,
	`config` json,
	`errorMessage` text,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
