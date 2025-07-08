-- CreateTable
CREATE TABLE `UserActivity` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `audioId` VARCHAR(191) NOT NULL,
    `isCorrect` BOOLEAN NOT NULL,
    `userAnswer` TEXT NULL,
    `correctAnswer` TEXT NULL,
    `completedAt` DATETIME(3) NULL,
    `timeSpent` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserActivity` ADD CONSTRAINT `UserActivity_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserActivity` ADD CONSTRAINT `UserActivity_audioId_fkey` FOREIGN KEY (`audioId`) REFERENCES `Audio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
