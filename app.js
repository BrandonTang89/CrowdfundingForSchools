var createError = require('http-errors');
const express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require('dotenv').config();

var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth');
var projectsRouter = require('./routes/projects');
var schoolsRouter = require('./routes/schools');
var adminRouter = require('./routes/admin');
var webhookRouter = require('./routes/webhook');

var app = express();
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Firebase Admin SDK
var serviceAccount = require("./env/service.json");
const { initializeApp } = require('firebase-admin/app');
var admin = require("firebase-admin");
const { verifyUser } = require('./authFunctions');
initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//Get session token & login info
app.use(async function (req, res, next) {
  try {
    const firebtoken = req.cookies.firebtoken;

    if (firebtoken !== undefined) {
      res.locals.user = await verifyUser(firebtoken);
    }
  
    next();
  } catch (e) {
    next(e)
  }
});

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/projects', projectsRouter);
app.use('/schools', schoolsRouter)
app.use('/admin', adminRouter);
app.use('/webhook', webhookRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  //If attempted to login unsuccessfully, then we logout.
  if (req.cookies.firebtoken !== undefined && res.locals.user === undefined) {
      res.clearCookie('firebtoken');
  }

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
