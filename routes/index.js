var express = require('express');
const { getAuth } = require('firebase-admin/auth');
const axios = require('axios');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express' });
});

router.get('/about', function(req, res) {
  res.render('about');
});

router.get('/login', function(req, res) {
  res.render('login');
});

router.post('/login', function(req, res) {
  const authEndPoint = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.API_KEY}`;
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

router.get('/signup', function(req, res) {
  res.render('signup');
});



router.get('/settings/:firebtoken', async function(req, res) {
  try{
    var decodedToken = await getAuth().verifyIdToken(req.params.firebtoken);
    var uid = decodedToken.uid;

    try{
      var userRecord = await getAuth().getUser(uid)
      if (userRecord.emailVerified == false){
        return res.redirect('/auth/verify?firebtoken=' + req.params.firebtoken);
      }
      var email = userRecord.email;
      var displayName = userRecord.displayName;

      res.render('settings', { uid: decodedToken.uid, email: email, displayName: displayName});

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

module.exports = router;
