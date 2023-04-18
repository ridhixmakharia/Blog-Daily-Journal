//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _=require("lodash");
const mongoose = require('mongoose');
const multer = require('multer');
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
 

const storage = multer.diskStorage({
  destination: (req, file, cb) =>{
    cb(null, 'public/images')
  },
  filename: (req, file, cb) =>{
    console.log(file)
    cb(null, file.originalname)
  }
})

const upload = multer({storage: storage})

const homeStartingContent = "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret: "Our little secret",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
mongoose.connect(process.env.MONGODB_CONNECT, {
  useNewUrlParser: true, 
  writeConcern: { w: "majority" },
  useUnifiedTopology: true
})
.then(() => {
  console.log("Mongo connection successful");
})
.catch((error) => {
  console.log("Mongo conneciton failed");
  console.log(error);
})



const userSchema = new mongoose.Schema( {
  username: String,
  password: String,
  googleId: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);
passport.use(User.createStrategy());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL,
  userProfileURL: process.env.USER_PROFILE
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ username: profile.displayName, googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

const postSchema = {
 title: String,
 content: String
};

const Post = new mongoose.model("Post", postSchema);


app.get("/", function(req, res) {
  try{
    Post.find().maxTimeMS(30000).then(posts =>{
      res.render("home", {
        startingContent: homeStartingContent,
        posts: posts
        });
    });
  }
  catch (err) {
    next(err);
  }
});

app.get("/auth/google", function(req,res){
  passport.authenticate("google", {scope: ['profile']})(req, res);
})

app.get('/auth/google/blog', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/compose');
  });

app.get("/register", function(req, res){
  res.render("register");
})

app.post("/register", function(req,res){

  User.register({username:req.body.username}, req.body.password, function(err, user){
    if (err)
    {
     console.log(err);
      res.redirect("/compose")
    }
    else{
      passport.authenticate("local")(req, res, function(){
      res.redirect("/compose");
    })
  }
})
})

app.get("/login", function(req, res){
  res.render("login");
})

app.post("/login", function(req,res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  })

  req.login(user, function(err){
    if (err)
    {
     console.log(err);
      res.redirect("/")
    }
    else{
      passport.authenticate("local")(req, res, function(){
      res.redirect("/compose");
    })
  }
  })
})


app.get("/compose", function(req,res){
  if(req.isAuthenticated())
  {
    res.render("compose");
  }
  else{
    res.redirect("/")
  }
  
});

app.post("/compose",upload.single('image'), function(req,res){
   const post = new Post ({
   title: req.body.postTitle,
   content: req.body.postBody
 });

 res.redirect('/');
 post.save().then(() => {
  console.log('Post added to DB.');
  res.redirect('/');
})

})



app.get("/posts/:postId", function(req, res){

  const requestedPostId = req.params.postId;
  
    Post.findOne({_id: requestedPostId}).then(post=> {
      res.render("post", {
        title: post.title,
        content: post.content
      });
    })
  });


app.get("/about", function(req,res){
  res.render("about", {aboutContent: aboutContent})
})

app.get("/contact", function(req,res){
  res.render("contact", {contactContent: contactContent})
})

  app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
  })


app.listen(3000, function() {
  console.log("Server started on port 3000");
});

