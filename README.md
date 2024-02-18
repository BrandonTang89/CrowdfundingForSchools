# NumberFitCrowdFunding
A Crowd Funding Project for Number Fit

# TO-DO
- Updating account settings in some way
    - Specifically including password reset
- Email verification for account creation
- Forget password

## Running the express app
Install dependencies:
`$ npm install`

Run the app:
`$ DEBUG=numberfitcrowdfunding:* npm start`
     
## Running Environment
I personally used Node v20.11.1 on Ubuntu-20.04 running in WSL2.

# Routes
### /
Index home page.

### /about
About page.

### /login
Login page.

User will be directed to `/` after successful login.

Should include the "forgot password" link.

### /signup
Signup page.

### /settings/:firebaseauthIDToken
This route allows for user to change their account settings. The firebase authentication token is sent to the server, verified, then the user's data is presented to the client to modify.

Somewhat annoyingly, we will have to modify a combination of firebase auth data as well as general data that we will store elsewhere (like default school/class).



## Environment Secrets

### Google Service Account for Firebase
The service.json file is a private key that allows you to access the firebase project with a google service account to allow privilleged actions like modifying the database and authentication users.

Get the service account key from the shared google drive. Will need to figure out how to store secrets of this kind.

Modify the line in app.js that sets where to find the service account key.

`var serviceAccount = require("/home/brandon/HT24/NumberFitCrowdFunding/env/service.json");`

(So if you are trying to use this, you need to make a /env in the project root and then put the service.json file there).

### Firebase Web API Key
Should be stored in the .env file as `FIREBASE_API_KEY`.

## Authentication
We use Firebase Authentication. Currently just supports email/password authentication.

Login Flow:
+ The client will send a REST API Post request from the login form to Firebase.
+ Firebase returns a token. This token is stored in the browser local storage as `firebtoken`. We also store the UID in local storage as `uid`.
+ The token is used to authenticate with the server when necessary. The client sends the token which can be verified within the server. For example, this is done when accessing the settings.
+ The server uses the Firebase adminSDK to verify the token and return the relevant data.

Logout:
+ The client will just clear the local storage of the token and UID.

Relevant Documentation:
- https://firebase.google.com/docs/reference/rest/auth#section-sign-in-email-password
- https://firebase.google.com/docs/auth/admin/verify-id-tokens
