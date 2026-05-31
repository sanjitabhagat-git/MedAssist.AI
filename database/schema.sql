CREATE DATABASE IF NOT EXISTS ai_medical_assistant;
USE ai_medical_assistant;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('patient', 'admin', 'doctor') NOT NULL DEFAULT 'patient',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  degree VARCHAR(100) NOT NULL,
  fees DECIMAL(10, 2) NOT NULL DEFAULT 0,
  available_schedule VARCHAR(255) NOT NULL DEFAULT '',
  photo_url VARCHAR(255) DEFAULT NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS doctor_availability (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  day_of_week ENUM('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  doctor_id INT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time VARCHAR(50) NOT NULL,
  status ENUM('booked', 'completed', 'cancelled') NOT NULL DEFAULT 'booked',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS symptom_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  symptoms TEXT NOT NULL,
  ai_response JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT IGNORE INTO departments (id, name) VALUES
  (1, 'Cardiology'),
  (2, 'Dermatology'),
  (3, 'Orthopedics'),
  (4, 'Neurology'),
  (5, 'General Medicine');

INSERT IGNORE INTO users (id, name, email, phone, password, role) VALUES
  (1, 'Demo Patient', 'patient@demo.com', '9876543210', 'demo123', 'patient'),
  (2, 'Admin User', 'admin@demo.com', '9999999999', 'admin123', 'admin');

INSERT IGNORE INTO doctors (id, department_id, name, degree, fees, available_schedule, photo_url) VALUES
  (1, 1, 'Dr. Arjun Mehta', 'MBBS, MD (Cardiology)', 1200.00, 'Friday, 9:00 AM to 10:00 AM; Saturday, 1:00 PM to 2:00 PM', 'https://images.unsplash.com/photo-1612349316228-5942a9b489c4?auto=format&fit=crop&w=300&q=80'),
  (2, 2, 'Dr. Neha Sharma', 'MBBS, MD (Dermatology)', 900.00, 'Monday, 10:00 AM to 12:00 PM; Thursday, 3:00 PM to 5:00 PM', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=300&q=80'),
  (3, 3, 'Dr. Rohan Iyer', 'MBBS, MS (Orthopedics)', 1100.00, 'Tuesday, 11:00 AM to 1:00 PM; Friday, 4:00 PM to 6:00 PM', 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=300&q=80'),
  (4, 4, 'Dr. Kavya Nair', 'MBBS, DM (Neurology)', 1500.00, 'Wednesday, 9:30 AM to 11:30 AM; Saturday, 2:00 PM to 4:00 PM', 'https://images.unsplash.com/photo-1594824475317-d4d7f4f2b3f7?auto=format&fit=crop&w=300&q=80'),
  (5, 5, 'Dr. Amit Verma', 'MBBS, MD (General Medicine)', 700.00, 'Monday to Friday, 8:30 AM to 12:30 PM', 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&w=300&q=80');

INSERT IGNORE INTO doctor_availability (doctor_id, day_of_week, start_time, end_time) VALUES
  (1, 'Friday', '09:00:00', '10:00:00'),
  (1, 'Saturday', '13:00:00', '14:00:00'),
  (2, 'Monday', '10:00:00', '12:00:00'),
  (2, 'Thursday', '15:00:00', '17:00:00'),
  (3, 'Tuesday', '11:00:00', '13:00:00'),
  (3, 'Friday', '16:00:00', '18:00:00'),
  (4, 'Wednesday', '09:30:00', '11:30:00'),
  (4, 'Saturday', '14:00:00', '16:00:00'),
  (5, 'Monday', '08:30:00', '12:30:00'),
  (5, 'Tuesday', '08:30:00', '12:30:00'),
  (5, 'Wednesday', '08:30:00', '12:30:00'),
  (5, 'Thursday', '08:30:00', '12:30:00'),
  (5, 'Friday', '08:30:00', '12:30:00');
