CREATE TABLE Risk (
    RiskCategoryID VARCHAR(2) PRIMARY KEY,
    Description VARCHAR(100)
);

CREATE TABLE Patient (
    PatientID varchar(200) PRIMARY KEY,
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
    PID varchar(200) ,
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
    PID varchar(200) ,
    FBG INT,
    HbA1c FLOAT,
    TestDate DATE,
    FOREIGN KEY (PID) REFERENCES Patient(PatientID)
);

CREATE TABLE HMODInformation (
    HMODID INT PRIMARY KEY AUTO_INCREMENT,
    PID varchar(200) ,
    LVMass INT,
    Microalbuminuria INT,
    PWV FLOAT,
    ABI FLOAT,
    TestDate DATE,
    FOREIGN KEY (PID) REFERENCES Patient(PatientID)
);

CREATE TABLE CKDInformation (
    CKDID INT PRIMARY KEY AUTO_INCREMENT,
    PID varchar(200) ,
    SerumCreatinine FLOAT,
    eGFR INT,
    UACR INT,
    TestDate DATE,
    FOREIGN KEY (PID) REFERENCES Patient(PatientID)
);

CREATE TABLE CVDInformation (
    CVDID INT PRIMARY KEY AUTO_INCREMENT,
    PID varchar(200) ,
    BP VARCHAR(20),
    Smoking INT,
    TestDate DATE,
    FOREIGN KEY (PID) REFERENCES Patient(PatientID)
);

INSERT INTO Risk (RiskCategoryID, Description) VALUES
('P1', 'HIGH RISK'),
('P2', 'MODERATE RISK'),
('P3', 'MODERATE'),
('P4', 'LOW');