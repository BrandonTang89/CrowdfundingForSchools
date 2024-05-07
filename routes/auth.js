var express = require('express');
const { getAuth } = require('firebase-admin/auth');
const { verifyUser } = require('../authFunctions.js');
const axios = require('axios');
const pool = require('../db.js');
var router = express.Router();

router.get('/verify', async function(req, res, next) {
  try{
    var decodedToken = await getAuth().verifyIdToken(req.cookies.firebtoken);
    var uid = decodedToken.uid;

    var userRecord = await getAuth().getUser(uid)
    if (userRecord.emailVerified == true){
      return res.redirect('/');
    }
    var email = userRecord.email;
    var displayName = userRecord.displayName;

    const emailVerifEndPoint = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${process.env.API_KEY}`;
    const requestData = {
      requestType: "VERIFY_EMAIL",
      idToken: req.cookies.firebtoken
    };

    const response = await axios.post(emailVerifEndPoint, requestData);
    console.log(response.data);
    
    res.render('verifyEmail', { uid: decodedToken.uid, email: email, displayName: displayName});
  }
  catch (e){
    next(e)
  }
});

router.get('/forgot', function(req, res) {
  res.render('forgotPassword');
});

router.get('/action', async function(req, res, next) {
  try {

    if (req.query.mode == 'verifyEmail'){
      const emailVerifEndPoint = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${process.env.API_KEY}`;
      const requestData = {
        oobCode: req.query.oobCode,
      };

      const response = await axios.post(emailVerifEndPoint, requestData);
      console.log(response.data);

      await pool.query('INSERT INTO users (userid, email) VALUES ($1, $2)', [response.data.localId, response.data.email]);
      console.log("Finished inserting user into database");

      res.send("Email verified, set your password in the settings page.");
    }
    else if (req.query.mode == 'sendResetPassword'){
      const resetEndPoint = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${process.env.API_KEY}`;
      const requestData = {
        requestType: "PASSWORD_RESET",
        email: req.query.email
      };
      const response = await axios.post(resetEndPoint, requestData);
      res.send("Password reset email sent.");
    }
    else if (req.query.mode == 'resetPassword'){
      res.render('resetPassword', { oobCode: req.query.oobCode });
    }
    else{
      res.send('Invalid action');
    }

  } catch (e) {
    next(e);
  }
});

router.post('/resetpassword', async function(req, res, next) {
  try {
    const resetEndPoint = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${process.env.API_KEY}`;
    const requestData = {
      idToken: req.cookies.firebtoken,
      password: req.body.password,
      returnSecureToken: true
    };

    const response = await axios.post(resetEndPoint, requestData);

    res.clearCookie("firebtoken");

    // Handle the response
    console.log(response.data);
    res.send(response.data);
  
  } catch(e) {
    next(e)
  } 
});


router.post('/resetpasswordwithcode', async function(req, res, next) {
  try {

    const resetEndPoint = `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${process.env.API_KEY}`;
    const requestData = {
      oobCode: req.body.oobCode,
      newPassword: req.body.newPassword
    };
    console.log(requestData);
    const response = await axios.post(resetEndPoint, requestData);
    console.log(response.data);
    res.send(response.data);

  } catch(e) {
    next(e)
  }
});
  
router.post('/deleteaccount', async function(req, res, next) {
  try {
    const user = res.locals.user;

    //login required
    if (user === undefined) {
      res.status(400).send("You are not logged in.");
      return;
    }

    const roles = await pool.query("SELECT * FROM roles WHERE userid = $1", [user.userid]);
    if (roles.rowCount > 0) {
      res.status(400).send("You cannot delete your account because you still have admin privileges.");
      return;
    }
    
    // Remove the user from the database
    const results = await pool.query('DELETE FROM users WHERE userid = $1', [user.userid]);
    console.log(results.rows);
    
    // Remove the user from Firebase
    const authEndPoint = `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${process.env.API_KEY}`;
    const response = await axios.post(authEndPoint, { idToken: requestData.idToken });
    console.log(response.data);

    res.clearCookie("firebtoken");
    res.send(response.data);
    
  } catch(e) {
    next(e)
  }
});

module.exports = router;
