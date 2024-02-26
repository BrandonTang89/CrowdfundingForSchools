# NumberFitCrowdFunding
A Crowd Funding Project for Number Fit

### TO-DO (Easier)
#### General
- Do something about the home page and the about page

#### Auth
- Button with timer to re-send email for email verification
- Much better dealing with user error:
    - Email already exists when signing up
    - Email not found when resetting password
- Email verification route should be more informative and redirect the user back to the site.
- The firebase token has an expiry time. We should check for this and either log the user out or use the refresh token to get a new token. (important)
- Form sections on the settings page to set preferences like schools that the user wants to see.
    -  If we end up having multiple possible schools then we probably should have a different table for this for the database to be in 1st normal form.

#### Database
- Route for non-contributors to propose a project
    - This is non-trivial since we probably should not create the corresponding stripe products and prices until the project is approved.
- Much better filtering settings when viewing the list of projectss
    - By school, status, etc
- Better project listings, with sorting and stuff
- Documentation for parameters and return type of each route.
- Change the currentmoney field to be reflected in pence rather than pounds
- Data validation and additional fields for projects
    - E.g. class
- Error handling for many cases
    - E.g. When a project is created by a school that hasn't onboarded, we prevent the creation of the project

#### Administration
- Method for administrators to promote/demote teachers/administrators within the school settings page (important)
- Some way for numberfit/us to create the first administrator for a school

#### Payment
- Minimum donation amount
- Information about fees for both donors and schools
- Information for admin users on onboarding
- Method for user to see list of their donations

### TO-DO (Hard)
- Support for subscriptions rather than one-time donations
- Support for bank transfer donations that incur less fees

_I'm sure there are many more small things that I have forgotten about, do explore_

# Set-Up
## Running the application
Install dependencies:
`npm install`

Run the app:
- `DEBUG=numberfitcrowdfunding:* npm start`

Run the DB: 
- `sudo dockerd`
- `sudo docker start mypostgres`
- _Information on setting up the database can be found in the `docs/database.md` file._

Run the stripe listener:
- `stripe listen --forward-to localhost:3000/webhook`
- _Information on setting up the stripe listener can be found in the `docs/payment.md` file._


## Running Environment
Developed with on Node v20.11.1 on Ubuntu-20.04 running in WSL2.

## Environment Secrets
### Google Service Account for Firebase
The service.json file is a private key that allows you to access the firebase project with a google service account to allow privilleged actions like modifying the database and authentication users.

Get the service account key from the shared google drive.

Place within the project root in a folder called /env. This location is specified within the app.js file as

`var serviceAccount = require("./env/service.json");`


### Firebase Web API Key
Should be stored in the .env file as `FIREBASE_API_KEY`. 

This is used to access the Firebase REST API. Can be found by going to the firebase project settings and looking for the `apiKey` in the code snippet shown.

### Database Password
Stored in the .env file as `POSTGRES_PASSWORD`. Password depends on what you set when you created the database.

### Stripe Secret Key
Stored in the .env file as `STRIPE_KEY`. Allows us to make requests to stripe.

Find this in the stripe dashboard under Developers > API Keys. It should start with `sk_test_`.

### Stripe Webhook Secret
Stored in the .env file as `WEBHOOK_SECRET`. Allows the server to verify that post requests are coming from stripe.

This information will be revealed when setting up the stripe listener.

### Domain
Note necessarily a secret but an environment variable that is used to specify the domain of the server. Stored in the .env file as `DOMAIN`.

For testing, use
`DOMAIN=http://localhost:3000`

## Known Development Issues
### Firebase "Invalid Credential"
This can occur when your system's time gets out of sync, causing Firebase to reject the server connecting to it via the admin SDK. Fix this via: `sudo hwclock -s`

> Do explore the `docs` folder for more information on design decisions made for the project. 

# Code Style
### General Terminology
When we refer to a contributor, we mean either a teacher or an admin for a project. You might see this term throughout the code.

### Naming
Regarding keys passed in JSON objects, good naming is key:
- We avoid camelCase due to ambiguities such as `userID` or `userId` amongst other things.
- All fields of the database should be written fully in lowercase: `userid`, `projectid`, etc. This should be preserved across the entire backend and front-end as much as possible.

Regarding general code variables, camelCase is used.

### Return Types
For the sake of consistency, we ensure that POST requests **always** returns a JSON object. This is becaues the standard pattern is that the client will try to read the JSON of the response.

On the otherhand, GET requests should return either a String, either HTML or plaintext.

We definitely need better documentation on what the return types of each route can return.

Functions with `authFunctions.js` are utility functions that are used across the entire backend. For the sake of uniformity, they should always return a JSON object that at least contains a `msg` field. This should be "Success" or some error message.

### Error Handling
All functions within `authFunctions.js` should **never** throw errors. Any error that occurs within the function should be caught and returned as a JSON object with a `msg` field that contains the error message.

HTTP routes should use the status header to report the success of operations. If the action is not a success then it should also return a JSON object with a `msg` field that contains the error message.

# Testing vs Live
When we convert to live production, we will need to ensure some actions are taken:
- Use different environment variables
    - The stripe secret key should be changed to the live key.
    - Domain should be the actual domain
- The email verification link in the Firebase Auth template should be changed to the live domain.

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
    - Contains a link to schools available to manage (for admins).

### /admin
+ GET `/admin/?school=[school]&firebtoken=[token]`
    - Verifies the firebase token and checks if the user is an administrator for the school. 
    - Checks whether the school has record within the database. If not, it also means the school has no stripe account so we create it.
    - If the school has not yet finished onboarding then we direct the admin to the onboarding page.
    - Renders `admin.ejs` view with the school's details.

### /projects
+ GET `/projects`
    - Renders `projects.ejs` view.
+ POST `projects`
    - Takes as input a json object with filtering parameters and returns a list of projects that match the parameters.
+ GET `/projects/view/:projectID`
    - Renders `projectView.ejs` view with information about the project.
    - Provides a form to donate to the project. (todo)
+ POST `/projects/view/:projectID`
    - {firebtoken: String}
    - Determines if the user is a valid contributor to the project.
    - Returns {msg: String} with success or failure.
+ GET `/projects/propose?firebtoken=[token]`
    - Verifies the firebase token. If not valid then returns an error.
    - If the user is a teacher or administrator then redirects to `/projects/create?firebtoken=[token]` otherwise renders the `proposeproject.ejs` view. (todo)
+ GET `/projects/create?firebtoken=[token]`
    - Verifies the firebase token and checks if the user is an administrator or teacher for a school. If so renders the `createproject.ejs` view, otherwise returns an error.
    - List of schools that the user can create a project for is passed to the template, allowing for a select box to be created.
+ POST `/projects/create`
    - Receives a json object with the project details. Checks whether the proposer is an administrator or teacher for the school. If so, creates the project and returns the projectID, otherwise returns an error.
    - Returns {msg: String, projectid: String}
+ GET `/projects/edit/:projectID?firebtoken=[token]`
    - Checks if the user is a contributor for the project, is so then renders the `editproject.ejs` view, otherwise returns an error.
    - Renders the `editproject.ejs` view with the project details.
+ POST `/projects/edit`
    - {firebtoken: String, projectid: Integer, title: String, description: String, goal: Integer, status: String}  
    - Checks that the user has the authorisation to edit the project.
    - Edits the project with the given projectID.
    - Returns {msg: String}
+ POST `/projects/delete`
    - {firebtoken: String, projectid: Integer}
    - Deletes the project with the given projectID.
    - Returns {msg: String}
+ POST `/projects/donate/:projectid`
    - {userid: null/String}
    - Does checks to ensure that the project is ready to donate to.
    - Generates checkout session and returns the URL to the client.
+ GET `/projects/success?projectid=[projectid]`
    - Renders `donationSuccess.ejs` view.

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

### /webhook
+ POST `/webhook`
    - Receives stripe events and verifies the event using the stripe secret key.
    - If the event is a successful payment then the donation is recorded within the database.