'use strict';

module.exports = function(app) {
  // verified
  app.get('/verified', function(req, res) {
    res.render('verified.ejs');
  });
}