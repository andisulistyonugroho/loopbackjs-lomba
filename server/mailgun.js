'use strict';
const app = require('./server');
var mailgun = require('mailgun-js');

var apiKey = app.get('mailgunApiKey');
var domain = app.get('mailgunDomain');
var mg = mailgun({apiKey: apiKey, domain: domain});

module.exports = mg;
