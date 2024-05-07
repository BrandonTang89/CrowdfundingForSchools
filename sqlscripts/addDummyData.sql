-- Create new schools
INSERT INTO Schools (school)
VALUES ('New College School'),
       ('Magdalen College School'),
       ('Oxford High School');

-- Inserting dummy data into the projects table
INSERT INTO Projects (title, school, description, GoalMoney, CurrentMoney, MinDonation, Status)
VALUES ('New computers for students', 'New College School', 'Description 1', 1000, 200, 1, 'open'),
       ('Trip to the Ashmolean Museum', 'Magdalen College School', 'Description 2', 200, 50, 1, 'open'),
       ('New football goals for the playground', 'Oxford High School', 'Description 3', 300, 300, 1, 'closed');

-- Creates a new admin user
DO $$
DECLARE MYUID VARCHAR(255);
BEGIN
  MYUID := 's4WuQLQd2AaJ3g4Alr7nBf6XtU02';

  INSERT INTO Users (userid, email, defaultschool) 
  VALUES (MYUID, '-', 'Oxford')
  ON CONFLICT (userid) DO NOTHING;

  INSERT INTO Roles (userid, school, role)
  VALUES (MYUID, 'Oxford', 'admin'),
         (MYUID, 'Cambridge', 'admin')
  ON CONFLICT (userid, school) DO NOTHING;
END $$;