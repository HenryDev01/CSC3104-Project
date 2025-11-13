
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