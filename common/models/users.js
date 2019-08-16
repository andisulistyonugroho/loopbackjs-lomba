'use strict';
var path = require('path');
const loopback = require('loopback');
const app = require('../../server/server');
const ds = loopback.createDataSource('memory');
const mg = require('../../server/mailgun');
const uniqid = require('uniqid');

var senderAddress = 'lomba@sygmainnovation.com';

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
        const title = context.req.body.username;
        const userProfileData = {
          userId: user.id,
          title: title,
          idCardNumber: context.req.body.idCardNumber,
          provinceId: context.req.body.provinceId,
          cityId: context.req.body.cityId,
          districtId: context.req.body.districtId,
          address: context.req.body.address,
          mobile: context.req.body.mobile,
          WA: context.req.body.WA,
          profession: context.req.body.profession,
          company: context.req.body.company,
          gender: context.req.body.gender
        };
        UserProfiles.create(userProfileData, (err, userProfile) => {
          if (err) return next(err);
            // Send Email
          if (process.env.NODE_ENV === 'local') { // enable this only in production
            console.log('SEND EMAIL REGISTRATION TOKEN: ', user.verificationToken)
            return next()
          } else {
            const text = `
              Kode verifikasi pendaftaran:\n\n\t
            `;

            const redirectUrl = encodeURIComponent(`${app.get('baseUrl')}/verified`);
            const link = user.verificationToken;

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
              subject: 'Verifikasi Akun Lomba',
              html: htmlBody,
            };

            mg.messages().send(emailData, function(error, body) {
              if (error) {
                Users.deleteById(user.id)
                UserProfiles.deleteById(userProfile.id)
                return next(err);
              }
              const responseData = {
                success: true,
                data: user,
              }

              return context.res.json(responseData)
            })
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

  Users.remoteMethod('confirmRegis', {
    accepts: [
      { arg: 'email', type: 'string', required: true},
      { arg: 'vtk', type: 'string', required: true}
    ],
    returns: { arg: 'congrats', type: 'Boolean'}
  })

  Users.confirmRegis = function(theEmail, theVtk, cb) {
    Users.updateAll({
      email: theEmail,
      verificationToken: theVtk
    }, {
      emailVerified: 1,
      verificationToken: null
    }, (err, result) => {
      if (err) return cb(err, false)

      if (result.count > 0) {
        return cb(null, true)
      } else {
        return cb(null, false)
      }
    })
  }
};
