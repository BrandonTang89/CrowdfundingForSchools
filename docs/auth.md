# Authentication
We use Firebase Authentication. Currently just supports email/password authentication.

## Basics Ideas
+ A client is authenticated if he has a valid "FirebaseAuthIDToken".
+ When the client signs in, the credentials flow through the server to Firebase. Firebase returns a token which is passed through the server back to the client. The client stores this token in local storage.
+ The client sends the token to the server when necessary. The server uses the Firebase adminSDK to verify the token and return the relevant data. 

## User Flow
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

## Authentication Functions
Due to frequent use of verification, we have stored the functions for verification of certain user properties such as whether the user is logged in, whether the user is a contributor of a project, etc. within the `authFunctions.js` file.

## Relevant Documentation:
- https://firebase.google.com/docs/reference/rest/auth#section-sign-in-email-password
- https://firebase.google.com/docs/auth/admin/verify-id-tokens