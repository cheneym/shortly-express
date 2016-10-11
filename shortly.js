var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
var cookieParser = require('cookie-parser');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var passport = require('passport');
var session = require('express-session');
var GitHubStrategy = require('passport-github2').Strategy;
var LocalStrategy = require('passport-local').Strategy;
var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(cookieParser());
app.use(session({
  secret: 'password',
  resave: true,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

var validateUserPass = function(username, password, done) {
  return new User({username: username}).fetch()
    .then(function(found) {
      if (found) { 
        var salt = found.attributes.salt;
        var encryptpw = found.attributes.password;
        if (bcrypt.hashSync(password, salt) === encryptpw) {
          return done(null, found.attributes);
        } else {
          return done(null, false, { message: 'Incorrect username or password.' });
        }
      } else {
        return done(null, false, { message: 'Incorrect username or password.' });
      }
    });
};

passport.use(new LocalStrategy(validateUserPass));

var loggedIn = function(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

// passport.use(new GoogleStrategy({
//   consumerKey: GOOGLE_CONSUMER_KEY,
//   consumerSecret: GOOGLE_CONSUMER_SECRET,
//   callbackURL: "http://www.example.com/auth/google/callback"
// },
//   function(token, tokenSecret, profile, done) {
//     User.findOrCreate({ googleId: profile.id }, function (err, user) {
//       return done(err, user);
//     });
//   }
// ));

// app.get('/auth/google',
//   passport.authenticate('google', { scope: 'https://www.google.com/m8/feeds' });

// app.get('/auth/google/callback', 
//   passport.authenticate('google', { failureRedirect: '/login' }),
//   function(req, res) {
//     res.redirect('/');
//   });


// passport.use(new GitHubStrategy({
//   clientID: config.github.clientID,
//   clientSecret: config.github.clientSecret,
//   callbackURL: config.github.callbackURL
// }, function(accessToken, refreshToken, profile, done) {

//   var searchQuery = {
//     name: profile.displayName
//   };

//   var updates = {
//     name: profile.displayName,
//     someID: profile.id
//   };

//   var options = {
//     upsert: true
//   };

//   // update the user if s/he exists or add a new user
//   User.findOneAndUpdate(searchQuery, updates, options, function(err, user) {
//     if (err) {
//       return done(err);
//     } else {
//       return done(null, user);
//     }
//   });
// }

// ));


app.get('/', loggedIn,
function(req, res) {
  res.render('index');
});


app.get('/create', loggedIn,
function(req, res) {
  res.render('index');
});


app.get('/links', loggedIn,
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.where({ 'user_id': req.user.id }));
  });
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/logout', function(req, res) {
  req.session.destroy(function() {
    res.redirect('/login');
  });
});

app.get('/signup', function(req, res) {
  res.render('signup');
});


app.post('/signup', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  //validate user
  if (util.isValidUsername(username)) {
    console.log('Invalid username format: ', username);
    return res.redirect('/signup');
  }
  //validate password
  if (util.isValidPassword(username)) {
    console.log('Invalid password format');
    return res.redirect('/signup');
  }

  //check if username exists in database
    //if exists, return username taken
    //otherwise make new user in db
  new User({username: username}).fetch().then(function(found) {
    if (found) {
      console.log('username taken');
      return res.sendStatus(404);
    } else {
      Users.create({
        username: username,
        password: password
      })
      .then(function(newUser) {
        req.logIn(newUser, function(err) {
          if (err) { return next(err); }
          return res.redirect('/');
        });
      });
    }
  });
});

app.post('/login', passport.authenticate('local', 
  { 
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true 
  }));

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri, 'user_id': req.user.id }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }
        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin,
          'user_id': req.user.id
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
