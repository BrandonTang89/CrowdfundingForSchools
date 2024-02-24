-- CREATE DATABASE crowdfundingsitedb;
CREATE TYPE statustype AS ENUM ('proposed', 'open', 'closed');
CREATE TYPE roletype AS ENUM ('admin', 'teacher');

DROP TABLE IF EXISTS Users CASCADE;
CREATE TABLE Users (
    UserID VARCHAR(255) PRIMARY KEY,
    Email VARCHAR(255),
    Default_School VARCHAR(255)
);

DROP TABLE IF EXISTS Roles;
CREATE TABLE Roles (
    UserID VARCHAR(255),
    School VARCHAR(255),
    Roles roletype,
    PRIMARY KEY (UserID, School)
);

DROP TABLE IF EXISTS Projects CASCADE;
CREATE TABLE Projects (
    ProjectID SERIAL PRIMARY KEY,
    School VARCHAR(255),
    Title VARCHAR(255),
    Description TEXT,
    GoalMoney INT,
    CurrentMoney INT,
    Status statustype,
    ProposerEmail VARCHAR(255)
);

DROP TABLE IF EXISTS Donations;
CREATE TABLE Donations (
    DonationID SERIAL,
    ProjectID INT,
    UserID VARCHAR(255),
    Amount INT,
    DonationDate DATE,
    FOREIGN KEY (ProjectID) REFERENCES Projects(ProjectID),
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);