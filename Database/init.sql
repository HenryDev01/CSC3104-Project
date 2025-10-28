CREATE TABLE Risk (
    RiskCategoryID VARCHAR(2) PRIMARY KEY,
    Description VARCHAR(100)
);

CREATE TABLE Patient (
    PatientID INT PRIMARY KEY,
    Name varchar(150),
    Age INT,
    Gender TINYINT,
    Diabetes FLOAT,
    HMOD FLOAT,
    CKD FLOAT,
    CVD FLOAT,
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