-- Inserting dummy data into the projects table
INSERT INTO projects (title, school, description, GoalMoney, CurrentMoney, MinDonation, Status)
VALUES ('Project 1', 'School 1', 'Description 1', 100, 0, 1, 'proposed'),
       ('Project 2', 'School 2', 'Description 2', 200, 0, 1, 'open'),
       ('Project 3', 'School 3', 'Description 3', 300, 0, 1, 'closed');


INSERT INTO users (userid, email, default_school) 
VALUES ('bQRUc63oPognMlGQod1fdkvl0jS2', '-', 'Oxford')
ON CONFLICT (userid) DO NOTHING;

