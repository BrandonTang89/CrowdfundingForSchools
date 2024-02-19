# NumberFitCrowdFunding
A Crowd Funding Project for Number Fit

# TO-DO
- Button with timer to re-send email for email verification
- Much better dealing with user error:
    - Email already exists when signing up
    - Email not found when resetting password

# Set-Up
## Running the express app
Install dependencies:
`$ npm install`

Run the app:
`$ DEBUG=numberfitcrowdfunding:* npm start`
     
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
    - Contains a form for passsword reset.

### /auth
+ POST `/auth/signup` 
    - Creates a new user with email and randomly generated password. The user is then sent an email to verify their email and set their password.
+ GET `/auth/verify?firebtoken=[token]`
    - Sends a request to Firebase to verify the firebase ID token. 
    - We get the email from the token and then send an email to the user to verify their email. 
    - The email contains a link to `/auth/action?mode=verifyEmail&oobCode=[code]` which will verify the email.
+ GET `/auth/action?mode=verifyEmail&oobCode=[code]` 
    - Sends the email verification code to Firebase to verify the email. User is notified of success or failure.
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
    - Sends the password reset code to Firebase to reset the password.
    - Informs the user of success or failure.
    - Called from password reset form.
+ POST `/auth/resetpassword`
    - Sends the new password to Firebase to reset the password.
    - Informs the user of success or failure.
    - Called from settings form.

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
