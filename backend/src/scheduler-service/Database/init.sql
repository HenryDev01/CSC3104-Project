
CREATE TABLE PatientQueue (
    patient_id VARCHAR(200) PRIMARY KEY,
    priority_group ENUM('P1','P2','P3','P4') NOT NULL,
    priority_score DECIMAL(5,4) NULL,
    stability VARCHAR(20) NULL,
    risk_data JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Doctor (
    doctor_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100)
);


CREATE TABLE DoctorAvailability (
    availability_id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    available BOOLEAN DEFAULT TRUE,
    UNIQUE(doctor_id, date, start_time, end_time),
    FOREIGN KEY (doctor_id) REFERENCES Doctor(doctor_id)
);
CREATE TABLE Appointment (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id VARCHAR(200) NOT NULL,
    doctor_id INT NOT NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    priority_group ENUM('P1','P2','P3','P4') NOT NULL,
    priority_score DECIMAL(5,4) NULL,
    stability VARCHAR(20) NULL,
    status ENUM('scheduled','completed','cancelled'),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(patient_id, scheduled_date, scheduled_time),
    FOREIGN KEY (doctor_id) REFERENCES Doctor(doctor_id),
    INDEX idx_priority (priority_group, priority_score),
    INDEX idx_status_date (status, scheduled_date)
);

INSERT INTO Doctor (name, specialization) VALUES
('Dr. Alice Tan', 'Cardiology'),
('Dr. Brian Lim', 'Endocrinology'),
('Dr. Cindy Wong', 'Nephrology');

-- 1. Create a helper numbers table for 30-minute intervals (09:00–18:00)
CREATE TEMPORARY TABLE numbers (n INT PRIMARY KEY);
INSERT INTO numbers (n) VALUES
(0),(1),(2),(3),(4),(5),(6),(7),(8),
(9),(10),(11),(12),(13),(14),(15),(16),(17);

-- 2. Set date range for next 2 years (or change to desired years)
SET @start_date = CURDATE();
SET @years = 2; -- Change this to generate more years (1, 2, 3, etc.)
SET @total_days = @years * 365;
SET @end_date = DATE_ADD(@start_date, INTERVAL @years YEAR);

-- 3. Create helper table for day offsets
-- This builds a sequence from 0 to @total_days
CREATE TEMPORARY TABLE days (day_offset INT PRIMARY KEY);

-- Base: 0-9
INSERT INTO days (day_offset) VALUES
(0),(1),(2),(3),(4),(5),(6),(7),(8),(9);

-- Build up to 100
INSERT INTO days (day_offset)
SELECT day_offset + 10 FROM days WHERE day_offset < 10;
INSERT INTO days (day_offset)
SELECT day_offset + 20 FROM days WHERE day_offset < 20;
INSERT INTO days (day_offset)
SELECT day_offset + 40 FROM days WHERE day_offset < 40;
INSERT INTO days (day_offset)
SELECT day_offset + 80 FROM days WHERE day_offset < 80;

-- Build up to 1000 (covers ~2.7 years)
INSERT INTO days (day_offset)
SELECT day_offset + 100 FROM days WHERE day_offset < 100 AND day_offset + 100 <= @total_days;
INSERT INTO days (day_offset)
SELECT day_offset + 200 FROM days WHERE day_offset < 200 AND day_offset + 200 <= @total_days;
INSERT INTO days (day_offset)
SELECT day_offset + 400 FROM days WHERE day_offset < 400 AND day_offset + 400 <= @total_days;

-- Optional: Extend further for 5+ years
-- Uncomment if you need more than 3 years
-- INSERT INTO days (day_offset)
-- SELECT day_offset + 800 FROM days WHERE day_offset < 800 AND day_offset + 800 <= @total_days;

-- 4. Insert doctor availability (weekdays only, 09:00–18:00, 30-min slots)
INSERT INTO DoctorAvailability (doctor_id, date, start_time, end_time, available)
SELECT
    d.doctor_id,
    DATE_ADD(@start_date, INTERVAL t.day_offset DAY) AS slot_date,
    ADDTIME('09:00:00', SEC_TO_TIME(n.n*30*60)) AS slot_start,
    ADDTIME('09:00:00', SEC_TO_TIME((n.n+1)*30*60)) AS slot_end,
    TRUE AS available
FROM numbers n
CROSS JOIN (SELECT 1 AS doctor_id UNION ALL SELECT 2 UNION ALL SELECT 3) d
CROSS JOIN days t
WHERE WEEKDAY(DATE_ADD(@start_date, INTERVAL t.day_offset DAY)) < 5  -- Monday=0 to Friday=4
  AND DATE_ADD(@start_date, INTERVAL t.day_offset DAY) <= @end_date
  AND t.day_offset <= @total_days
  AND ADDTIME('09:00:00', SEC_TO_TIME((n.n+1)*30*60)) <= '18:00:00'
ORDER BY slot_date, slot_start, doctor_id;

-- 5. Cleanup temporary tables
DROP TEMPORARY TABLE IF EXISTS numbers;
DROP TEMPORARY TABLE IF EXISTS days;

-- 6. Verify the insert
SELECT
    COUNT(*) as total_slots,
    MIN(date) as first_date,
    MAX(date) as last_date,
    COUNT(DISTINCT date) as unique_dates,
    COUNT(DISTINCT doctor_id) as doctors
FROM DoctorAvailability;