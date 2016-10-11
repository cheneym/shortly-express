var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(session({
  secret: 'password',
  resave: false,
  saveUninitialized: true
}));


var restrict = function(req, res, next) {
  // console.log('request session', req.session);

  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login');
  } 
};

app.get('/', restrict,
function(req, res) {
  res.render('index');
});

app.get('/create', restrict,
function(req, res) {
  res.render('index');
});

app.get('/links', restrict,
function(req, res) {
  var username = req.session.user;
  new User({ username: username }).fetch()
    .then(function(found) {
      Links.reset().fetch().then(function(links) {
        var models = links.models.filter(function(model) {
          return model.attributes.user_id === found.attributes.id;
        });
        res.status(200).send(models);
        // links({'user_id': found.attributes.id}).fetch()
        // .then(function(found) {
        //   console.log(found);
        //   res.status(200).send(found);
        // });
      });
      // new Link({'user_id': found.attributes.id}).fetch()
      //   .then(function(found) {
      //     console.log(found);
      //     res.status(200).send(found);
      //   });
    });
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/signup', function(req, res) {
  res.render('signup');
});

app.get('/logout', function(req, res) {
  req.session.destroy(function() {
    res.redirect('/login');
  });
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
        req.session.user = newUser.attributes.username;
        res.redirect('/');
      });
    }
  });
});

app.post('/login', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  new User({username: username}).fetch()
    .then(function(found) {
      if (found) {
        var salt = found.attributes.salt;
        var encryptpw = found.attributes.password;
        if (bcrypt.hashSync(password, salt) === encryptpw) {
          req.session.user = found.attributes.username;
          res.redirect('/');          
        } else {
          console.log('invalid username or password');
          res.redirect('/login');
        }
      } else {
        console.log('invalid username or password');
        res.redirect('/login');
      }
    });
});


app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }
        var username = req.session.user;
        new User({ username: username }).fetch()
          .then(function(found) {
            Links.create({
              url: uri,
              title: title,
              baseUrl: req.headers.origin,
              'user_id': found.attributes.id
            })
            .then(function(newLink) {
              res.status(200).send(newLink);
            });
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
