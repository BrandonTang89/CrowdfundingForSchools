-- Inserting dummy data into the projects table
INSERT INTO projects (title, school, description, GoalMoney, CurrentMoney, MinDonation, Status)
VALUES ('Project 1', 'School 1', 'Description 1', 100, 0, 1, 'proposed'),
       ('Project 2', 'School 2', 'Description 2', 200, 0, 1, 'open'),
       ('Project 3', 'School 3', 'Description 3', 300, 0, 1, 'closed');

-- Creates a new admin user
DO $$
DECLARE MYUID VARCHAR(255);
BEGIN
  MYUID := 's4WuQLQd2AaJ3g4Alr7nBf6XtU02';

  INSERT INTO users (userid, email, default_school) 
  VALUES (MYUID, '-', 'Oxford')
  ON CONFLICT (userid) DO NOTHING;

  INSERT INTO roles (userid, school, role)
  VALUES (MYUID, 'Oxford', 'admin'),
         (MYUID, 'Cambridge', 'admin')
  ON CONFLICT (userid, school) DO NOTHING;
END $$;