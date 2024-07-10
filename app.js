//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption"); <-- LEVEL - 2
// const md5 = require("md5"); <-- LEVEL - 3
// const bcrypt = require("bcrypt"); \
// const saltRounds = 10;            /   <-- LEVEL - 4
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();
const port = 3000;
app.use(express.static("public"));
app.use(bodyParser.urlencoded( {extended: true} ));
app.set("view engine", "ejs");

app.use(session({
    secret: "Our Little Secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/usersDB", { useNewUrlParser: true });

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String
});

// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const userModel = mongoose.model("User", userSchema);

passport.use(userModel.createStrategy());

// passport.serializeUser(userModel.serializeUser());
// passport.deserializeUser(userModel.deserializeUser());
passport.serializeUser(function(user, cb) {
process.nextTick(function() {
    return cb(null, {
    id: user.id,
    username: user.username,
    picture: user.picture
    });
});
});

passport.deserializeUser(function(user, cb) {
process.nextTick(function() {
    return cb(null, user);
});
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", (req,res) => {
    res.render("home.ejs");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/secrets", 
    passport.authenticate("google", { failureRedirect: "/login" }),
    function(req, res) {
        // Successful authentication, redirect secrets.
        res.redirect("/secrets");
});

app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.get("/secrets", (req, res) => {
    if(req.isAuthenticated()) {
        res.render("secrets.ejs");
    } else {
        res.redirect("/login")
    }
});

app.get("/logout", (req, res) => {
    req.logout(function(err) {
        if(err) {
            console.log(err);
        } else {
            res.redirect("/");
        }
    });
});

app.get("/register", (req, res) => {
    res.render("register.ejs");
});

// app.post("/register", (req, res) => {
//     bcrypt.hash(req.body["password"], saltRounds, function(err, hash) {
//         const theUser = new userModel({
//             email: req.body["username"],
//             password: hash
//         });
//         theUser.save();
//         res.render("secrets.ejs");
//     });
//     // const theUser = new userModel({
//     //     email: req.body["username"],
//     //     password: md5(req.body["password"])
//     // });
//     // theUser.save();
//     // res.render("secrets.ejs");
// });
//                      /\
//                      ||
// Includes for upto level 4
//                      ||
//                      \/


// app.post("/login", (req, res) => {
//     const enteredEmail = req.body["username"];
//     // const enteredPassword = md5(req.body["password"]);
//     const enteredPassword = req.body.password;
//     userModel.findOne({email: enteredEmail}).then((data) => {
//         bcrypt.compare(enteredPassword, data.password, function(err, result) {});
//         if(result = true) {
//             res.render("secrets.ejs");
//         }
//     });
//     // userModel.findOne({email: enteredEmail}).then((data) => {
//     //     if(data.password === enteredPassword) {
//     //         res.render("secrets.ejs");
//     //     }
//     // });
// });


app.post("/register", (req, res) => {
    userModel.register({username: req.body["username"]}, req.body["password"], function(err, user) {
        if(err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local") (req, res, function(){
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/login", (req, res) => {
    const newUser = new userModel(
        {
            username: req.body["username"],
            password: req.body["password"]
        }
    );
    req.login(newUser, function(err) {
        if(err) {
            console.log(err);
        } else {
            passport.authenticate("local") (req, res, function(){
                res.redirect("/secrets");
            });
        }
    });
});

app.listen(port, () => {
    console.log(`Listening to the port ${port}.`);
});