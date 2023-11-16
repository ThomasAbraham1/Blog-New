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
const MemoryStore = require('memorystore')(session);
const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const findOrCreate = require('mongoose-findorcreate');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;

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
  cookie: { },
    store: new MemoryStore({
      // checkPeriod: 86400000 // prune expired entries every 24h
    }),
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb+srv://chatgptthomas:FmU5yTOcDQt4cGnB@cluster0.vhhesfh.mongodb.net/blog", { useNewUrlParser: true });

const postSchema = { 
  postTitle: String,
  postContent: String,
}


const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  provider: String,
  password: String,
  OAuthId: String,
  secretMsg: String,
  posts: [postSchema],
});

// Plugins for mongodb

userSchema.plugin(passportLocalMongoose, { usernameField: "email" });
userSchema.plugin(findOrCreate);

const User = new mongoose.model('user', userSchema);

passport.use(User.createStrategy());

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "https://blog-fz3z.onrender.com/auth/google/blog",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
  function (accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ email: profile.emails[0].value }, { OAuthId: profile.id, username: profile.name.givenName }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "https://blog-fz3z.onrender.com/auth/facebook/blog",
  profileFields: ['id', 'displayName', 'email']
},
  function (accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ email: profile.emails[0].value }, { OAuthId: profile.id, username: profile.displayName }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

const Post = new mongoose.model('Post', postSchema);

const post = new Post({
  postTitle: "Final Stage",
  postContent: "Hello darkness my old friend",
});



app.get('/', function (req, res) {
  if (req.isAuthenticated()) {
    res.render('homepage');
  }
  
  // console.log(req.isAuthenticated());
  // // Selecting all the records from the database
  // if (req.isAuthenticated()) {
  //   User.find({ _id: req.user._id, username: { $eq: null } }, {
  //     new: true
  //   }).then((foundUser) => {
  //     if (foundUser.length == 1) {
  //       // console.log("hello");
  //       User.findOne({ _id: req.user._id }).then(function (user) {
  //         res.render('home', { homeText: homeText, posts: user.posts, isUserNameSet: "0" });
  //       });
  //     } else {
  //       // console.log(req.session);
  //       User.findOne({ _id: req.user._id }).then(function (user) {
  //         // console.log(user.posts);
  //         res.render('home', { homeText: homeText, posts: user.posts, isUserNameSet: "1", userName: req.user.username });
  //       });
  //     }
  //   });
  // } else {
  //   res.redirect('/register');
  // }
});

app.post('/', function (req, res) {
  var postTitle = req.body.postTitle;
  var postContent = req.body.postContent;
  // Storing the post values into database variables

  User.findOne({ _id: req.user._id }).then((user) => {
    user.posts.push({
      postTitle: postTitle,
      postContent: postContent,
    });
    // var userObject = user.toObject();
    // delete 
    user.save();
  });
  // Saving into the database
  post.save().then(function () {
    res.redirect('/');
  });
});

app.post('/userUpdation/:operation', (req, res) => {
  console.log(req.body);
  var operation = req.params.operation;
  if (operation == 'updateUserName') {
    User.findOneAndUpdate({ _id: req.user._id }, { username: req.body.userName }, { new: true }).then((resultRecord) => {
      console.log('Updated userName of the new user \n' + resultRecord);
      req.session.passport.user.username = req.body.userName;
      res.redirect('/');
    });
  } else if (operation == 'deletePost') {
    User.findOneAndUpdate({ _id: req.user._id }, { $pull: { posts: { _id: req.body.postId } } }).then(() => {
      res.redirect("/");
    });

  }
});

app.get('/compose', function (req, res) {
  res.render('compose.ejs');
});



app.get("/posts/:post", function (req, res) {
  var postId = req.params.post;
  User.findOne({ _id: req.user._id }, { posts: { $elemMatch: { _id: postId } } }).then(function (post) {
    console.log(post.posts);
    res.render('post.ejs', { postTitle: post.posts[0].postTitle, postContent: post.posts[0].postContent });
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
      passport.authenticate('local')(req, res, function () {
        res.redirect('/');
      });
    }
  });

});


app.get('/auth/google/blog',
  passport.authenticate('google', { failureRedirect: '/' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'openid', 'email'] }));

app.get('/auth/facebook/blog',
  passport.authenticate('facebook', { failureRedirect: '/' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });
app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ['email'] }));


// Editing the post

app.get('/edit/:post', (req, res) => {
  var postId = req.params.post;
  // console.log(postId);
  User.findOne({ _id: req.user._id}, { posts: { $elemMatch: { _id: postId } } }).then((foundPost) => {
    console.log(foundPost);
    var userIdAndPost = foundPost;
    res.render('edit', {userIdAndPost: userIdAndPost});
  });
});

app.post('/edit', (req,res)=>{
  var postId = req.body.postId;
  var postTitle = req.body.postTitle;
  var postContent = req.body.postContent;

  User.findOneAndUpdate({_id: req.user._id, "posts._id": postId}, {$set: {"posts.$.postTitle" : postTitle, "posts.$.postContent" : postContent }}, {new: true}).then( (postEdit) =>{
    // console.log(postEdit); 
  });
  res.redirect('/');

}); // Error persists, whenever an edit is made it replaces all the other existing posts! Pending Fix. Fixed finally!



app.listen(port, function (req, res) {
  console.log("Runnging your app on port " + port);
});
