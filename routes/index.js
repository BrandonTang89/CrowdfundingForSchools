var express = require('express');
const { getAuth } = require('firebase-admin/auth');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/about', function(req, res, next) {
  res.render('about');
});

router.get('/login', function(req, res, next) {
  res.render('login');
});

router.get('/signup', function(req, res, next) {
  res.render('signup');
});

router.get('/settings/:firebtoken', async function(req, res, next) {
  try{
    var decodedToken = await getAuth().verifyIdToken(req.params.firebtoken);
    var uid = decodedToken.uid;

    try{
      var userRecord = await getAuth().getUser(uid)
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
