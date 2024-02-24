-- psql -h localhost -p 5432 -U postgres -d crowdfundingsitedb -f sqlscripts/createDatabase.sql
-- CREATE DATABASE crowdfundingsitedb;
CREATE TYPE statustype AS ENUM ('proposed', 'open', 'closed');
CREATE TYPE roletype AS ENUM ('admin', 'teacher');

DROP TABLE IF EXISTS Users CASCADE;
CREATE TABLE Users (
    UserId VARCHAR(255) PRIMARY KEY,
    Email VARCHAR(255),
    Default_School VARCHAR(255)
);

DROP TABLE IF EXISTS Roles;
CREATE TABLE Roles (
    UserId VARCHAR(255),
    School VARCHAR(255),
    Roles roletype,
    PRIMARY KEY (UserId, School)
);

DROP TABLE IF EXISTS Projects CASCADE;
CREATE TABLE Projects (
    ProjectID SERIAL PRIMARY KEY,
    School VARCHAR(255),
    Title VARCHAR(255),
    Description TEXT,
    GoalMoney INT,
    CurrentMoney INT DEFAULT 0,
    MinDonation INT,
    Status statustype,
    Proposer VARCHAR(255),
    FOREIGN KEY (Proposer) REFERENCES Users(UserId)
);

DROP TABLE IF EXISTS Donations;
CREATE TABLE Donations (
    DonationID SERIAL,
    ProjectID INT,
    UserId VARCHAR(255),
    Amount INT,
    DonationDate DATE,
    FOREIGN KEY (ProjectID) REFERENCES Projects(ProjectID),
    FOREIGN KEY (UserId) REFERENCES Users(UserId)
);