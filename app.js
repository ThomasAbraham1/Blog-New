//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const app = express();
const port = process.env.PORT || 3000;
const path = require('path');
const passport = require('passport');
const session = require('express-session');
const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const findOrCreate = require('mongoose-findorcreate');

const homeText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('trust proxy', 1);

app.use(express.static('./public'));



var secret = process.env.SECRET;
app.use(session({
  secret: secret,
  resave: false,
  saveUninitialized: true,
  cookie: {}
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://127.0.0.1:27017/blog", { useNewUrlParser: true });



const userSchema = new mongoose.Schema({

  username: String,
  email: String,
  provider: String,
  password: String,
  OAuthId: String,
  secretMsg: String,

});

// Plugins for mongodb

userSchema.plugin(passportLocalMongoose, {usernameField: "email"});
userSchema.plugin(findOrCreate);

const User = new mongoose.model('user', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});








const postSchema = {
  postTitle: String,
  postContent: String,
}

const blogUsersSchema = {
  name: String,
  blogs: [postSchema],
}

const Post = new mongoose.model('Post', postSchema);

const post = new Post({
  postTitle: "Final Stage",
  postContent: "Hello darkness my old friend",
});



app.get('/', function (req, res) {
  console.log(req.isAuthenticated());
  // Selecting all the records from the database
  Post.find({}).then(function (posts) {
    res.render('home', { homeText: homeText, posts: posts });
  });
});

app.post('/', function (req, res) {
  var postTitle = req.body.postTitle;
  var postContent = req.body.postContent;
  // Storing the post values into database variables
  const post = new Post({
    postTitle: postTitle,
    postContent: postContent,
  });
  // Saving into the database
  post.save().then(function () {
    res.redirect('/');
  });
});

app.get('/compose', function (req, res) {
  res.render('compose.ejs');
});


app.get("/posts/:post", function (req, res) {
  var postTitle = req.params.post;
  Post.findOne({ postTitle: postTitle }).then(function (post) {
    res.render('post.ejs', { postTitle: post.postTitle, postContent: post.postContent });
  });
});

// Login page catch

app.get('/login', function (req, res) {
  res.render('login', { loginResult: "" });
});

// Logout request catch 

app.get('/logout', (req, res) => {
  req.logout((err) => {
      if (err) { 
          return err;
      }
  });
  res.redirect('/');
});

// Login post req catch

app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
}));

app.get('/register', function (req, res) {
  res.render('register', { registerResult: "" });
});

app.post('/register', (req, res) => {
  User.register({ email: (req.body.email) }, (req.body.password), function (err, user) {
      if (err) {
          console.log(err);
          res.redirect('/register');
      } else {
        User.find({_id: req.user._id, username: {$eq: null}}).then( (foundUser) => {
          console.log(foundUser);
        } );
          passport.authenticate('local')(req, res, function () {
              res.redirect('/');
          });
      }
  });

});

app.listen(port, function (req, res) {
  console.log("Runnging your app on port " + port);
});