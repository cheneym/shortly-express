var db = require('../config');
// var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var bcrypt = Promise.promisifyAll(require('bcrypt-nodejs'));

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  initialize: function() {
    this.on('creating', function(model, attrs, options) {
      return bcrypt.genSaltAsync(10)
        .then(function(salt) {
          model.set('salt', salt);
          return bcrypt.hashAsync(model.get('password'), salt, null);
        }).then(function(password) {
          return model.set('password', password);
        });
    });
  }
});

module.exports = User;