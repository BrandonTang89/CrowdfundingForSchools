# NumberFitCrowdFunding
A Crowd Funding Project for Number Fit

## Running the app
install dependencies:
  `$ npm install`

run the app:
  `$ DEBUG=numberfitcrowdfunding:* npm start`
     

## Environment Secrets
Get the service account key from... somewhere. Will need to figure out how to store secrets of this kind.
`export GOOGLE_APPLICATION_CREDENTIALS="/home/brandon/HT24/NumberFitCrowdFunding/env/service.json"`



## Authentication
Flow:
+ The client will send a REST API Post request from the login form to Firebase.
+ Firebase returns a token
+ The token is used to authenticate with the server when necessary. The client sends the token which can be verified within the server
+ The server uses the adminSDK to verify the token and return the relevant data.

