var express = require('express');
const { getAuth } = require('firebase-admin/auth');
const axios = require('axios');
const pool = require('../db.js');
var router = express.Router();

router.get('/', function (req, res) {
  res.redirect("/about");
});

router.get('/index', function (req, res) {
  res.redirect("/about");
});

router.get('/about', function (req, res) {
  res.render('about');
});

router.get('/login', function (req, res) {
  if (res.locals.user === undefined) {
    res.render('login');
  } else {
    res.redirect('/')
  }
});

router.post('/login', async function (req, res, next) {
  try {
    
    const authEndPoint = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.API_KEY}`;
    const requestData = {
      returnSecureToken: true,
      ...req.body
    };

    let response = await axios.post(authEndPoint, requestData);

    res.cookie('firebtoken', response.data.idToken, { maxAge: 3600000 });
    res.redirect('/');

  } catch(e) {
    console.log(e);
    next(e)
  }
});

router.get('/logout', async function (req, res, next) {
  res.clearCookie('firebtoken');
  res.redirect('/');
});

router.get('/signup', function (req, res) {
  res.render('signup');
});

router.get('/settings', async function (req, res, next) {
  try {
    //login required.
    if (res.locals.user === undefined) {
      res.redirect('/login')
      return;
    }
  
    const user = res.locals.user;
    console.log('User data:', user);
    res.render('settings');

  } catch(e) {
    next(e);
  }
});

router.get('/createSchool', function (req, res, next) {
  if (res.locals.user === undefined) {
    res.redirect('/login');
    return;
  }

  res.render('createSchool');
});

router.get('/mySchools', function (req, res) {
  if (res.locals.user === undefined) {
    res.redirect('/login');
    return;
  }
  res.render('mySchools');
})

router.get('/manageSchool', function (req, res) {
  if (res.locals.user === undefined) {
    res.redirect('/login');
    return;
  }
  res.render('manageSchool');
})

module.exports = router;
