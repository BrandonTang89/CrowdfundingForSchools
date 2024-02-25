-- psql -h localhost -p 5432 -U postgres -d crowdfundingsitedb -f sqlscripts/createDatabase.sql
-- CREATE DATABASE crowdfundingsitedb;
CREATE TYPE statustype AS ENUM ('proposed', 'open', 'closed');
CREATE TYPE roletype AS ENUM ('admin', 'teacher');

DROP TABLE IF EXISTS Users CASCADE;
CREATE TABLE Users (
    userid VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    defaultschool VARCHAR(255)
);

DROP TABLE IF EXISTS Schools CASCADE;
CREATE TABLE Schools (
    school VARCHAR(255) PRIMARY KEY,
    stripeid VARCHAR(255),
    onboarded BOOLEAN DEFAULT FALSE
);

DROP TABLE IF EXISTS Roles;
CREATE TABLE Roles (
    userid VARCHAR(255),
    school VARCHAR(255),
    role roletype,
    PRIMARY KEY (userid, school)
);

DROP TABLE IF EXISTS Projects CASCADE;
CREATE TABLE Projects (
    projectid SERIAL PRIMARY KEY,
    school VARCHAR(255),
    title VARCHAR(255),
    description TEXT,
    goalmoney INT,
    currentmoney INT DEFAULT 0,
    mindonation INT,
    status statustype,
    proposer VARCHAR(255),
    stripeproductid VARCHAR(255),
    stripepriceid VARCHAR(255),
    FOREIGN KEY (proposer) REFERENCES Users(userid),
    FOREIGN KEY (school) REFERENCES Schools(school)
);

DROP TABLE IF EXISTS Donations;
CREATE TABLE Donations (
    donationid SERIAL,
    projectid INT,
    userid VARCHAR(255),
    amount INT,
    donationdate DATE,
    FOREIGN KEY (projectid) REFERENCES Projects(projectid),
    FOREIGN KEY (userid) REFERENCES Users(userid)
);