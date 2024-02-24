var express = require('express');
const { getAuth } = require('firebase-admin/auth');
const axios = require('axios');
var router = express.Router();

function generateRandomPassword(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    password += characters.charAt(randomIndex);
  }
  return password;
}

router.post('/signup', function(req, res) {
  const authEndPoint = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${process.env.API_KEY}`
  const requestData = {
    email: req.body.email
  };


  const randomPassword = generateRandomPassword(8); // Change the length as per your requirement
  console.log(randomPassword);
  requestData.password = "xxxxxxx"; // dummy password

  console.log(requestData);
  axios.post(authEndPoint, requestData)
    .then(response => {
      // Handle the response
      console.log(response.data);
      res.send(response.data);
    })
    .catch(error => {
      // Handle the error
      console.log(error);
      res.send(error);
    });
    
});

router.get('/verify', async function(req, res) {
  try{
    var decodedToken = await getAuth().verifyIdToken(req.query.firebtoken);
    var uid = decodedToken.uid;

    try{
      var userRecord = await getAuth().getUser(uid)
      if (userRecord.emailVerified == true){
        return res.redirect('/');
      }
      var email = userRecord.email;
      var displayName = userRecord.displayName;

      const emailVerifEndPoint = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${process.env.API_KEY}`;
      const requestData = {
        requestType: "VERIFY_EMAIL",
        idToken: req.query.firebtoken
      };

      axios.post(emailVerifEndPoint, requestData)
        .then(response => {
          // Handle the response
          console.log(response.data);
        })
        .catch(error => {
          // Handle the error
          console.log(error);
          res.send(error);
          return;
        });
      
      res.render('verifyEmail', { uid: decodedToken.uid, email: email, displayName: displayName});
    }
    catch(error){
      console.log('Error fetching user data:', error);
      res.send('Error fetching user data:', error);
    };
  }
  catch (e){
    console.log(e)
    res.send('Something went wrong with verifying your token.');
  }
});

router.get('/forgot', function(req, res) {
  res.render('forgotPassword');
});

router.get('/action', async function(req, res) {
  // console.log("ACTION MODE: " + req.query.mode)
  if (req.query.mode == 'verifyEmail'){
    const emailVerifEndPoint = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${process.env.API_KEY}`;
    const requestData = {
      oobCode: req.query.oobCode,
    };
    axios.post(emailVerifEndPoint, requestData)
    .then(response => {
      // Handle the response
      console.log(response.data);
      // res.send(response.data);
      res.send("Email verified, use the forgot password link to set your password.");
    })
    .catch(error => {
      // Handle the error
      console.log(error);
      res.send(error);
    });
  }
  else if (req.query.mode == 'sendResetPassword'){
    const resetEndPoint = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${process.env.API_KEY}`;
    const requestData = {
      requestType: "PASSWORD_RESET",
      email: req.query.email
    };
    axios.post(resetEndPoint, requestData)
    .then(response => {
      // Handle the response
      console.log(response.data);
      res.send("Password reset email sent.");
      // res.send(response.data);
    })
    .catch(error => {
      // Handle the error
      console.log(error);
      res.send(error);
    });
  }
  else if (req.query.mode == 'resetPassword'){
    res.render('resetPassword', { oobCode: req.query.oobCode });
  }
  else{
    res.send('Invalid action');
  }
});

router.post('/resetpassword', function(req, res) {
  const resetEndPoint = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${process.env.API_KEY}`;
  const requestData = {
    idToken: req.body.idToken,
    password: req.body.password,
    returnSecureToken: true
  };
  console.log(requestData);
  axios.post(resetEndPoint, requestData)
    .then(response => {
      // Handle the response
      console.log(response.data);
      res.send(response.data);
    })
    .catch(error => {
      // Handle the error
      console.log(error);
      res.send(error);
    });
});
router.post('/resetpasswordwithcode', function(req, res) {
  const resetEndPoint = `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${process.env.API_KEY}`;
  const requestData = {
    oobCode: req.body.oobCode,
    newPassword: req.body.newPassword
  };
  console.log(requestData);
  axios.post(resetEndPoint, requestData)
    .then(response => {
      // Handle the response
      console.log(response.data);
      res.send(response.data);
    })
    .catch(error => {
      // Handle the error
      console.log(error);
      res.send(error);
    });
});
  
router.post('/deleteaccount', function(req, res) {
  const authEndPoint = `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${process.env.API_KEY}`;
  const requestData = req.body;

  axios.post(authEndPoint, requestData)
    .then(response => {
      // Handle the response
      console.log(response.data);
      res.send(response.data);
    })
    .catch(error => {
      // Handle the error
      console.log(error);
      res.status(401);
      res.send(error);
    });
});

module.exports = router;
