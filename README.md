# NumberFitCrowdFunding
A Crowd Funding Project for Number Fit

# TO-DO
### Auth
- Button with timer to re-send email for email verification
- Much better dealing with user error:
    - Email already exists when signing up
    - Email not found when resetting password

### Database
- Route to edit projects (including deleting)
- Route to propose projects
- Route for teachers to approve projects
- Route for administrators to promote/demote teachers/administrators

### Payment
- Everything related to stripe

# Set-Up
## Running the express app
Install dependencies:
`npm install`

Run the app:
`DEBUG=numberfitcrowdfunding:* npm start`

## Running Environment
Tested on Node v20.11.1 on Ubuntu-20.04 running in WSL2.

## Environment Secrets

### Google Service Account for Firebase
The service.json file is a private key that allows you to access the firebase project with a google service account to allow privilleged actions like modifying the database and authentication users.

Get the service account key from the shared google drive.

Place within the project root in a folder called /env. This location is specified within the app.js file as

`var serviceAccount = require("./env/service.json");`


### Firebase Web API Key
Should be stored in a .env file as `FIREBASE_API_KEY`. 

This is used to access the Firebase REST API. Can be found by going to the firebase project settings and looking for the `apiKey` in the code snippet shown.

# Routing
### /
+ GET `/` 
    - Renders `index.ejs` view.
+ GET `/about`
    - Renders `about.ejs` view.
+ GET `/login`
    - Renders `login.ejs` view.
    - Provides a form to login and link to `/auth/forgot` to reset password.
+ GET `/signup`
    - Renders `signup.ejs` view.
+ GET `/settings/:firebaseauthIDToken`
    - Renders `settings.ejs` view. 
    - The firebase authentication token is verified and the user's data is presented to the client to modify. 
    - Contains a form for passsword reset and a form for account deletion.

### /projects
+ GET `/projects`
    - Renders `projects.ejs` view.
+ POST `projects`
    - Takes as input a json object with filtering parameters and returns a list of projects that match the parameters.
+ GET `/projects/view/:projectID`
    - Renders `projectview.ejs` view with information about the project.
    - Provides a form to donate to the project. (todo)
+ GET `/projects/propose?firebtoken=[token]`
    - Verifies the firebase token. If not valid then returns an error.
    - If the user is a teacher or administrator then redirects to `/projects/create?firebtoken=[token]` otherwise renders the `proposeproject.ejs` view. (todo)
+ GET `/projects/create?firebtoken=[token]`
    - Verifies the firebase token and checks if the user is an administrator or teacher for a school. If so renders the `createproject.ejs` view, otherwise returns an error.
    - List of schools that the user can create a project for is passed to the template, allowing for a select box to be created.
+ POST `/projects/create`
    - Receives a json object with the project details. Checks whether the proposer is an administrator or teacher for the school. If so, creates the project and returns the projectID, otherwise returns an error.
+ GET `/projects/edit/:projectID?firebtoken=[token]` (todo)
    - Verifies the firebase token and checks if the user is an administrator or teacher for the school of the project. If so renders the `editproject.ejs` view, otherwise returns and error.

### /auth
+ POST `/auth/signup` 
    - {email: String}
    - Creates a new user with email and randomly generated password. The user is then sent an email to verify their email and set their password.
+ GET `/auth/verify?firebtoken=[token]`
    - Sends a request to Firebase to verify the firebase ID token. 
    - We get the email from the token and then send an email to the user to verify their email. 
    - The email contains a link to `/auth/action?mode=verifyEmail&oobCode=[code]` which will verify the email.
+ GET `/auth/action?mode=verifyEmail&oobCode=[code]` 
    - Sends the email verification code to Firebase to verify the email. User is notified of success or failure.
    - User record is also created within the database.
+ GET `/auth/forgot`
    - Renders `forgot.ejs` view.
+ GET `/auth/action?mode=sendResetPassword&email=[email]`
    - Sends a password reset email to the user.
    - Informs the user to email sent.
    - Email links to `/auth/action?mode=resetPassword&oobCode=[code]` will render the reset password form.
+ GET `/auth/action?mode=resetPassword&oobCode=[code]`
    - Renders `resetPassword.ejs` view.
    - Provides a form to reset the password.
    - Form sends a POST request to `/auth/resetpasswordwithcode`
+ POST `/auth/resetpasswordwithcode`
    - {oobCode: String, newPassword: String}
    - Sends the password reset code to Firebase to reset the password.
    - Informs the user of success or failure.
    - Called from password reset form.
+ POST `/auth/resetpassword`
    - {idToken: String, password: String}
    - Sends the new password to Firebase to reset the password.
    - Informs the user of success or failure.
    - Called from settings form.
+ POST `/auth/deleteaccount`
    - {idToken: String}
    - Deletes the user's account from Firebase and the database.

## Authentication
We use Firebase Authentication. Currently just supports email/password authentication.

### Basics Ideas
+ A client is authenticated if he has a valid "FirebaseAuthIDToken".
+ When the client signs in, the credentials flow through the server to Firebase. Firebase returns a token which is passed through the server back to the client. The client stores this token in local storage.
+ The client sends the token to the server when necessary. The server uses the Firebase adminSDK to verify the token and return the relevant data. 

### User Flow
Sign Up:
+ User fills in his email and is logged in. 
+ User is sent an email to verify his email.
+ Clicking the link will verify the email and user is notified that he can set password in settings.
+ User sets password in settings.

Login Flow:
+ The client signs in with email and password.

Logout:
+ The client will just clear the local storage of the token and UID.

Reset Password:
+ User navigates to the forgot password page via the login page.
+ User enters his email and is sent an email to reset his password.
+ Clicking the link will take the user to a page to reset his password.
+ User enters his new password and is notified of success or failure.

### Relevant Documentation:
- https://firebase.google.com/docs/reference/rest/auth#section-sign-in-email-password
- https://firebase.google.com/docs/auth/admin/verify-id-tokens

# Database
We will use PostgreSQL for the database. The following is the schema, with primary key in bold.

Version: psql (PostgreSQL) 12.17 (Ubuntu 12.17-0ubuntu0.20.04.1)

## Database Setup
We can set up the database locally using Docker.
```
sudo dockerd
sudo docker pull postgres
sudo docker run --name mypostgres -e POSTGRES_PASSWORD=hellohello -d -p 5432:5432 postgres
```

### Creating Our Database
We can create our database layout using the following commands:
```
psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE crowdfundingsitedb"
psql -h localhost -p 5432 -U postgres -d crowdfundingsitedb -f sqlscripts/createDatabase.sql
```

### Quick Docker Commands
- `sudo docker ps` lists the running containers
- `sudo docker stop [container_id]` stops the container
- `sudo docker start [container_id]` starts the container
- `sudo docker remove [container_id]` removes the container
- `sudo docker exec -it [container_id] /bin/bash` enters the container

### Connecting to the Database
- Within the docker container running the database server we can use the following commands:
    - `psql -U postgres` enters the psql shell
    - `psql -U postgres -d [database_name]` enters the psql shell for a specific database
- Outside the docker container (from the host machine) we can use the following commands:
    - `psql -h localhost -U postgres` enters the psql shell
    - `psql -h localhost -U postgres -d [database_name]` enters the psql shell for a specific database
    - Note that we will need to type the password to enter the shell.

### Quick PostgreSQL Commands
- `\l` lists the databases
- `\c [database_name]` connects to a database
- `\dt` lists the tables
- `\d [table_name]` describes the table
- `\q` quits the shell
- `DROP DATABASE [database_name];` deletes the database
- `DROP TABLE [table_name];` deletes the table
- `SELECT * FROM [table_name];` lists the rows in the table


## Database Schema
### User Table
Stores personal user data
- **UID** : String, Firebase Auth UID
- Default_School: String, Name of school they would like to be the default

### Roles Table
Stores the roles of administrators and teachers for each school. Administrators can promote and demote teachers/other administrators for a school. Teachers (and administrators) can propose, approve, modify, open/close and delete projects for their school.

- **UID** : String, Firebase Auth UID
- **School** : String, Name of school
- Roles : Enum("admin", "teacher")

### Projects Table
Stores the projects that are to be funded
- **ProjectID** : Serial, Unique identifier for the project, randomly generated
- School: String, Name of school
- Title: String, Title of the project
- Description: String, Description of the project
- Goal: Integer, Amount of money to be raised
- Current: Integer, Amount of money raised so far
- MinDonation: Integer, Minimum amount of money that can be donated at once
- Status: Enum("proposed", "open", "closed")
- Proposer: String, Firebase Auth UID of the proposer

### Donations Table
Stores the list of donations made to projects
- **DonationID** : Serial, Unique identifier for the donation, randomly generated
- ProjectID: Integer, Unique identifier for the project
- UID: String, Firebase Auth UID
- Amount: Integer, Amount of money donated
- Date: Date, Date of donation


## Database References
- https://stackoverflow.com/questions/37694987/connecting-to-postgresql-in-a-docker-container-from-outside