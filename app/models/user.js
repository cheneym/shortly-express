var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var bcryptAsync = Promise.promisifyAll(bcrypt);


var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  initialize: function() {
    this.on('creating', function(model, attrs, options) {
      var salt = bcrypt.genSaltSync();
      var encryptpw = bcrypt.hashSync(model.get('password'), salt);
      model.set('password', encryptpw);
      model.set('salt', salt);
    });
  }
});


// var User = db.Model.extend({
//   tableName: 'users',
//   hasTimestamps: true,
//   initialize: function() {
//     this.on('creating', function(model, attrs, options) {
//       return bcryptAsync.genSaltAsync()
//       .then(function(salt) {
//         model.set('salt', salt);
//         return bcryptAsync.hashAsync(model.get('password'), salt);
//       }).then(function(password) {
//         return model.set('password', password);
//       });
//     });
//   }
// });




module.exports = User;


//to verify password for login take the salt associated with the username,
//and apply it to the plaintext password
  //pass through the same hashing function as the original except pass in salt instead,
  //of a auto generated salt
  //if that password is the same as our stored hash then
    //let the user login, redirect to index
  //else
    //give them a error




//when creating password, create salt, append, hash
//when verifying password, 