CREATE TABLE Risk (
    RiskCategoryID VARCHAR(2) PRIMARY KEY,
    Description VARCHAR(100)
);

CREATE TABLE Patient (
    PatientID INT PRIMARY KEY AUTO_INCREMENT,
    Name varchar(150),
    Age INT,
    Gender TINYINT,
    Diabetes TINYINT,
    HMOD TINYINT,
    CKD TINYINT,
    CVD TINYINT,
    CHD FLOAT,
    RiskCategoryID VARCHAR(2),
    FOREIGN KEY (RiskCategoryID) REFERENCES Risk(RiskCategoryID)
);

CREATE TABLE GeneralInformation (
    InfoID INT PRIMARY KEY AUTO_INCREMENT,
    PID INT,
    AvgDailySteps INT,
    HDL INT,
    LDL INT,
    Cholesterol FLOAT,
    CACS INT,
    RestingPulse INT,
    TestDate DATE,
    FOREIGN KEY (PID) REFERENCES Patient(PatientID)
);

CREATE TABLE DiabetesInformation (
    DiabetesID INT PRIMARY KEY AUTO_INCREMENT,
    PID INT,
    FBG INT,
    HbA1c FLOAT,
    TestDate DATE,
    FOREIGN KEY (PID) REFERENCES Patient(PatientID)
);

CREATE TABLE HMODInformation (
    HMODID INT PRIMARY KEY AUTO_INCREMENT,
    PID INT,
    LVMass INT,
    Microalbuminuria INT,
    PWV FLOAT,
    ABI FLOAT,
    TestDate DATE,
    FOREIGN KEY (PID) REFERENCES Patient(PatientID)
);

CREATE TABLE CKDInformation (
    CKDID INT PRIMARY KEY AUTO_INCREMENT,
    PID INT,
    SerumCreatinine FLOAT,
    eGFR INT,
    UACR INT,
    TestDate DATE,
    FOREIGN KEY (PID) REFERENCES Patient(PatientID)
);

CREATE TABLE CVDInformation (
    CVDID INT PRIMARY KEY AUTO_INCREMENT,
    PID INT,
    BP VARCHAR(20),
    Smoking INT,
    TestDate DATE,
    FOREIGN KEY (PID) REFERENCES Patient(PatientID)
);

CREATE TABLE Roles (
    RoleID INT PRIMARY KEY AUTO_INCREMENT,
    RoleName VARCHAR(50) UNIQUE
);

CREATE TABLE Users(
   userID INT PRIMARY KEY AUTO_INCREMENT,
   username varchar(100) UNIQUE,
   password varchar(100),
   RoleID INT,
   FOREIGN KEY (RoleID) REFERENCES Roles(RoleID)

);


INSERT INTO Risk (RiskCategoryID, Description) VALUES
('P1', 'Highest Risk'),
('P2', 'Moderate High Risk'),
('P3', 'Moderate Risk'),
('P4', 'Lowest Risk');

INSERT INTO Roles (RoleID, RoleName) VALUES
(1, 'Admin'),
(2, 'Doctor'),
(3, 'Nurse');


INSERT INTO Users (username, password, RoleID) VALUES
("Henry", "Password123", 1),
("Dannon", "Password123", 1),
("Josaiah", "Password123",1),
("BaoQuan", "Password123", 1),
("HanSheng", "Password123", 2),
("Pranawi", "Password123", 3);

--TESTING DATA INFORMATIONS, FOR DEVELOPMENT TESTING PURPOSES !!
INSERT INTO Patient (Name, Age, Gender, Diabetes, HMOD, CKD, CVD, CHD, RiskCategoryID) VALUES
('John Tan', 45, 1, 1, 1, 0, 0, 12.5, 'P2'),
('Mary Lim', 52, 0, 1, 0, 1, 0, 10.1, 'P3'),
('Alex Wong', 38, 1, 0, 0, 0, 0, 6.2, 'P4'),
('Nur Aisyah', 60, 0, 1, 1, 1, 1, 25.4, 'P1'),
('David Chen', 55, 1, 1, 1, 0, 1, 18.9, 'P2'),
('Priya Kumar', 47, 0, 0, 1, 0, 0, 9.8, 'P3'),
('Benjamin Lee', 34, 1, 0, 0, 0, 0, 5.3, 'P4'),
('Sarah Tan', 49, 0, 1, 0, 1, 0, 11.7, 'P3'),
('Hiroshi Sato', 63, 1, 1, 1, 1, 1, 27.8, 'P1'),
('Lina Chong', 58, 0, 1, 0, 1, 1, 22.1, 'P2');

-- GENERAL INFORMATION (latest per patient)
INSERT INTO GeneralInformation (PID, AvgDailySteps, HDL, LDL, Cholesterol, CACS, RestingPulse, TestDate) VALUES
(1, 8500, 52, 130, 5.1, 20, 72, '2025-09-01'),
(2, 6400, 48, 155, 5.8, 110, 76, '2025-08-25'),
(3, 10000, 60, 110, 4.6, 5, 68, '2025-09-10'),
(4, 4200, 44, 170, 6.2, 250, 82, '2025-09-05'),
(5, 5600, 46, 160, 5.9, 180, 78, '2025-09-03'),
(6, 7800, 55, 120, 4.9, 15, 70, '2025-09-12'),
(7, 11000, 62, 105, 4.4, 0, 64, '2025-09-08'),
(8, 6900, 50, 145, 5.5, 95, 74, '2025-09-07'),
(9, 3500, 42, 178, 6.5, 320, 84, '2025-08-30'),
(10, 6000, 49, 150, 5.6, 140, 75, '2025-09-02');

-- DIABETES INFORMATION
INSERT INTO DiabetesInformation (PID, FBG, HbA1c, TestDate) VALUES
(1, 115, 6.2, '2025-09-01'),
(2, 130, 7.1, '2025-08-25'),
(3, 92, 5.4, '2025-09-10'),
(4, 145, 7.8, '2025-09-05'),
(5, 125, 6.9, '2025-09-03'),
(6, 99, 5.5, '2025-09-12'),
(7, 90, 5.2, '2025-09-08'),
(8, 122, 6.5, '2025-09-07'),
(9, 150, 8.0, '2025-08-30'),
(10, 128, 6.7, '2025-09-02');

-- HMOD INFORMATION
INSERT INTO HMODInformation (PID, LVMass, Microalbuminuria, PWV, ABI, TestDate) VALUES
(1, 180, 20, 9.1, 1.10, '2025-09-01'),
(2, 195, 35, 9.8, 1.05, '2025-08-25'),
(3, 160, 10, 7.8, 1.15, '2025-09-10'),
(4, 210, 50, 10.5, 0.95, '2025-09-05'),
(5, 200, 30, 9.9, 1.02, '2025-09-03'),
(6, 170, 15, 8.2, 1.12, '2025-09-12'),
(7, 155, 5, 7.5, 1.18, '2025-09-08'),
(8, 185, 22, 8.9, 1.07, '2025-09-07'),
(9, 220, 60, 11.2, 0.92, '2025-08-30'),
(10, 190, 28, 9.4, 1.03, '2025-09-02');

-- CKD INFORMATION
INSERT INTO CKDInformation (PID, SerumCreatinine, eGFR, UACR, TestDate) VALUES
(1, 1.0, 85, 20, '2025-09-01'),
(2, 1.3, 65, 55, '2025-08-25'),
(3, 0.9, 95, 10, '2025-09-10'),
(4, 1.6, 50, 120, '2025-09-05'),
(5, 1.2, 70, 40, '2025-09-03'),
(6, 1.0, 90, 18, '2025-09-12'),
(7, 0.8, 100, 8, '2025-09-08'),
(8, 1.1, 75, 35, '2025-09-07'),
(9, 1.8, 45, 200, '2025-08-30'),
(10, 1.2, 72, 42, '2025-09-02');

-- CVD INFORMATION
INSERT INTO CVDInformation (PID, BP, Smoking, TestDate) VALUES
(1, '132/84', 0, '2025-09-01'),
(2, '145/90', 0, '2025-08-25'),
(3, '124/78', 0, '2025-09-10'),
(4, '158/95', 1, '2025-09-05'),
(5, '148/92', 1, '2025-09-03'),
(6, '126/80', 0, '2025-09-12'),
(7, '120/76', 0, '2025-09-08'),
(8, '140/88', 0, '2025-09-07'),
(9, '162/98', 1, '2025-08-30'),
(10, '142/90', 0, '2025-09-02');
