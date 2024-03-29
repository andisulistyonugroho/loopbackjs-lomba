'use strict';
var path = require('path');
const loopback = require('loopback');
const app = require('../../server/server');
const ds = loopback.createDataSource('memory');
const mg = require('../../server/mailgun');
const uniqid = require('uniqid');
const mysql = app.dataSources.mysql;

var senderAddress = 'praja2019@multiintisarana.com';

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
              link
            };

            const renderer = loopback.template(path.resolve(__dirname, '../../server/views/verify.ejs'));
            const htmlBody = renderer(renderData);

            const emailData = {
              from: senderAddress,
              to: user.email,
              subject: 'Verifikasi Akun Lomba PRAJA 2019',
              html: htmlBody
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

  Users.on('resetPasswordRequest', function (info) {
    if (process.env.NODE_ENV === 'local') { // enable this only in production
      console.log('SEND EMAIL RESET PASSWORD TOKEN: ', info.email)
    } else {
      const text = `
        Seseorang meminta password anda di reset melalui form lupa password,\r\n
        acuhkan email ini jika anda merasa tidak melakukan permintaan tersebut.\r\n
        Kode verifikasi reset password:\n\n\t
      `;
      const link = info.accessToken.id;

      const renderData = {
        title: 'Reset Password Verification',
        text,
        link
      };

      const renderer = loopback.template(path.resolve(__dirname, '../../server/views/verify.ejs'));
      const htmlBody = renderer(renderData);

      const emailData = {
        from: senderAddress,
        to: info.email,
        subject: 'Lupa Password Akun Lomba PRAJA 2019',
        html: htmlBody
      };

      mg.messages().send(emailData, function(error, body) {
        if (error) {
          console.log(err);
        }

        console.log('reset password email sent to ', info.email)
      })
    }

  })

  // After change user's password via a password-reset token.
  Users.afterRemote('setPassword', function(context, user, next) {
    const userId = context.args.options.accessToken.userId
    const ATModel = app.models.AccessToken
    ATModel.destroyAll({userId: userId}, (err, info) => {
      if (err) next(err)

      next()
    })
  })

  /**
   * Fungsi ini digunakan untuk registrasi juri
  */
  Users.registerJury = async function ({ fullName, ...userPayload }) {
    try {
      let result = {};
      await mysql.transaction(async models => {
        const {
          Users: UserModel,
          UserProfiles: UPModel,
          RoleMappings: RMModel
        } = models;
        const roleID = 3;

        /** 
         * Create data user terelebih dahulu 
         * Set emailVerified = true
        */
        userPayload = { ...userPayload, realm: 'jury', emailVerified: true };
        const insertedUser = await UserModel.create(userPayload);

        /** 
         * Create data user profile
         * Data yang di insert hanya fullName nya saja
        */
        const userProfilePayload = {
          userId: insertedUser.id,
          title: fullName
        }
        const insertedProfile = await UPModel.create(userProfilePayload);

        /**
         * Setup RoleMapping
        */
        const roleMapPayload = {
          principalType: 'USER',
          principalId: insertedUser.id,
          roleId: roleID
        }
        await RMModel.create(roleMapPayload);

        result = {
          ...insertedUser.toJSON(),
          userProfile: insertedProfile
        }
      });
      return result;
    } catch (error) {
      throw error;
    }
  }
  Users.remoteMethod('registerJury', {
    accepts: {
      arg: 'data',
      type: 'registerJuryPayload', // Cek di project dir : ./server/models/register-jury-payload.json
      description: 'rolename nya adalah "jury"',
      http: {source: 'body'},
    },
    returns: {arg: 'result', type: 'object', root: true},
    description: 'API ini untuk registasi jury',
  });

  Users.directRegisterContestant = async function (payload) {
    let newUserId;
    await mysql.transaction(async (models) => {
      const {
        Users: UserModel,
        UserProfiles: UPModel,
        RoleMappings: RMModel,
        Roles: RoleModel,
        contestant: ContestantModel,
        contestantFile: CFModel
      } = models;

      const { user, profile, contestants } = payload;

      /**
       *  1) Create User Terlebih Dahulu 
       *  `realm` diset jadi `member`
       *  `isVerified` di set jadi `true`
       *  `verificationToken` diset jadi `null`
       *  `role` nya di set jadi `member`
      */
      const userPayload = { realm: 'member', emailVerified: true, verificationToken: null, ...user };
      const newUser = await UserModel.create(userPayload);
      newUserId = newUser.id;

      const role = await RoleModel.findOne({ name: 'member' });
      await RMModel.create({
        principalType: RMModel.USER,
        principalId: newUser.id,
        roleId: role.id
      });

      /**
       *  2) Create User Profile 
       *  Asumsi bahwa file sudah di upload sebelumnya di frontend, sebelum memanggil Fungsi ini
      */
      const profilePayload = { userId: newUser.id, ...profile };
      await UPModel.create(profilePayload);

      /**
       *  3) Create Contestant data & It's file
       *  set `isSubmitted` jadi `true`
       *  set `submittedAt` jadi tanggal sekarang
       *  set `isVerified` jadi `false`
      */
      for (let c of contestants) {
        const contestantPayload = {
          userId: newUser.id,
          competitionId: c.competitionId,
          isSubmitted: true,
          submittedAt: Date.now(),
          isVerified: false
        };
        const newContestant = await ContestantModel.create(contestantPayload);

        for (let f of c.files) {
          const filePayload = {
            contestantId: newContestant.id,
            name: f.linkName,
            location: f.linkURL,
            isExternalLink: true,
            isActive: true
          };
          await CFModel.create(filePayload);
        }
      }
    });

    const userRes = await Users.findById(newUserId);
    return userRes;
  }

  Users.remoteMethod('directRegisterContestant', {
    accepts: {
      arg: 'data',
      type: 'object',
      // description: 'rolename nya adalah "jury"',
      http: {source: 'body'},
    },
    returns: {arg: 'result', type: 'object', root: true},
    description: 'API ini untuk registrasi kontestan secara langsung oleh admin',
  });
};
