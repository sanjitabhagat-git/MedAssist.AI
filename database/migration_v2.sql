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

CREATE TABLE IF NOT EXISTS doctor_availability (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  day_of_week ENUM('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
SELECT 1, 'Friday', '09:00:00', '10:00:00'
WHERE NOT EXISTS (SELECT 1 FROM doctor_availability WHERE doctor_id = 1 AND day_of_week = 'Friday' AND start_time = '09:00:00');

INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
SELECT 1, 'Saturday', '13:00:00', '14:00:00'
WHERE NOT EXISTS (SELECT 1 FROM doctor_availability WHERE doctor_id = 1 AND day_of_week = 'Saturday' AND start_time = '13:00:00');

INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
SELECT 2, 'Monday', '10:00:00', '12:00:00'
WHERE NOT EXISTS (SELECT 1 FROM doctor_availability WHERE doctor_id = 2 AND day_of_week = 'Monday' AND start_time = '10:00:00');

INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
SELECT 2, 'Thursday', '15:00:00', '17:00:00'
WHERE NOT EXISTS (SELECT 1 FROM doctor_availability WHERE doctor_id = 2 AND day_of_week = 'Thursday' AND start_time = '15:00:00');

INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
SELECT 3, 'Tuesday', '11:00:00', '13:00:00'
WHERE NOT EXISTS (SELECT 1 FROM doctor_availability WHERE doctor_id = 3 AND day_of_week = 'Tuesday' AND start_time = '11:00:00');

INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
SELECT 3, 'Friday', '16:00:00', '18:00:00'
WHERE NOT EXISTS (SELECT 1 FROM doctor_availability WHERE doctor_id = 3 AND day_of_week = 'Friday' AND start_time = '16:00:00');

INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
SELECT 4, 'Wednesday', '09:30:00', '11:30:00'
WHERE NOT EXISTS (SELECT 1 FROM doctor_availability WHERE doctor_id = 4 AND day_of_week = 'Wednesday' AND start_time = '09:30:00');

INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
SELECT 4, 'Saturday', '14:00:00', '16:00:00'
WHERE NOT EXISTS (SELECT 1 FROM doctor_availability WHERE doctor_id = 4 AND day_of_week = 'Saturday' AND start_time = '14:00:00');

INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time)
SELECT 5, weekday_name, '08:30:00', '12:30:00'
FROM (
  SELECT 'Monday' AS weekday_name UNION ALL
  SELECT 'Tuesday' UNION ALL
  SELECT 'Wednesday' UNION ALL
  SELECT 'Thursday' UNION ALL
  SELECT 'Friday'
) weekdays
WHERE NOT EXISTS (
  SELECT 1
  FROM doctor_availability
  WHERE doctor_id = 5 AND day_of_week = weekday_name AND start_time = '08:30:00'
);
