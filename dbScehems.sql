CREATE TABLE IF NOT EXISTS `bills` (
  `billNo` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `agentId` VARCHAR(45) NOT NULL,
  `agentScheme` VARCHAR(30) NOT NULL,
  `enteredBy` VARCHAR(45) NOT NULL,
  `partnerId` VARCHAR(45) NOT NULL,
  `partnerScheme` VARCHAR(30) NOT NULL,
  `resultDate` VARCHAR(30) NOT NULL,
  `stockistId` VARCHAR(45) NOT NULL,
  `stockistScheme` VARCHAR(30) NOT NULL,
  `subStockistId` VARCHAR(45) NOT NULL,
  `subStockistScheme` VARCHAR(30) NOT NULL,
  `ticketName` VARCHAR(30) NOT NULL,
  `createdAt` DATETIME NOT NULL,
  PRIMARY KEY (`billNo`),
  INDEX `TicketName` (`ticketName` ASC) VISIBLE,
  INDEX `ResultDate` (`resultDate` ASC) VISIBLE)
ENGINE = InnoDB
AUTO_INCREMENT = 29495
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci

CREATE TABLE IF NOT EXISTS `tickets` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `adminPrice` DECIMAL(10,2) UNSIGNED NOT NULL,
  `agentPrice` DECIMAL(10,2) UNSIGNED NOT NULL,
  `count` INT UNSIGNED NOT NULL,
  `mode` VARCHAR(45) NOT NULL,
  `number` VARCHAR(3) NOT NULL,
  `partnerPrice` DECIMAL(10,2) NOT NULL,
  `stockistPrice` DECIMAL(10,2) NOT NULL,
  `subStockistPrice` DECIMAL(10,2) NOT NULL,
  `billNo` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `billNo` (`billNo` ASC) VISIBLE,
  INDEX `number` (`number` ASC) VISIBLE,
  CONSTRAINT `BillNoTickets`
    FOREIGN KEY (`billNo`)
    REFERENCES `bills` (`billNo`)
    ON DELETE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 139449
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci

CREATE TABLE IF NOT EXISTS `winnings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `billNo` BIGINT UNSIGNED NOT NULL,
  `ticketId` DECIMAL(12,0) UNSIGNED NOT NULL,
  `position` VARCHAR(45) NOT NULL,
  `prize` DECIMAL(12,2) UNSIGNED NOT NULL,
  `partnerWin` DECIMAL(15,2) NOT NULL,
  `stockistWin` DECIMAL(15,2) NOT NULL,
  `subStockistWin` DECIMAL(15,2) NOT NULL,
  `agentWin` DECIMAL(15,2) NOT NULL,
  `resultDate` VARCHAR(30) NOT NULL,
  `ticketName` VARCHAR(30) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `BillNo` (`billNo` ASC) VISIBLE,
  INDEX `BillNoIndex` (`billNo` ASC) VISIBLE,
  INDEX `BillNoIndex_idx` (`billNo` ASC) VISIBLE,
  CONSTRAINT `BillNoWinnings`
    FOREIGN KEY (`billNo`)
    REFERENCES `bills` (`billNo`)
    ON DELETE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 4856
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci