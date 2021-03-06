var path = require('path');
var knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, '../db/shortly.sqlite')
  },
  useNullAsDefault: true
});
var db = require('bookshelf')(knex);

db.knex.schema.hasTable('urls').then(function(exists) {
  if (!exists) {
    db.knex.schema.createTable('urls', function (link) {
      link.increments('id').primary();
      link.string('url', 255);
      link.string('baseUrl', 255);
      link.string('code', 100);
      link.string('title', 255);
      link.integer('visits');
      link.integer('user_id').references('users.id');
      link.timestamps();
    }).then(function (table) {
      console.log('Created Url Table', table);
    });
  }
});

db.knex.schema.hasTable('clicks').then(function(exists) {
  if (!exists) {
    db.knex.schema.createTable('clicks', function (click) {
      click.increments('id').primary();
      click.integer('linkId');
      click.timestamps();
    }).then(function (table) {
      console.log('Created Click Table', table);
    });
  }
});

/************************************************************/
// Add additional schema definitions below
/************************************************************/

db.knex.schema.hasTable('users').then(function(exists) {
  if (!exists) {
    db.knex.schema.createTable('users', function(user) {
      user.increments('id').primary();
      user.string('username', 255);
      user.string('password', 255);
      user.string('salt', 255);
      user.timestamps();
    }).then(function(table) {
      console.log('Created User Table', table);
    });
  }
});

// db.knex.schema.hasTable('users_urls').then(function(exists) {
//   if (!exists) {
//     db.knex.schema.createTable('users_urls', function(user) {
//       user.integer('user_id', 255).references('users.id');
//       user.integer('url_id', 255).references('urls.id');
//     }).then(function(table) {
//       console.log('Created User/Url Join Table', table);
//     });
//   }
// });

module.exports = db;