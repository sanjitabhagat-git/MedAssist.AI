USE ai_medical_assistant;

SET @db := DATABASE();

SET @has_phone := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'phone'
);
SET @sql := IF(@has_phone = 0,
  'ALTER TABLE users ADD COLUMN phone VARCHAR(20) NOT NULL DEFAULT '''' AFTER email',
  'SELECT ''users.phone exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_degree := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'doctors' AND COLUMN_NAME = 'degree'
);
SET @sql := IF(@has_degree = 0,
  'ALTER TABLE doctors ADD COLUMN degree VARCHAR(100) NOT NULL DEFAULT '''' AFTER name',
  'SELECT ''doctors.degree exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_fees := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'doctors' AND COLUMN_NAME = 'fees'
);
SET @sql := IF(@has_fees = 0,
  'ALTER TABLE doctors ADD COLUMN fees DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER degree',
  'SELECT ''doctors.fees exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_schedule := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'doctors' AND COLUMN_NAME = 'available_schedule'
);
SET @sql := IF(@has_schedule = 0,
  'ALTER TABLE doctors ADD COLUMN available_schedule VARCHAR(255) NOT NULL DEFAULT '''' AFTER fees',
  'SELECT ''doctors.available_schedule exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_photo := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'doctors' AND COLUMN_NAME = 'photo_url'
);
SET @sql := IF(@has_photo = 0,
  'ALTER TABLE doctors ADD COLUMN photo_url VARCHAR(255) NULL AFTER available_schedule',
  'SELECT ''doctors.photo_url exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE users
SET phone = CASE WHEN id = 1 THEN '9876543210' WHEN id = 2 THEN '9999999999' ELSE '0000000000' END
WHERE (phone IS NULL OR phone = '') AND id IN (1,2);
