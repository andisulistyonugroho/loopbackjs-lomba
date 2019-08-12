'use strict';
var path = require('path');
const loopback = require('loopback');
const app = require('../../server/server');
const ds = loopback.createDataSource('memory');
const mg = require('../../server/mailgun');
const uniqid = require('uniqid');

var senderAddress = 'tugas@sygmainnovation.com';

module.exports = function(Users) {
  // Method untuk register superadmin atau admin
  Users.registerAdmin = ({realm, username, email, password, rolename}, cb) => {
    const Role = app.models.Role;
    const RoleMapping = app.models.RoleMapping;

    Role.findOne({where: {name: rolename}}, (err, role) => {
      if (err) return cb(err, null);
      if (!role) {
        return cb({msg: 'Role Not Found', statusCode: 404}, null);
      }
      if (role.name !== 'superadmin' && role.name !== 'admin') {
        return cb({msg: 'Forbidden', statusCode: 403}, null);
      }

      Users.create(
        {realm, username, email, emailVerified: true, password},
        (err, user) => {
          if (err) return cb(err, null);

          RoleMapping.create({
            principalType: RoleMapping.USER,
            principalId: user.id,
            roleId: role.id,
          }, (err, rolemap) => {
            if (err) return cb(err, null);

            return cb(null, {user, role});
          });
        });
    });
  };

  const registerAdmin = {
    realm: 'string',
    username: 'string',
    email: 'string',
    password: 'string',
    rolename: 'string',
  };

  ds.define('registerAdmin', registerAdmin, {idInjection: false});

  Users.remoteMethod('registerAdmin', {
    accepts: {
      arg: 'userData',
      type: 'registerAdmin',
      description: 'rolename nya antara "superadmin", "admin"',
      http: {source: 'body'},
    },
    returns: {arg: 'result', type: 'object'},
    description: 'API ini untuk registasi superadmin atau admin',
  });

  Users.beforeRemote('create', function(context, user, next) {
    context.req.body.verificationToken = uniqid();
    next();
  });

  Users.afterRemote('create', function(context, user, next) {

    // Map User to member role
    const Role = app.models.Role;
    const RoleMapping = app.models.RoleMapping;
    const UserProfiles = app.models.UserProfiles;

    Role.findOne({where: {name: 'member'}}, (err, role) => {
      if (err) return next(err, null);
      if (!role) {
        return next({msg: 'Role Not Found', statusCode: 404});
      }

      RoleMapping.create({
        principalType: RoleMapping.USER,
        principalId: user.id,
        roleId: role.id,
      }, (err, rolemap) => {
        if (err) return next(err);

        // Set User Profile
        const title = context.req.body.title;
        const ava = context.req.body.ava;
        const userProfileData = {
          userId: user.id,
          title: title,
          ava: ava,
        };
        UserProfiles.create(userProfileData, (err, userProfile) => {
          if (err) return next(err);
            // Send Email
          if (false) { // enable this only in production
            const text = `
              Pendaftaran anda berhasil,
              mohon verifikasikan email anda
              dengan cara klik link berikut ini
              atau salin dan tempelkan ke url bar di browser anda:\n\n\t
            `;

            const redirectUrl = encodeURIComponent(`${app.get('baseUrl')}/verified`);
            const link = `${app.get('baseUrl')}/api/users/confirm?uid=${user.id}&redirect=${redirectUrl}&token=${user.verificationToken}`;

            const renderData = {
              title: 'Pendaftaran Akun Berhasil!',
              text,
              link,
            };

            const renderer = loopback.template(path.resolve(__dirname, '../../server/views/verify.ejs'));
            const htmlBody = renderer(renderData);

            const emailData = {
              from: senderAddress,
              to: user.email,
              subject: 'Verifikasi Akun Syaamil Bundle Apps',
              html: htmlBody,
            };

            mg.messages().send(emailData, function(error, body) {
              if (error) {
                Users.deleteById(user.id);
                UserProfiles.deleteById(userProfile.id);
                return next(err);
              }
              const responseData = {
                success: true,
                data: user,
              };

              return context.res.json(responseData);
            });
          }
        });
      });
    });
  });

  Users.remoteMethod('tokenThere', {
    accepts: {arg: 'req', type: 'object', 'http': {source: 'req'}},
    returns: {arg: 'result', type: 'Boolean'},
    description: 'check the token existence'
  })

  Users.tokenThere = function(req, cb) {
    if (req.headers.authorization) {
      const authToken = req.headers.authorization
      const ATModel = app.models.AccessToken

      ATModel.count({id: authToken}, (err, count) => {
        if (err) return cb(err, null)

        if (count < 1) {
          cb(null, false)
        } else {
          cb(null, true)
        }
      })
    } else {
      cb(null, false)
    }
  }
};
